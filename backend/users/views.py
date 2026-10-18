from django.conf import settings as django_settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.views import TokenRefreshView

from .emails import delivery_is_configured, send_password_reset_email, send_verification_email
from .models import EmailVerificationToken, PasswordResetToken, UserSetting
from .registration_security import (
    RegistrationUnavailable,
    _client_ip,
    finish_registration,
    reserve_registration,
    verify_turnstile,
)
from .serializers import (
    AccountDeleteSerializer,
    ActiveUserRefreshSerializer,
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
from .throttling import (
    GoogleLoginRateThrottle,
    LoginEmailRateThrottle,
    LoginIPRateThrottle,
    PasswordResetRateThrottle,
)

User = get_user_model()

# Deliberately identical whether or not the address is registered, so the
# endpoint cannot be used to enumerate accounts.
RESET_REQUEST_MESSAGE = (
    "Nếu địa chỉ email này có tài khoản Agromind AI, chúng tôi đã gửi liên kết đặt lại mật khẩu. "
    "Vui lòng kiểm tra hộp thư (kể cả mục spam)."
)

# Promising an email that cannot be sent is worse than saying the feature is off:
# the person waits for a message that will never arrive.
RESET_UNAVAILABLE_MESSAGE = (
    "Đặt lại mật khẩu qua email hiện chưa được bật. Nếu bạn còn đăng nhập được, "
    "hãy đổi mật khẩu trong trang Hồ sơ. Nếu không, vui lòng liên hệ quản trị viên để được hỗ trợ."
)


class RegisterAPIView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = []

    def create(self, request, *args, **kwargs):
        if not django_settings.PASSWORD_REGISTRATION_ENABLED:
            return Response(
                {"detail": "Đăng ký bằng email hiện không hỗ trợ. Vui lòng tiếp tục bằng Google."},
                status=status.HTTP_410_GONE,
            )
        if not delivery_is_configured():
            raise RegistrationUnavailable()
        email = str(request.data.get("email", ""))[:254].strip().lower()
        attempt = reserve_registration(request, email)
        try:
            verify_turnstile(request.data.get("turnstile_token", ""))
        except Exception:
            finish_registration(attempt, "challenge_failed")
            raise
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            finish_registration(attempt, "invalid_form")
            raise serializers.ValidationError(serializer.errors)
        email = serializer.validated_data["email"]
        try:
            with transaction.atomic():
                user = serializer.save()
                raw_token = EmailVerificationToken.issue(user)
                if not send_verification_email(user, raw_token):
                    raise RegistrationUnavailable()
        except Exception:
            finish_registration(attempt, "delivery_failed")
            raise
        finish_registration(attempt, "pending")
        return Response(
            {"detail": "Đã gửi liên kết xác minh. Vui lòng kiểm tra email để kích hoạt tài khoản."},
            status=status.HTTP_201_CREATED,
        )


class EmailVerificationAPIView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        raw = request.data.get("token", "")
        with transaction.atomic():
            token = EmailVerificationToken.from_raw(raw)
            if token is None:
                return Response({"detail": "Liên kết không hợp lệ hoặc đã hết hạn."}, status=400)
            token = EmailVerificationToken.objects.select_for_update().select_related("user").get(pk=token.pk)
            if not token.is_usable or token.user.email_verified_at is not None:
                return Response({"detail": "Liên kết không hợp lệ hoặc đã hết hạn."}, status=400)
            user = token.user
            user.email_verified_at = timezone.now()
            user.is_active = True
            user.save(update_fields=["email_verified_at", "is_active", "updated_at"])
            token.used_at = timezone.now()
            token.save(update_fields=["used_at"])
        return Response({"detail": "Email đã được xác minh. Bạn có thể đăng nhập."})


class EmailVerificationResendAPIView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        if not django_settings.PASSWORD_REGISTRATION_ENABLED:
            return Response(
                {"detail": "Đăng ký bằng email hiện không hỗ trợ. Vui lòng tiếp tục bằng Google."},
                status=status.HTTP_410_GONE,
            )
        if not delivery_is_configured():
            raise RegistrationUnavailable()
        email = str(request.data.get("email", "")).strip().lower()
        if not email or len(email) > 254:
            raise serializers.ValidationError({"email": "Email không hợp lệ."})
        attempt = reserve_registration(request, email)
        try:
            verify_turnstile(request.data.get("turnstile_token", ""))
        except Exception:
            finish_registration(attempt, "challenge_failed")
            raise
        try:
            user = User.objects.filter(email__iexact=email, is_active=False, email_verified_at__isnull=True).first()
            if user:
                with transaction.atomic():
                    raw_token = EmailVerificationToken.issue(user)
                    if not send_verification_email(user, raw_token):
                        raise RegistrationUnavailable()
        except Exception:
            finish_registration(attempt, "delivery_failed")
            raise
        finish_registration(attempt, "resend" if user else "ignored")
        return Response({"detail": "Nếu tài khoản đang chờ xác minh, chúng tôi đã gửi liên kết mới."})


class LoginAPIView(TokenObtainPairView):
    serializer_class = EmailTokenSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginEmailRateThrottle, LoginIPRateThrottle]


class ActiveUserTokenRefreshAPIView(TokenRefreshView):
    serializer_class = ActiveUserRefreshSerializer


class GoogleLoginAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get_throttles(self):
        # The public readiness probe is cacheable and cheap. Only POST verifies
        # a third-party credential and can create a local account.
        return [GoogleLoginRateThrottle()] if self.request.method == "POST" else []

    def get(self, request):
        """Readiness probe. The browser can have a Google client id while the
        server has none, in which case every sign-in attempt 400s; this lets the
        UI hide the button rather than offer a control that cannot work."""
        return Response({"configured": bool(getattr(django_settings, "GOOGLE_CLIENT_ID", "").strip())})

    def post(self, request):
        serializer = GoogleLoginSerializer(data=request.data, context={"request": request})
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

        # No provider means the link would only reach the server log, so issuing
        # a token would just burn the throttle and leave the user waiting.
        if not delivery_is_configured():
            return Response({"detail": RESET_UNAVAILABLE_MESSAGE, "delivery_enabled": False})

        user = serializer.get_user()
        if user is not None:
            # The link is never echoed in the response.
            _, raw_token = PasswordResetToken.issue(user, requested_ip=_client_ip(request))
            send_password_reset_email(user, raw_token)
        return Response({"detail": RESET_REQUEST_MESSAGE, "delivery_enabled": True})


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
