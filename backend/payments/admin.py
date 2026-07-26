from django.contrib import admin, messages

from .models import Payment, PaymentOrder
from .services import (
    PaymentRequestError,
    close_order_as_refunded,
    order_needs_reconciliation,
    reconcile_order,
    settle_order_from_bank_statement,
)


class NeedsReconciliationFilter(admin.SimpleListFilter):
    """Money-in-but-plan-off is the only queue staff actually have to work."""

    title = "Cần đối soát"
    parameter_name = "needs_reconciliation"

    def lookups(self, request, model_admin):
        return (("yes", "Cần đối soát"), ("requested", "Người dùng đã yêu cầu"))

    def queryset(self, request, queryset):
        if self.value() == "yes":
            return queryset.filter(amount_received__gt=0).exclude(status=PaymentOrder.Status.PAID)
        if self.value() == "requested":
            return queryset.filter(metadata__reconciliation__requested_at__isnull=False)
        return queryset


@admin.register(PaymentOrder)
class PaymentOrderAdmin(admin.ModelAdmin):
    list_display = (
        "payment_code",
        "user",
        "plan",
        "amount_expected",
        "amount_received",
        "status",
        "needs_reconciliation",
        "expires_at",
        "created_at",
    )
    list_filter = ("status", "plan", "provider", NeedsReconciliationFilter)
    search_fields = ("payment_code", "user__email", "user__username")
    actions = ("reconcile_and_activate", "settle_from_bank_statement", "mark_refunded_and_close")
    readonly_fields = (
        "id",
        "payment_code",
        "amount_received",
        "paid_at",
        "created_at",
        "updated_at",
    )

    @admin.display(boolean=True, description="Cần đối soát")
    def needs_reconciliation(self, obj):
        return order_needs_reconciliation(obj)

    @admin.action(description="Đối soát và kích hoạt gói")
    def reconcile_and_activate(self, request, queryset):
        activated = 0
        for order in queryset:
            try:
                reconcile_order(order, actor=request.user, note="Đối soát thủ công từ trang quản trị.")
            except PaymentRequestError as exc:
                self.message_user(request, f"{order.payment_code}: {exc}", level=messages.WARNING)
                continue
            activated += 1
        if activated:
            self.message_user(request, f"Đã kích hoạt gói cho {activated} đơn.", level=messages.SUCCESS)

    @admin.action(description="Đã thấy tiền trên sao kê - kích hoạt gói")
    def settle_from_bank_statement(self, request, queryset):
        """For a transfer that reached the bank but never reached the webhook.

        Only use it after seeing the transfer on the statement: nothing here can
        check the bank, so the person running it is the one vouching for it. The
        amount is taken as the amount the order asked for, since that is what the
        payment code was quoted against.
        """
        activated = 0
        for order in queryset:
            try:
                settle_order_from_bank_statement(
                    order,
                    order.amount_expected,
                    actor=request.user,
                    note="Xác nhận theo sao kê ngân hàng từ trang quản trị.",
                )
            except PaymentRequestError as exc:
                self.message_user(request, f"{order.payment_code}: {exc}", level=messages.WARNING)
                continue
            activated += 1
        if activated:
            self.message_user(
                request,
                f"Đã ghi nhận tiền theo sao kê và kích hoạt gói cho {activated} đơn.",
                level=messages.SUCCESS,
            )

    @admin.action(description="Đã hoàn tiền - đóng đơn")
    def mark_refunded_and_close(self, request, queryset):
        closed = 0
        for order in queryset:
            try:
                close_order_as_refunded(order, actor=request.user, note="Đánh dấu hoàn tiền từ trang quản trị.")
            except PaymentRequestError as exc:
                self.message_user(request, f"{order.payment_code}: {exc}", level=messages.WARNING)
                continue
            closed += 1
        if closed:
            self.message_user(request, f"Đã đóng {closed} đơn sau khi hoàn tiền.", level=messages.SUCCESS)


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
