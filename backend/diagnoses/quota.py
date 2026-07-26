"""Leaf-check quota and history retention for the diagnoses app.

Every cap here is read through ``payments.entitlements``, which resolves it from
the ServicePlan catalogue the pricing page sells. No number is re-typed in this
app, so what is sold and what is enforced cannot drift apart.

The quota unit is a *saved* leaf check (one ``Diagnosis`` row). Both the
inference route and the create route measure that same counter, so one check —
one CNN call followed by one saved record — spends exactly one unit, and a
retried or abandoned inference call spends none.

Retention is a display window, never a deletion. ``history_cutoff`` only trims
what the history list shows; the rows stay in the database, the detail route
still opens them by id, and they reappear the moment the plan is renewed or
upgraded.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

from payments.entitlements import (
    PLAN_DISPLAY_NAMES,
    UNLIMITED,
    enforce_limit,
    next_plan_slug,
    resolve_entitlements,
)

from .models import Diagnosis

User = get_user_model()


def lock_account(user):
    """Serialise one account's concurrent writes before its usage is counted.

    Counting rows and then inserting one is two statements. Without a lock two
    requests that arrive together both read "4 used" and both save, so a burst
    of parallel calls saves as many rows as it has requests — the daily cap is
    then whatever the account's connection count is, not what the plan sells.
    Locking the account row first makes count-then-insert a single decision.

    Same pattern ``payments.services`` already uses to settle an order. The
    clause is a no-op on SQLite (local dev), which has no row locks; production
    is PostgreSQL, where Django emits ``SELECT ... FOR UPDATE``.

    Returns the freshly read account row, so a plan the SePay webhook activated
    while this request was queued is the plan the cap is measured against.
    """
    return User.objects.select_for_update().filter(pk=user.pk).first() or user


def local_day_start(now=None):
    """Midnight of the current calendar day in ``settings.TIME_ZONE``.

    ``created_at`` is stored in UTC, where midnight falls at 07:00 in
    Asia/Ho_Chi_Minh: counting on UTC days would reset a grower's quota in the
    middle of the working morning.
    """
    return timezone.localtime(now or timezone.now()).replace(
        hour=0, minute=0, second=0, microsecond=0
    )


def local_month_start(now=None):
    """Midnight of the first day of the current local month."""
    return local_day_start(now).replace(day=1)


def diagnoses_used_today(user, now=None):
    return Diagnosis.objects.filter(user=user, created_at__gte=local_day_start(now)).count()


def diagnoses_used_this_month(user, now=None):
    return Diagnosis.objects.filter(user=user, created_at__gte=local_month_start(now)).count()


def _plan_labels(entitlements):
    """Display name of the current plan and of the one that lifts its caps."""
    upgrade = next_plan_slug(entitlements["plan"])
    return (
        entitlements["plan_name"],
        upgrade,
        PLAN_DISPLAY_NAMES.get(upgrade, upgrade.title()),
    )


def enforce_diagnosis_quota(user, now=None, lock=False):
    """Raise ``PlanLimitExceeded`` (402) when one more leaf check exceeds the plan.

    The counting queries are skipped when a cap is unlimited, so Bloom and Elite
    never pay for them.

    ``lock=True`` is for the write path, where the count decides whether a row is
    saved and must therefore be taken under the account lock. The inference
    pre-check leaves it off: it saves nothing, so serialising the account there
    would only make parallel uploads wait for each other.
    """
    if lock:
        user = lock_account(user)

    entitlements = resolve_entitlements(user, now=now)
    plan_name, _, upgrade_name = _plan_labels(entitlements)
    limits = entitlements["limits"]

    daily = limits.get("daily_diagnoses", UNLIMITED)
    if daily is not UNLIMITED:
        used = diagnoses_used_today(user, now=now)
        enforce_limit(
            user,
            "daily_diagnoses",
            used,
            now=now,
            message=(
                f"Gói {plan_name} cho phép {daily} lượt kiểm tra ảnh lá mỗi ngày và bạn đã "
                f"dùng hết ({used}/{daily}). Hạn mức được làm mới lúc 00:00 ngày mai, hoặc "
                f"nâng cấp lên gói {upgrade_name} để kiểm tra tiếp ngay bây giờ."
            ),
        )

    monthly = limits.get("monthly_diagnoses", UNLIMITED)
    if monthly is not UNLIMITED:
        used = diagnoses_used_this_month(user, now=now)
        enforce_limit(
            user,
            "monthly_diagnoses",
            used,
            now=now,
            message=(
                f"Gói {plan_name} cho phép {monthly} lượt kiểm tra ảnh lá mỗi tháng và bạn đã "
                f"dùng hết ({used}/{monthly}). Hạn mức được làm mới vào đầu tháng sau, hoặc "
                f"nâng cấp lên gói {upgrade_name} để kiểm tra tiếp ngay bây giờ."
            ),
        )


def history_cutoff(user, now=None):
    """Oldest ``created_at`` the history list shows; ``None`` keeps everything.

    The window is aligned to calendar days, so "7 ngày" means today plus the six
    days before it — the same boundary the daily quota resets on, instead of a
    rolling clock the grower cannot predict.
    """
    days = resolve_entitlements(user, now=now)["limits"].get("history_days", UNLIMITED)
    if days is UNLIMITED:
        return None
    return local_day_start(now) - timedelta(days=days - 1)


def history_window(user, now=None):
    """Retention window plus the wording the UI needs to explain it.

    ``hidden`` is what the list is holding back. It is reported explicitly
    because a grower whose plan lapsed must be able to see that the older
    results are still stored, not deleted.
    """
    entitlements = resolve_entitlements(user, now=now)
    plan_name, _, upgrade_name = _plan_labels(entitlements)
    retention_days = entitlements["limits"].get("history_days", UNLIMITED)
    cutoff = history_cutoff(user, now=now)

    total = Diagnosis.objects.filter(user=user).count()
    hidden = (
        0
        if cutoff is None
        else Diagnosis.objects.filter(user=user, created_at__lt=cutoff).count()
    )

    if cutoff is None:
        notice = f"Gói {plan_name} lưu lại toàn bộ lịch sử kiểm tra của bạn."
    elif hidden:
        notice = (
            f"Gói {plan_name} hiển thị lịch sử trong {retention_days} ngày gần nhất. "
            f"{hidden} kết quả cũ hơn vẫn được lưu nguyên vẹn, không bị xóa, và sẽ hiện "
            f"lại đầy đủ khi bạn nâng cấp lên gói {upgrade_name}."
        )
    else:
        notice = f"Gói {plan_name} hiển thị lịch sử trong {retention_days} ngày gần nhất."

    return {
        "retention_days": retention_days,
        "cutoff": cutoff,
        "total": total,
        "visible": total - hidden,
        "hidden": hidden,
        "notice": notice,
    }


def _usage_block(limit, used):
    return {
        "limit": limit,
        "used": used,
        "remaining": None if limit is UNLIMITED else max(0, limit - used),
    }


def usage_summary(user, now=None):
    """One payload the dashboard can render without re-typing a single cap."""
    entitlements = resolve_entitlements(user, now=now)
    plan_name, upgrade, upgrade_name = _plan_labels(entitlements)
    limits = entitlements["limits"]

    return {
        "plan": entitlements["plan"],
        "plan_name": plan_name,
        "upgrade_to": upgrade,
        "upgrade_to_name": upgrade_name,
        "daily_diagnoses": _usage_block(
            limits.get("daily_diagnoses", UNLIMITED), diagnoses_used_today(user, now=now)
        ),
        "monthly_diagnoses": _usage_block(
            limits.get("monthly_diagnoses", UNLIMITED),
            diagnoses_used_this_month(user, now=now),
        ),
        "history": history_window(user, now=now),
    }
