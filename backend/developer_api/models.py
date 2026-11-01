import hashlib
import hmac
import secrets
import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class DeveloperOrganization(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="developer_organizations")
    name = models.CharField(max_length=150)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)


class DeveloperAPIKey(models.Model):
    class Environment(models.TextChoices):
        TEST = "test", "Test"
        LIVE = "live", "Live"

    organization = models.ForeignKey(DeveloperOrganization, on_delete=models.PROTECT, related_name="api_keys")
    name = models.CharField(max_length=150)
    environment = models.CharField(max_length=4, choices=Environment.choices)
    prefix = models.CharField(max_length=32, unique=True)
    secret_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    @classmethod
    def issue(cls, *, organization, name, environment, expires_at=None):
        if environment not in cls.Environment.values:
            raise ValueError("Invalid key environment")
        if not organization.active:
            raise ValueError("Organization is inactive")
        if expires_at is not None and expires_at <= timezone.now():
            raise ValueError("Key expiry must be in the future")
        prefix = f"sk_agm_{environment}_{secrets.token_hex(6)}"
        token = f"{prefix}_{secrets.token_urlsafe(32)}"
        key = cls.objects.create(
            organization=organization, name=name, environment=environment, prefix=prefix,
            secret_hash=hashlib.sha256(token.encode("ascii")).hexdigest(), expires_at=expires_at,
        )
        return key, token

    @classmethod
    def authenticate_token(cls, token):
        if not isinstance(token, str) or len(token) > 256 or not token.isascii():
            return None
        # URL-safe random secrets may contain underscores; prefix is fixed-length.
        parts = token.split("_", 4)
        if len(parts) != 5 or parts[0:2] != ["sk", "agm"] or parts[2] not in cls.Environment.values:
            return None
        prefix = "_".join(parts[:4])
        key = cls.objects.select_related("organization").filter(prefix=prefix).first()
        if key is None or not hmac.compare_digest(key.secret_hash, hashlib.sha256(token.encode("ascii")).hexdigest()):
            return None
        if key.revoked_at or not key.organization.active or (key.expires_at and key.expires_at <= timezone.now()):
            return None
        return key


class ApiWallet(models.Model):
    organization = models.ForeignKey(DeveloperOrganization, on_delete=models.PROTECT, related_name="wallets")
    environment = models.CharField(max_length=4, choices=DeveloperAPIKey.Environment.choices)
    available_vnd = models.PositiveBigIntegerField(default=0)
    reserved_vnd = models.PositiveBigIntegerField(default=0)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["organization", "environment"], name="developer_wallet_org_env_unique")]


class ApiUsage(models.Model):
    class Status(models.TextChoices):
        RESERVED = "reserved", "Reserved"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    wallet = models.ForeignKey(ApiWallet, on_delete=models.PROTECT, related_name="usages")
    key = models.ForeignKey(DeveloperAPIKey, on_delete=models.PROTECT, related_name="usages")
    idempotency_key = models.CharField(max_length=128)
    request_hash = models.CharField(max_length=64)
    amount_vnd = models.PositiveBigIntegerField()
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.RESERVED)
    result = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["wallet", "idempotency_key"], name="developer_usage_wallet_idem_unique")]


class ApiLedgerEntry(models.Model):
    class Kind(models.TextChoices):
        TOPUP = "topup", "Top-up"
        RESERVE = "reserve", "Reserve"
        CHARGE = "charge", "Charge"
        RELEASE = "release", "Release"

    wallet = models.ForeignKey(ApiWallet, on_delete=models.PROTECT, related_name="entries")
    usage = models.ForeignKey(ApiUsage, null=True, blank=True, on_delete=models.PROTECT, related_name="entries")
    kind = models.CharField(max_length=10, choices=Kind.choices)
    amount_vnd = models.PositiveBigIntegerField()
    reference = models.CharField(max_length=160, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.CheckConstraint(condition=models.Q(amount_vnd__gt=0), name="developer_ledger_amount_positive")]


class ApiTopUpOrder(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        REVIEW = "review", "Review"
        EXPIRED = "expired", "Expired"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet = models.ForeignKey(ApiWallet, on_delete=models.PROTECT, related_name="topup_orders")
    payment_code = models.CharField(max_length=32, unique=True)
    amount_expected_vnd = models.PositiveBigIntegerField()
    amount_received_vnd = models.PositiveBigIntegerField(default=0)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    paid_at = models.DateTimeField(null=True, blank=True)

    @property
    def amount_expected(self):
        return self.amount_expected_vnd

    class Meta:
        constraints = [models.CheckConstraint(condition=models.Q(amount_expected_vnd__gte=2000), name="developer_topup_min_2000")]


class ApiTopUpTransfer(models.Model):
    order = models.ForeignKey(ApiTopUpOrder, on_delete=models.PROTECT, related_name="transfers")
    payment = models.OneToOneField("payments.Payment", on_delete=models.PROTECT, related_name="api_topup_transfer")
    outcome = models.CharField(max_length=24)
    created_at = models.DateTimeField(auto_now_add=True)


class ApiTopUpReconciliation(models.Model):
    order = models.ForeignKey(ApiTopUpOrder, on_delete=models.PROTECT, related_name="reconciliations")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    amount_vnd = models.PositiveBigIntegerField()
    note = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
