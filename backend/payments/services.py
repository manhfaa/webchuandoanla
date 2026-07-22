import re
import secrets
import string
from decimal import Decimal, InvalidOperation
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from engagement.models import ServicePlan, UserSubscription

from .models import Payment, PaymentOrder

User = get_user_model()

PLAN_ORDER = ("seed", "grow", "bloom", "elite")
OPEN_ORDER_STATUSES = (PaymentOrder.Status.PENDING, PaymentOrder.Status.UNDERPAID)


class PaymentConfigurationError(RuntimeError):
    pass


class PaymentRequestError(ValueError):
    pass


def normalize_account_number(value):
    return re.sub(r"\s+", "", str(value or "")).upper()


def ensure_payment_configuration():
    required = {
        "SEPAY_BANK_CODE": getattr(settings, "SEPAY_BANK_CODE", ""),
        "SEPAY_ACCOUNT_NUMBER": getattr(settings, "SEPAY_ACCOUNT_NUMBER", ""),
        "SEPAY_ACCOUNT_NAME": getattr(settings, "SEPAY_ACCOUNT_NAME", ""),
    }
    missing = [key for key, value in required.items() if not str(value).strip()]
    if missing:
        raise PaymentConfigurationError(
            "Dich vu thanh toan chua duoc cau hinh day du: " + ", ".join(missing)
        )


def expire_user_plan(user, now=None):
    now = now or timezone.now()
    if user.current_plan == "seed" or not user.plan_expires_at or user.plan_expires_at > now:
        return False

    UserSubscription.objects.filter(
        user=user,
        status__in=("active", "trial"),
    ).update(status="expired", ends_at=now, updated_at=now)
    user.current_plan = "seed"
    user.plan_expires_at = None
    user.save(update_fields=["current_plan", "plan_expires_at", "updated_at"])
    return True


def get_purchasable_plan(slug):
    normalized = str(slug or "").strip().lower()
    if normalized not in PLAN_ORDER or normalized == "seed":
        raise PaymentRequestError("Goi dich vu khong hop le.")

    plan = ServicePlan.objects.filter(slug=normalized, is_active=True).first()
    if not plan:
        raise PaymentRequestError("Goi dich vu hien khong mo ban.")

    try:
        amount = Decimal(plan.price_monthly)
    except (InvalidOperation, TypeError):
        raise PaymentConfigurationError("Gia goi dich vu khong hop le.")
    if amount <= 0 or amount != amount.to_integral_value():
        raise PaymentConfigurationError("Gia goi dich vu phai la so nguyen VND lon hon 0.")
    return plan, int(amount)


def _generate_payment_code():
    prefix = re.sub(r"[^A-Z0-9]", "", getattr(settings, "SEPAY_PAYMENT_PREFIX", "AGM").upper())[:8]
    prefix = prefix or "AGM"
    alphabet = string.ascii_uppercase + string.digits
    while True:
        suffix = "".join(secrets.choice(alphabet) for _ in range(12))
        code = f"{prefix}{suffix}"
        if not PaymentOrder.objects.filter(payment_code=code).exists():
            return code


@transaction.atomic
def create_payment_order(user, plan_slug):
    ensure_payment_configuration()
    now = timezone.now()
    locked_user = User.objects.select_for_update().get(pk=user.pk)
    expire_user_plan(locked_user, now=now)

    plan, amount = get_purchasable_plan(plan_slug)
    current_plan = locked_user.current_plan if locked_user.current_plan in PLAN_ORDER else "seed"
    if PLAN_ORDER.index(plan.slug) < PLAN_ORDER.index(current_plan):
        raise PaymentRequestError(
            "Khong the ha goi khi goi hien tai van con hieu luc."
        )

    PaymentOrder.objects.filter(
        user=locked_user,
        status__in=OPEN_ORDER_STATUSES,
        expires_at__lte=now,
    ).update(status=PaymentOrder.Status.EXPIRED, updated_at=now)

    existing = (
        PaymentOrder.objects.select_for_update()
        .filter(
            user=locked_user,
            plan=plan,
            status__in=OPEN_ORDER_STATUSES,
            expires_at__gt=now,
        )
        .order_by("-created_at")
        .first()
    )
    if existing:
        return existing, False

    PaymentOrder.objects.filter(
        user=locked_user,
        status__in=OPEN_ORDER_STATUSES,
        expires_at__gt=now,
    ).exclude(plan=plan).update(status=PaymentOrder.Status.CANCELLED, updated_at=now)

    ttl_minutes = max(5, int(getattr(settings, "SEPAY_ORDER_TTL_MINUTES", 30)))
    order = PaymentOrder.objects.create(
        user=locked_user,
        plan=plan,
        payment_code=_generate_payment_code(),
        amount_expected=amount,
        currency=plan.currency or "VND",
        expires_at=now + timezone.timedelta(minutes=ttl_minutes),
        metadata={"plan_before_purchase": current_plan},
    )
    return order, True


