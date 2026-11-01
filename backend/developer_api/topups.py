"""Top-up orders and settlement after the shared SePay webhook authenticates."""

import re
import secrets
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from .models import ApiTopUpOrder, ApiTopUpReconciliation, ApiTopUpTransfer, ApiWallet, DeveloperAPIKey
from .wallets import credit_wallet

MIN_TOPUP_VND = 2000
MAX_TOPUP_VND = 100_000_000


@transaction.atomic
def create_topup_order(wallet_id, amount_vnd):
    if isinstance(amount_vnd, bool) or not isinstance(amount_vnd, int) or not MIN_TOPUP_VND <= amount_vnd <= MAX_TOPUP_VND:
        raise ValueError("Amount must be a whole number of VND between 2,000 and 100,000,000.")
    wallet = ApiWallet.objects.select_for_update().select_related("organization").get(pk=wallet_id)
    if wallet.environment != DeveloperAPIKey.Environment.LIVE or not wallet.organization.active:
        raise ValueError("Only an active live wallet can receive a top-up.")
    return ApiTopUpOrder.objects.create(
        wallet=wallet,
        payment_code="AGAPI" + secrets.token_hex(10).upper(),
        amount_expected_vnd=amount_vnd,
        expires_at=timezone.now() + timedelta(minutes=30),
    )


def extract_topup_code(payload):
    for field in ("code", "content", "description"):
        match = re.search(r"\bAGAPI[0-9A-F]{20}\b", str(payload.get(field) or "").upper())
        if match:
            return match.group(0)
    return ""


def settle_verified_payment(*, payment, code, now):
    """Called inside the webhook transaction after authentication and account validation."""
    from payments.models import Payment

    order = ApiTopUpOrder.objects.select_for_update().select_related("wallet__organization").filter(payment_code=code).first()
    if order is None:
        return None

    order.amount_received_vnd += payment.amount
    if order.status == ApiTopUpOrder.Status.PAID:
        order.status = ApiTopUpOrder.Status.REVIEW
        outcome, payment.status = "already_paid", Payment.Status.OVERPAID
    elif order.status != ApiTopUpOrder.Status.PENDING or order.expires_at <= now:
        order.status = ApiTopUpOrder.Status.REVIEW
        outcome, payment.status = "review", Payment.Status.LATE
    elif payment.amount != order.amount_expected_vnd:
        order.status = ApiTopUpOrder.Status.REVIEW
        outcome = "underpaid" if payment.amount < order.amount_expected_vnd else "overpaid"
        payment.status = Payment.Status.UNDERPAID if outcome == "underpaid" else Payment.Status.OVERPAID
    else:
        credit_wallet(order.wallet_id, payment.amount, f"sepay:{payment.sepay_transaction_id}")
        order.status = ApiTopUpOrder.Status.PAID
        order.paid_at = now
        outcome, payment.status = "paid", Payment.Status.SUCCESS

    order.save(update_fields=["amount_received_vnd", "status", "paid_at"])
    payment.user_id = order.wallet.organization.owner_id
    payment.processed_at = now
    payment.save(update_fields=["user", "status", "processed_at", "updated_at"])
    ApiTopUpTransfer.objects.create(order=order, payment=payment, outcome=outcome)
    return outcome


@transaction.atomic
def reconcile_topup(*, order_id, actor, amount_vnd, note):
    """Credit a reviewed order only after an administrator verifies its transfers."""
    if not actor or not getattr(actor, "pk", None):
        raise PermissionError("An active superuser is required")
    actor = get_user_model().objects.select_for_update().filter(pk=actor.pk, is_active=True, is_superuser=True).first()
    if actor is None:
        raise PermissionError("An active superuser is required")
    if not isinstance(note, str) or not note.strip() or len(note) > 1000:
        raise ValueError("A reconciliation note is required")
    if isinstance(amount_vnd, bool) or not isinstance(amount_vnd, int) or amount_vnd < MIN_TOPUP_VND:
        raise ValueError("Invalid reconciliation amount")
    order = ApiTopUpOrder.objects.select_for_update().get(pk=order_id)
    if order.status != ApiTopUpOrder.Status.REVIEW or order.amount_received_vnd != amount_vnd:
        raise ValueError("Order or received amount does not match")
    if not order.transfers.exists():
        raise ValueError("No verified transfers are recorded")
    automatic = order.transfers.filter(outcome="paid").aggregate(total=Sum("payment__amount"))["total"] or 0
    reviewed = order.reconciliations.aggregate(total=Sum("amount_vnd"))["total"] or 0
    credit_amount = amount_vnd - automatic - reviewed
    if credit_amount <= 0:
        raise ValueError("No uncredited amount remains")
    audit = ApiTopUpReconciliation.objects.create(order=order, actor=actor, amount_vnd=credit_amount, note=note.strip())
    credit_wallet(order.wallet_id, credit_amount, f"review:{audit.pk}")
    order.status = ApiTopUpOrder.Status.PAID
    order.paid_at = timezone.now()
    order.save(update_fields=["status", "paid_at"])
    return order
