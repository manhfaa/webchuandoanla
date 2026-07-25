from django.conf import settings as django_settings
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .emails import send_password_reset_email
from .models import PasswordResetToken, UserSetting
from .serializers import (
    AccountDeleteSerializer,
    EmailTokenSerializer,
    GoogleLoginSerializer,
    LogoutSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserSerializer,
    UserSettingSerializer,
    build_tokens_for_user,
)
from .throttling import LoginEmailRateThrottle, LoginIPRateThrottle, PasswordResetRateThrottle

# Deliberately identical whether or not the address is registered, so the
# endpoint cannot be used to enumerate accounts.
RESET_REQUEST_MESSAGE = (
    "Nếu địa chỉ email này có tài khoản Agromind AI, chúng tôi đã gửi liên kết đặt lại mật khẩu. "
    "Vui lòng kiểm tra hộp thư (kể cả mục spam)."
)


def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class RegisterAPIView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"

    def create(self, request, *args, **kwargs):
        """Return the JWT pair with the new account.

        Registration used to be create-then-login from the browser: when the
        second call failed the account existed but the UI reported failure and
        the user had no idea they already had one.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {"id": user.id, "email": user.email, **build_tokens_for_user(user)},
            status=status.HTTP_201_CREATED,
        )


class LoginAPIView(TokenObtainPairView):
    serializer_class = EmailTokenSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginEmailRateThrottle, LoginIPRateThrottle]


class GoogleLoginAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Readiness probe. The browser can have a Google client id while the
        server has none, in which case every sign-in attempt 400s; this lets the
        UI hide the button rather than offer a control that cannot work."""
        return Response({"configured": bool(getattr(django_settings, "GOOGLE_CLIENT_ID", "").strip())})

    def post(self, request):
        serializer = GoogleLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)


class LogoutAPIView(APIView):
    # Intentionally open: the caller proves possession of the refresh token by
    # presenting it, and an expired access token must not block signing out.
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Đã đăng xuất khỏi thiết bị này."})


class PasswordResetRequestAPIView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.get_user()
        if user is not None:
            _, raw_token = PasswordResetToken.issue(user, requested_ip=_client_ip(request))
            # The link is never echoed in the response: with no SMTP provider
            # configured it goes to the server console instead (see emails.py).
            send_password_reset_email(user, raw_token)
        return Response({"detail": RESET_REQUEST_MESSAGE})


class PasswordResetConfirmAPIView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "detail": "Đã đặt lại mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.",
                **build_tokens_for_user(user),
            }
        )


class PasswordChangeAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # The old access token stays valid until it expires, so hand back a
        # fresh pair rather than leaving the caller signed in on stale claims.
        return Response({"detail": "Đã cập nhật mật khẩu.", **build_tokens_for_user(user)})


class MeAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request):
        serializer = AccountDeleteSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AccountDeletionPreviewAPIView(APIView):
    """Counts of everything that a deletion would take with it, so the
    confirmation dialog can name it instead of saying "and related data"."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response(
            {
                "diagnoses": user.diagnoses.count(),
                "farm_plots": user.farm_plots.count(),
                "cultivation_logs": user.cultivation_logs.count(),
                "traceability_records": user.traceability_records.count(),
                "farm_locations": user.farm_locations.count(),
                "crop_plans": user.crop_plans.count(),
                "chat_conversations": user.chat_conversations.count(),
                "payment_orders": user.payment_orders.count(),
                "confirm_phrase": AccountDeleteSerializer.CONFIRM_PHRASE,
            }
        )


class UserSettingAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, user):
        setting, _ = UserSetting.objects.get_or_create(user=user)
        return setting

    def get(self, request):
        settings_obj = self.get_object(request.user)
        return Response(UserSettingSerializer(settings_obj).data)

    def patch(self, request):
        settings_obj = self.get_object(request.user)
        serializer = UserSettingSerializer(settings_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
