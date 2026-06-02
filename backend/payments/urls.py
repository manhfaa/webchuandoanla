from django.urls import path

from .views import CheckPaymentStatusView, CreateOrderView, SepayWebhookView

urlpatterns = [
    path("sepay-webhook/", SepayWebhookView.as_view(), name="sepay_webhook"),
    path("status/", CheckPaymentStatusView.as_view(), name="payment_status"),
    path("create-order/", CreateOrderView.as_view(), name="create_order"),
]
