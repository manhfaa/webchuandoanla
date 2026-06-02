from django.conf import settings
from django.db import models


class Payment(models.Model):
    STATUS_CHOICES = [
        ("pending", "Chờ thanh toán"),
        ("success", "Thành công"),
        ("underpaid", "Thiếu tiền"),
        ("failed", "Thất bại"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payments",
    )
    sepay_transaction_id = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
    )
    amount = models.IntegerField()
    plan_requested = models.CharField(max_length=10)
    old_plan = models.CharField(max_length=10, blank=True)
    content = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    gateway = models.CharField(max_length=50, blank=True)
    reference_number = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payments"
        ordering = ["-created_at"]

    def __str__(self):
        return f"#{self.id} {self.user.email} → {self.plan_requested} ({self.status})"
