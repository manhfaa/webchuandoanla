from django.urls import path
from .views import (
    ActiveUserTokenRefreshAPIView,
    EmailVerificationAPIView,
    EmailVerificationResendAPIView,
    GoogleLoginAPIView,
    LoginAPIView,
    LogoutAPIView,
    PasswordResetConfirmAPIView,
    PasswordResetRequestAPIView,
    RegisterAPIView,
)
from .web_sessions import WebSessionExchangeAPIView, WebSessionRefreshAPIView, WebSessionLogoutAPIView

urlpatterns = [
    path("register/", RegisterAPIView.as_view(), name="register"),
    path("verify-email/", EmailVerificationAPIView.as_view(), name="verify-email"),
    path("verify-email/resend/", EmailVerificationResendAPIView.as_view(), name="verify-email-resend"),
    path("login/", LoginAPIView.as_view(), name="login"),
    path("google/", GoogleLoginAPIView.as_view(), name="google-login"),
    # Without this the 30-minute access token simply expired and the user was
    # silently signed out mid-session.
    path("refresh/", ActiveUserTokenRefreshAPIView.as_view(), name="token-refresh"),
    # Blacklists the refresh token; signing out was previously local-only.
    path("logout/", LogoutAPIView.as_view(), name="logout"),
    path("web-session/exchange/", WebSessionExchangeAPIView.as_view(), name="web-session-exchange"),
    path("web-session/refresh/", WebSessionRefreshAPIView.as_view(), name="web-session-refresh"),
    path("web-session/logout/", WebSessionLogoutAPIView.as_view(), name="web-session-logout"),
    path("password-reset/", PasswordResetRequestAPIView.as_view(), name="password-reset"),
    path("password-reset/confirm/", PasswordResetConfirmAPIView.as_view(), name="password-reset-confirm"),
]
