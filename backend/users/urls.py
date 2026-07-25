from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import GoogleLoginAPIView, LoginAPIView, RegisterAPIView

urlpatterns = [
    path("register/", RegisterAPIView.as_view(), name="register"),
    path("login/", LoginAPIView.as_view(), name="login"),
    path("google/", GoogleLoginAPIView.as_view(), name="google-login"),
    # Without this the 30-minute access token simply expired and the user was
    # silently signed out mid-session.
    path("refresh/", TokenRefreshView.as_view(), name="token-refresh"),
]
