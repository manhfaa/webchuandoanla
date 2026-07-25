"""Plan entitlements resolved from the ServicePlan catalogue.

The SePay webhook decides what a user paid for and writes it to
``user.current_plan``; this module is the single place that turns that slug into
concrete limits. Keeping the resolution here means a cap is never re-typed in a
view (or in the frontend), so the catalogue that is sold on the pricing page and
the limits that are enforced cannot drift apart.

``0`` in the catalogue means "no cap" — that is how ``engagement`` seeds Bloom
and Elite — so it is normalised to ``None`` (``null`` over the API) instead of
being mistaken for "zero allowed".
"""

from django.db.models import F, Q
from django.utils import timezone
from rest_framework.exceptions import APIException

from engagement.models import ServicePlan, UserSubscription

PLAN_ORDER = ("seed", "grow", "bloom", "elite")
UNLIMITED = None

# The published comparison table sells a crop-plan cap that ServicePlan has no
# column for yet. metadata["crop_plans"] overrides this per plan, so adding the
# key to the catalogue is enough to change the cap without a code change.
DEFAULT_CROP_PLAN_LIMITS = {"seed": 0, "grow": 2, "bloom": 10, "elite": UNLIMITED}

PLAN_DISPLAY_NAMES = {"seed": "Seed", "grow": "Grow", "bloom": "Bloom", "elite": "Elite"}


class PlanLimitExceeded(APIException):
    """Raised when an action would exceed what the user's plan includes."""

    status_code = 402
    default_detail = "Bạn đã dùng hết hạn mức của gói hiện tại. Vui lòng nâng cấp để tiếp tục."
    default_code = "plan_limit_exceeded"

    def __init__(self, detail=None, code=None):
        super().__init__(detail, code)
        # DRF stringifies every value in a dict detail; the caps have to stay
        # numbers so a client can compare them instead of parsing them.
        if isinstance(detail, dict):
            self.detail = detail


def normalize_plan_slug(value):
    slug = str(value or "").strip().lower()
    return slug if slug in PLAN_ORDER else "seed"


def effective_plan_slug(user, now=None):
    """The plan the user is actually entitled to right now.

    ``plan_expires_at`` is only reset lazily (on profile load or by the
    expire_subscriptions command), so a lapsed row can still say "elite". Reading
    the expiry here keeps entitlements honest even before that cleanup runs.
    """
    slug = normalize_plan_slug(getattr(user, "current_plan", None))
    expires_at = getattr(user, "plan_expires_at", None)
    if slug != "seed" and expires_at and expires_at <= (now or timezone.now()):
        return "seed"
    return slug


def resolve_plan(user, now=None):
    """The ServicePlan row backing the user's current entitlements, or None."""
    slug = effective_plan_slug(user, now=now)
    plan = ServicePlan.objects.filter(slug=slug).first()
    if plan is None and slug != "seed":
        plan = ServicePlan.objects.filter(slug="seed").first()
    return plan


def _cap(value):
    """Catalogue caps use 0 for "unlimited"; anything unusable means unlimited."""
    try:
        number = int(value)
    except (TypeError, ValueError):
        return UNLIMITED
    return UNLIMITED if number <= 0 else number


def _crop_plan_cap(metadata, slug):
    """Unlike the other caps, 0 here really is zero: Seed sells no crop plans."""
    raw = metadata.get("crop_plans", DEFAULT_CROP_PLAN_LIMITS.get(slug, 0))
    if raw is None or raw == "":
        return UNLIMITED
    try:
        return max(0, int(raw))
    except (TypeError, ValueError):
        return DEFAULT_CROP_PLAN_LIMITS.get(slug, 0)


def resolve_entitlements(user, now=None):
    """Limits and feature flags for the user's active plan."""
    slug = effective_plan_slug(user, now=now)
    plan = resolve_plan(user, now=now)
    metadata = plan.metadata if plan and isinstance(plan.metadata, dict) else {}

    crop_plans = _crop_plan_cap(metadata, slug)
    return {
        "plan": slug,
        "plan_name": plan.name if plan else PLAN_DISPLAY_NAMES.get(slug, slug.title()),
        "price_monthly": int(plan.price_monthly) if plan else 0,
        "currency": plan.currency if plan else "VND",
        "limits": {
            "daily_diagnoses": _cap(metadata.get("daily_diagnoses")),
            "monthly_diagnoses": _cap(plan.max_diagnoses_per_month if plan else 0),
            "history_days": _cap(metadata.get("history_days")),
            "daily_chat_messages": _cap(metadata.get("chat_daily")),
            "crop_plans": crop_plans,
        },
        "features": {
            "yolo": bool(plan.yolo_enabled) if plan else True,
            "cnn": bool(plan.cnn_enabled) if plan else False,
            "rag": bool(plan.rag_enabled) if plan else False,
            "expert_chat": bool(plan.expert_chat_enabled) if plan else False,
            "reports": bool(metadata.get("reports", False)),
        },
    }


def limit_for(user, key, now=None):
    """A single cap. ``None`` means unlimited."""
    return resolve_entitlements(user, now=now)["limits"].get(key, UNLIMITED)


def next_plan_slug(slug):
    index = PLAN_ORDER.index(normalize_plan_slug(slug))
    return PLAN_ORDER[index + 1] if index + 1 < len(PLAN_ORDER) else PLAN_ORDER[-1]


def enforce_limit(user, key, used, message=None, now=None):
    """Raise ``PlanLimitExceeded`` (HTTP 402) when ``used`` already fills the cap.

    ``used`` is the number of records that already exist, so the call site asks
    "may I add one more?" before writing.
    """
    entitlements = resolve_entitlements(user, now=now)
    limit = entitlements["limits"].get(key, UNLIMITED)
    if limit is UNLIMITED or used < limit:
        return limit

    upgrade_to = next_plan_slug(entitlements["plan"])
    raise PlanLimitExceeded(
        {
            "detail": message
            or (
                f"Gói {entitlements['plan_name']} chỉ cho phép {limit} mục cho tính năng này. "
                f"Vui lòng nâng cấp lên gói {PLAN_DISPLAY_NAMES.get(upgrade_to, upgrade_to)} để tiếp tục."
            ),
            "code": PlanLimitExceeded.default_code,
            "plan": entitlements["plan"],
            "limit": limit,
            "used": used,
            "upgrade_to": upgrade_to,
        }
    )


def active_subscription(user, now=None):
    """The subscription row that currently backs the plan, if any."""
    now = now or timezone.now()
    return (
        UserSubscription.objects.filter(user=user, status__in=("active", "trial"))
        .filter(Q(ends_at__isnull=True) | Q(ends_at__gt=now))
        .select_related("plan")
        .order_by(F("ends_at").desc(nulls_first=True))
        .first()
    )
