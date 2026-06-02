from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "plan_requested", "amount", "status", "created_at")
    list_filter = ("status", "plan_requested")
    search_fields = ("user__email", "content", "sepay_transaction_id")
    readonly_fields = ("sepay_transaction_id", "created_at", "updated_at")
