from django.urls import path

from .views import (
    CheckPaymentStatusView,
    CreateOrderView,
    GooglePlayProductsView,
    GooglePlayRtdnView,
    GooglePlayVerifyView,
    PaymentOrderDetailView,
    PaymentOrderListCreateView,
    PaymentOrderReconcileView,
    SepayWebhookView,
    SubscriptionSummaryView,
)

urlpatterns = [
    path("orders/", PaymentOrderListCreateView.as_view(), name="payment_order_list_create"),
    path("orders/<uuid:order_id>/", PaymentOrderDetailView.as_view(), name="payment_order_detail"),
    path(
        "orders/<uuid:order_id>/reconcile/",
        PaymentOrderReconcileView.as_view(),
        name="payment_order_reconcile",
    ),
    path("subscription/", SubscriptionSummaryView.as_view(), name="payment_subscription"),
    # Google Play distribution. Separate from the SePay routes because the two
    # answer to different policies and must be able to be enabled independently.
    path("google-play/products/", GooglePlayProductsView.as_view(), name="play_products"),
    path("google-play/verify/", GooglePlayVerifyView.as_view(), name="play_verify"),
    path("google-play/rtdn/", GooglePlayRtdnView.as_view(), name="play_rtdn"),
    path("webhooks/sepay/", SepayWebhookView.as_view(), name="sepay_webhook_v2"),
    # Keep these aliases while older frontend and SePay configurations are migrated.
    path("sepay-webhook/", SepayWebhookView.as_view(), name="sepay_webhook"),
    path("status/", CheckPaymentStatusView.as_view(), name="payment_status"),
    path("create-order/", CreateOrderView.as_view(), name="create_order"),
]
