"""Internal wallet operations; no public credit endpoint is exposed."""

from django.db import transaction
from django.utils import timezone
from datetime import timedelta

from .models import ApiLedgerEntry, ApiUsage, ApiWallet, DeveloperAPIKey, DeveloperOrganization


class InsufficientBalance(Exception):
    pass


class IdempotencyConflict(Exception):
    pass


class ConcurrencyLimit(Exception):
    pass


@transaction.atomic
def credit_wallet(wallet_id, amount_vnd, reference):
    if not isinstance(amount_vnd, int) or isinstance(amount_vnd, bool) or amount_vnd <= 0 or not reference or len(reference) > 150:
        raise ValueError("Invalid credit")
    wallet = ApiWallet.objects.select_for_update().get(pk=wallet_id)
    ref = f"topup:{reference}"
    previous = ApiLedgerEntry.objects.filter(reference=ref).first()
    if previous:
        if previous.wallet_id != wallet.pk or previous.amount_vnd != amount_vnd:
            raise IdempotencyConflict("Credit reference already used")
        return previous
    wallet.available_vnd += amount_vnd
    wallet.save(update_fields=["available_vnd"])
    return ApiLedgerEntry.objects.create(wallet=wallet, kind=ApiLedgerEntry.Kind.TOPUP, amount_vnd=amount_vnd, reference=ref)


@transaction.atomic
def reserve(wallet_id, key, idempotency_key, request_hash, amount_vnd):
    if not isinstance(amount_vnd, int) or isinstance(amount_vnd, bool) or amount_vnd <= 0:
        raise ValueError("Invalid amount")
    if not isinstance(idempotency_key, str) or not 1 <= len(idempotency_key) <= 128 or not isinstance(request_hash, str) or len(request_hash) != 64:
        raise ValueError("Invalid request identity")
    wallet = ApiWallet.objects.select_for_update().get(pk=wallet_id)
    if wallet.organization_id != key.organization_id or wallet.environment != key.environment:
        raise ValueError("Key and wallet do not match")
    organization = DeveloperOrganization.objects.select_for_update(of=("self",)).select_related("owner").get(pk=wallet.organization_id)
    key = DeveloperAPIKey.objects.select_for_update().get(pk=key.pk, organization=organization)
    if not organization.active or not organization.owner.is_active or key.revoked_at or (key.expires_at and key.expires_at <= timezone.now()):
        raise ValueError("Key or organization is inactive")
    existing = ApiUsage.objects.filter(wallet=wallet, idempotency_key=idempotency_key).first()
    if existing:
        if existing.request_hash != request_hash or existing.key_id != key.pk:
            raise IdempotencyConflict("Request identity already used")
        return existing, False
    if ApiUsage.objects.filter(wallet=wallet, status=ApiUsage.Status.RESERVED).count() >= 5:
        raise ConcurrencyLimit()
    if wallet.available_vnd < amount_vnd:
        raise InsufficientBalance()
    wallet.available_vnd -= amount_vnd
    wallet.reserved_vnd += amount_vnd
    wallet.save(update_fields=["available_vnd", "reserved_vnd"])
    usage = ApiUsage.objects.create(wallet=wallet, key=key, idempotency_key=idempotency_key, request_hash=request_hash, amount_vnd=amount_vnd)
    ApiLedgerEntry.objects.create(wallet=wallet, usage=usage, kind=ApiLedgerEntry.Kind.RESERVE, amount_vnd=amount_vnd, reference=f"usage:{usage.pk}:reserve")
    return usage, True


@transaction.atomic
def finish(usage_id, *, success, result=None):
    usage = ApiUsage.objects.select_related("wallet").get(pk=usage_id)
    wallet = ApiWallet.objects.select_for_update().get(pk=usage.wallet_id)
    usage = ApiUsage.objects.select_for_update().get(pk=usage_id)
    target = ApiUsage.Status.COMPLETED if success else ApiUsage.Status.FAILED
    if usage.status != ApiUsage.Status.RESERVED:
        if usage.status != target:
            raise IdempotencyConflict("Usage already finalized differently")
        return usage
    if wallet.reserved_vnd < usage.amount_vnd:
        raise ValueError("Wallet reservation is inconsistent")
    wallet.reserved_vnd -= usage.amount_vnd
    if not success:
        wallet.available_vnd += usage.amount_vnd
    wallet.save(update_fields=["available_vnd", "reserved_vnd"])
    usage.status = target
    usage.result = result if success else None
    usage.save(update_fields=["status", "result", "updated_at"])
    kind = ApiLedgerEntry.Kind.CHARGE if success else ApiLedgerEntry.Kind.RELEASE
    ApiLedgerEntry.objects.create(wallet=wallet, usage=usage, kind=kind, amount_vnd=usage.amount_vnd, reference=f"usage:{usage.pk}:final")
    return usage


def release_stale_reservations(*, now=None, limit=100):
    """Release abandoned calls; finalization's wallet lock resolves races."""
    if not 1 <= limit <= 1000:
        raise ValueError("Invalid batch size")
    cutoff = (now or timezone.now()) - timedelta(minutes=10)
    ids = list(ApiUsage.objects.filter(status=ApiUsage.Status.RESERVED, created_at__lt=cutoff)
               .order_by("created_at", "pk").values_list("pk", flat=True)[:limit])
    released = 0
    for usage_id in ids:
        try:
            finish(usage_id, success=False)
            released += 1
        except IdempotencyConflict:
            # An inference completed after the candidate list was read.
            continue
    return released
