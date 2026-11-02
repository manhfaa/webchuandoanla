from django.urls import path

from .inference import InferenceView, TestInferenceView
from .views import DeveloperConfigView, KeyListCreateView, KeyRevokeView, OrganizationView, TopUpCreateView, TopUpDetailView, WalletLedgerView, WalletView

urlpatterns = [
    path("config/", DeveloperConfigView.as_view(), name="developer-config"),
    path("test/diagnoses/", TestInferenceView.as_view(), name="developer-test-inference"),
    path("v1/diagnoses/", InferenceView.as_view(), name="developer-inference"),
    path("organizations/", OrganizationView.as_view(), name="developer-organizations"),
    path("organizations/<int:organization_id>/keys/", KeyListCreateView.as_view(), name="developer-keys"),
    path("organizations/<int:organization_id>/keys/<int:key_id>/revoke/", KeyRevokeView.as_view(), name="developer-key-revoke"),
    path("organizations/<int:organization_id>/wallets/<str:environment>/", WalletView.as_view(), name="developer-wallet"),
    path("organizations/<int:organization_id>/wallets/<str:environment>/ledger/", WalletLedgerView.as_view(), name="developer-wallet-ledger"),
    path("organizations/<int:organization_id>/topups/", TopUpCreateView.as_view(), name="developer-topup-create"),
    path("organizations/<int:organization_id>/topups/<uuid:order_id>/", TopUpDetailView.as_view(), name="developer-topup-detail"),
]
