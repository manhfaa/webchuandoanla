import secrets

from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.settings import api_settings as jwt_settings
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from .authentication import ExpiringJWTAuthentication
from .models import WEB_ACCESS_TTL, WEB_REFRESH_TTL, WebSession


class WebSessionExchangeAPIView(APIView):
    """Trade a freshly issued JWT pair for a browser-only opaque pair."""

    authentication_classes = [ExpiringJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        raw_refresh = request.data.get("refresh")
        if not isinstance(raw_refresh, str):
            return Response({"detail": "Phiên đăng nhập không hợp lệ."}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            try:
                refresh = RefreshToken(raw_refresh)
                # Lock the refresh row so two simultaneous exchanges cannot
                # both pass the blacklist check before either writes it.
                OutstandingToken.objects.select_for_update().get(jti=refresh[jwt_settings.JTI_CLAIM])
                refresh = RefreshToken(raw_refresh)
            except (TokenError, OutstandingToken.DoesNotExist):
                return Response({"detail": "Phiên đăng nhập không hợp lệ."}, status=status.HTTP_401_UNAUTHORIZED)
            if str(refresh.get(jwt_settings.USER_ID_CLAIM)) != str(request.user.pk):
                return Response({"detail": "Phiên đăng nhập không hợp lệ."}, status=status.HTTP_401_UNAUTHORIZED)
            pair = WebSession.issue(request.user)
            refresh.blacklist()
        return Response(pair)


class WebSessionRefreshAPIView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        raw = request.data.get("refresh")
        if not isinstance(raw, str) or len(raw) != 43:
            return Response({"detail": "Phiên đăng nhập không hợp lệ."}, status=status.HTTP_401_UNAUTHORIZED)
        with transaction.atomic():
            session = WebSession.objects.select_for_update().select_related("user").filter(
                refresh_hash=WebSession.hash_token(raw),
            ).first()
            now = timezone.now()
            if session is None or session.revoked_at or session.refresh_expires_at <= now or not session.user.is_active:
                return Response({"detail": "Phiên đăng nhập không hợp lệ."}, status=status.HTTP_401_UNAUTHORIZED)
            access, refresh = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
            session.access_hash = WebSession.hash_token(access)
            session.refresh_hash = WebSession.hash_token(refresh)
            session.access_expires_at = now + WEB_ACCESS_TTL
            session.refresh_expires_at = now + WEB_REFRESH_TTL
            session.save(update_fields=["access_hash", "refresh_hash", "access_expires_at", "refresh_expires_at"])
        return Response({"access": access, "refresh": refresh})


class WebSessionLogoutAPIView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        raw = request.data.get("refresh")
        if isinstance(raw, str) and len(raw) == 43:
            WebSession.objects.filter(
                refresh_hash=WebSession.hash_token(raw), revoked_at__isnull=True,
            ).update(revoked_at=timezone.now())
        return Response({"detail": "Đã đăng xuất khỏi thiết bị này."})
