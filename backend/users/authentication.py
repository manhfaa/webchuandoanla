from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from payments.services import expire_user_plan
from .models import WebSession


class WebSessionAuthentication(BaseAuthentication):
    """Authenticate opaque browser tokens without accepting them as JWTs."""

    def authenticate(self, request):
        authorization = request.headers.get("Authorization", "")
        if not authorization.startswith("Session "):
            return None
        session = WebSession.from_access(authorization.removeprefix("Session "))
        if session is None or not session.user.is_active:
            raise AuthenticationFailed("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.")
        expire_user_plan(session.user)
        return (session.user, session)

    def authenticate_header(self, request):
        return "Session"


class ExpiringJWTAuthentication(JWTAuthentication):
    """Keep the persisted plan in sync before an authenticated request runs."""

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        expire_user_plan(user)
        return user