def build_qr_url(order):
    ensure_payment_configuration()
    query = urlencode(
        {
            "bank": settings.SEPAY_BANK_CODE,
            "acc": settings.SEPAY_ACCOUNT_NUMBER,
            "amount": order.amount_expected,
            "des": order.payment_code,
            "template": "compact",
        }
    )
    base_url = getattr(settings, "SEPAY_QR_BASE_URL", "https://vietqr.app/img").rstrip("?")
    return f"{base_url}?{query}"


def _extract_payment_code(payload):
    prefix = re.sub(r"[^A-Z0-9]", "", getattr(settings, "SEPAY_PAYMENT_PREFIX", "AGM").upper())[:8]
    prefix = prefix or "AGM"
    direct_code = str(payload.get("code") or "").upper().strip()
    if direct_code.startswith(prefix):
        return direct_code

    content = " ".join(
        str(payload.get(field) or "")
        for field in ("content", "description")
    ).upper()
    match = re.search(rf"\b{re.escape(prefix)}[A-Z0-9]{{8,24}}\b", content)
    return match.group(0) if match else ""


def _parse_amount(value):
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, TypeError):
        raise PaymentRequestError("So tien giao dich khong hop le.")
    if amount <= 0 or amount != amount.to_integral_value():
        raise PaymentRequestError("So tien giao dich phai la so nguyen VND lon hon 0.")
    return int(amount)


def _activate_locked_order(order, now):
    locked_user = User.objects.select_for_update().get(pk=order.user_id)
    old_plan = locked_user.current_plan if locked_user.current_plan in PLAN_ORDER else "seed"
    subscription_days = max(1, int(getattr(settings, "SEPAY_SUBSCRIPTION_DAYS", 30)))

    active_subscriptions = UserSubscription.objects.select_for_update().filter(
        user=locked_user,
        status__in=("active", "trial"),
    )
    same_plan_subscription = active_subscriptions.filter(plan=order.plan).first()

    if same_plan_subscription:
        base_date = same_plan_subscription.ends_at if same_plan_subscription.ends_at and same_plan_subscription.ends_at > now else now
        ends_at = base_date + timezone.timedelta(days=subscription_days)
        same_plan_subscription.status = "active"
        same_plan_subscription.ends_at = ends_at
        same_plan_subscription.auto_renew = False
        same_plan_subscription.payment_provider = "sepay"
        same_plan_subscription.provider_subscription_id = order.payment_code
        same_plan_subscription.save(
            update_fields=[
                "status",
                "ends_at",
                "auto_renew",
                "payment_provider",
                "provider_subscription_id",
                "updated_at",
            ]
        )
        active_subscriptions.exclude(pk=same_plan_subscription.pk).update(
            status="cancelled",
            ends_at=now,
            updated_at=now,
        )
    else:
        active_subscriptions.update(status="cancelled", ends_at=now, updated_at=now)
        ends_at = now + timezone.timedelta(days=subscription_days)
        UserSubscription.objects.create(
            user=locked_user,
            plan=order.plan,
            status="active",
            starts_at=now,
            ends_at=ends_at,
            auto_renew=False,
            payment_provider="sepay",
            provider_subscription_id=order.payment_code,
        )

    locked_user.current_plan = order.plan.slug
    locked_user.plan_expires_at = ends_at
    locked_user.save(update_fields=["current_plan", "plan_expires_at", "updated_at"])

    order.status = PaymentOrder.Status.PAID
    order.paid_at = now
    order.save(
        update_fields=["status", "paid_at", "amount_received", "updated_at"]
    )
    return old_plan, ends_at


