from django.contrib import admin

from .models import Payment, PaymentOrder


@admin.register(PaymentOrder)
class PaymentOrderAdmin(admin.ModelAdmin):
    list_display = (
        "payment_code",
        "user",
        "plan",
        "amount_expected",
        "amount_received",
        "status",
        "expires_at",
        "created_at",
    )
    list_filter = ("status", "plan", "provider")
    search_fields = ("payment_code", "user__email", "user__username")
    readonly_fields = (
        "id",
        "payment_code",
        "amount_received",
        "paid_at",
        "created_at",
        "updated_at",
    )


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "sepay_transaction_id",
        "user",
        "order",
        "plan_requested",
        "amount",
        "status",
        "created_at",
    )
    list_filter = ("status", "plan_requested")
    search_fields = (
        "user__email",
        "content",
        "sepay_transaction_id",
        "reference_number",
        "order__payment_code",
    )
    readonly_fields = (
        "sepay_transaction_id",
        "raw_payload",
        "processed_at",
        "created_at",
        "updated_at",
    )
