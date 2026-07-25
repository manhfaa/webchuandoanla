from django.urls import path

from .views import (
    AccountDeletionPreviewAPIView,
    MeAPIView,
    PasswordChangeAPIView,
    UserSettingAPIView,
)

urlpatterns = [
    path("me/", MeAPIView.as_view(), name="me"),
    path("me/deletion-preview/", AccountDeletionPreviewAPIView.as_view(), name="account-deletion-preview"),
    path("change-password/", PasswordChangeAPIView.as_view(), name="change-password"),
    path("settings/", UserSettingAPIView.as_view(), name="settings"),
]
