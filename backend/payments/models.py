import uuid

from django.conf import settings
from django.db import models


class PaymentOrder(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Cho thanh toan"
        UNDERPAID = "underpaid", "Thieu tien"
        PAID = "paid", "Da thanh toan"
        OVERPAID = "overpaid", "Thua tien - can doi soat"
        EXPIRED = "expired", "Het han"
        CANCELLED = "cancelled", "Da huy"
        REVIEW = "review", "Can doi soat"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payment_orders",
    )
    plan = models.ForeignKey(
        "engagement.ServicePlan",
        on_delete=models.PROTECT,
        related_name="payment_orders",
    )
    payment_code = models.CharField(max_length=32, unique=True, db_index=True)
    amount_expected = models.PositiveBigIntegerField()
    amount_received = models.PositiveBigIntegerField(default=0)
    currency = models.CharField(max_length=10, default="VND")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    provider = models.CharField(max_length=30, default="sepay")
    expires_at = models.DateTimeField()
    paid_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payment_orders"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status", "-created_at"], name="pay_order_user_status_idx"),
            models.Index(fields=["status", "expires_at"], name="pay_order_expiry_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(amount_expected__gt=0),
                name="payment_order_expected_positive",
            ),
        ]

    def __str__(self):
        return f"{self.payment_code} - {self.plan.slug} ({self.status})"


class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Cho xu ly"
        SUCCESS = "success", "Thanh cong"
        UNDERPAID = "underpaid", "Thieu tien"
        OVERPAID = "overpaid", "Thua tien"
        UNMATCHED = "unmatched", "Khong khop don"
        LATE = "late", "Thanh toan sau khi het han"
        FAILED = "failed", "That bai"
        IGNORED = "ignored", "Bo qua"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="payments",
    )
    order = models.ForeignKey(
        PaymentOrder,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="transactions",
    )
    sepay_transaction_id = models.CharField(max_length=100, unique=True, db_index=True)
    amount = models.PositiveBigIntegerField()
    plan_requested = models.CharField(max_length=30, blank=True, default="")
    old_plan = models.CharField(max_length=30, blank=True, default="")
    content = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    gateway = models.CharField(max_length=50, blank=True)
    account_number = models.CharField(max_length=50, blank=True, default="")
    transfer_type = models.CharField(max_length=20, blank=True, default="")
    reference_number = models.CharField(max_length=100, blank=True)
    raw_payload = models.JSONField(default=dict, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payments"
        ordering = ["-created_at"]

    def __str__(self):
        owner = self.user.email if self.user else "unmatched"
        return f"#{self.id} {owner} -> {self.plan_requested or '-'} ({self.status})"