@transaction.atomic
def process_sepay_payload(payload):
    transaction_id = str(payload.get("id") or "").strip()
    if not transaction_id:
        raise PaymentRequestError("Thieu ma giao dich SePay.")

    amount = _parse_amount(payload.get("transferAmount"))
    transfer_type = str(payload.get("transferType") or "").strip().lower()
    account_number = normalize_account_number(payload.get("accountNumber"))
    payment_code = _extract_payment_code(payload)
    now = timezone.now()

    payment, created = Payment.objects.get_or_create(
        sepay_transaction_id=transaction_id,
        defaults={
            "amount": amount,
            "content": str(payload.get("content") or ""),
            "status": Payment.Status.PENDING,
            "gateway": str(payload.get("gateway") or ""),
            "account_number": account_number,
            "transfer_type": transfer_type,
            "reference_number": str(payload.get("referenceCode") or ""),
            "raw_payload": payload,
        },
    )
    if not created:
        return {"result": "duplicate", "payment": payment, "order": payment.order}

    if transfer_type != "in":
        payment.status = Payment.Status.IGNORED
        payment.processed_at = now
        payment.save(update_fields=["status", "processed_at", "updated_at"])
        return {"result": "ignored", "payment": payment, "order": None}

    expected_account = normalize_account_number(getattr(settings, "SEPAY_ACCOUNT_NUMBER", ""))
    if not expected_account or account_number != expected_account:
        payment.status = Payment.Status.FAILED
        payment.processed_at = now
        payment.save(update_fields=["status", "processed_at", "updated_at"])
        return {"result": "account_mismatch", "payment": payment, "order": None}

    order = None
    if payment_code:
        order = (
            PaymentOrder.objects.select_for_update()
            .select_related("plan", "user")
            .filter(payment_code=payment_code)
            .first()
        )

    if not order:
        payment.status = Payment.Status.UNMATCHED
        payment.processed_at = now
        payment.save(update_fields=["status", "processed_at", "updated_at"])
        return {"result": "unmatched", "payment": payment, "order": None}

    payment.order = order
    payment.user = order.user
    payment.plan_requested = order.plan.slug
    payment.old_plan = order.user.current_plan
    order.amount_received += amount

    if order.status == PaymentOrder.Status.PAID:
        payment.status = Payment.Status.OVERPAID
        payment.processed_at = now
        payment.save(
            update_fields=[
                "order",
                "user",
                "plan_requested",
                "old_plan",
                "status",
                "processed_at",
                "updated_at",
            ]
        )
        order.save(update_fields=["amount_received", "updated_at"])
        return {"result": "already_paid", "payment": payment, "order": order}

    if order.status in (PaymentOrder.Status.CANCELLED, PaymentOrder.Status.EXPIRED) or order.expires_at <= now:
        order.status = PaymentOrder.Status.REVIEW
        order.save(update_fields=["status", "amount_received", "updated_at"])
        payment.status = Payment.Status.LATE
        payment.processed_at = now
        payment.save(
            update_fields=[
                "order",
                "user",
                "plan_requested",
                "old_plan",
                "status",
                "processed_at",
                "updated_at",
            ]
        )
        return {"result": "late", "payment": payment, "order": order}

    if order.amount_received < order.amount_expected:
        order.status = PaymentOrder.Status.UNDERPAID
        payment.status = Payment.Status.UNDERPAID
        result = "underpaid"
    elif order.amount_received > order.amount_expected:
        order.status = PaymentOrder.Status.OVERPAID
        payment.status = Payment.Status.OVERPAID
        result = "overpaid"
    else:
        old_plan, _ = _activate_locked_order(order, now)
        payment.old_plan = old_plan
        payment.status = Payment.Status.SUCCESS
        result = "paid"

    if result != "paid":
        order.save(update_fields=["status", "amount_received", "updated_at"])
    payment.processed_at = now
    payment.save(
        update_fields=[
            "order",
            "user",
            "plan_requested",
            "old_plan",
            "status",
            "processed_at",
            "updated_at",
        ]
    )
    return {"result": result, "payment": payment, "order": order}
