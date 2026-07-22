from django.urls import path

from .views import (
    CheckPaymentStatusView,
    CreateOrderView,
    PaymentOrderDetailView,
    PaymentOrderListCreateView,
    SepayWebhookView,
)

urlpatterns = [
    path("orders/", PaymentOrderListCreateView.as_view(), name="payment_order_list_create"),
    path("orders/<uuid:order_id>/", PaymentOrderDetailView.as_view(), name="payment_order_detail"),
    path("webhooks/sepay/", SepayWebhookView.as_view(), name="sepay_webhook_v2"),
    # Keep these aliases while older frontend and SePay configurations are migrated.
    path("sepay-webhook/", SepayWebhookView.as_view(), name="sepay_webhook"),
    path("status/", CheckPaymentStatusView.as_view(), name="payment_status"),
    path("create-order/", CreateOrderView.as_view(), name="create_order"),
]
