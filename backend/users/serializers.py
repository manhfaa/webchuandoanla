from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password as run_password_validators
from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from payments.services import expire_user_plan

from .models import PasswordResetToken, UserSetting

User = get_user_model()


def validate_new_password(value, user=None):
    """Run Django's configured password validators and re-raise as DRF errors."""
    try:
        run_password_validators(value, user=user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError(list(exc.messages))
    return value


def revoke_all_refresh_tokens(user):
    """End every other session after a password change or reset.

    Without this, someone who already holds a refresh token — the exact reason
    the owner is resetting — keeps access for up to seven more days.
    """
    for outstanding in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=outstanding)


def build_tokens_for_user(user):
    expire_user_plan(user)
    refresh = RefreshToken.for_user(user)
    refresh["username"] = user.username
    refresh["email"] = user.email
    refresh["plan"] = user.current_plan

    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


def build_unique_username(email: str) -> str:
    local_part = email.split("@", 1)[0].strip().lower() or "user"
    candidate = "".join(ch if ch.isalnum() or ch in {"_", "."} else "_" for ch in local_part)[:120]
    if not candidate:
        candidate = "user"

    unique_candidate = candidate
    suffix = 1
    while User.objects.filter(username=unique_candidate).exists():
        unique_candidate = f"{candidate}_{suffix}"
        suffix += 1
    return unique_candidate


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    email = serializers.EmailField()
    # Consent was previously a browser-only checkbox, so nothing stopped a
    # direct POST from creating an account with no agreement on record.
    accepted_terms = serializers.BooleanField(write_only=True)

    class Meta:
        model = User
        fields = ("id", "email", "password", "accepted_terms")
        read_only_fields = ("id",)

    def validate_password(self, value):
        # Enforce Django's configured password validators (min length, common
        # password, numeric-only, user-attribute similarity) so a weak password
        # like "12345678" is rejected server-side, not just in the UI.
        return validate_new_password(value)

    def validate_email(self, value):
        normalized_email = value.strip().lower()
        if User.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError("Email này đã được sử dụng.")
        return normalized_email

    def validate_accepted_terms(self, value):
        if not value:
            raise serializers.ValidationError(
                "Bạn cần đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư để tạo tài khoản."
            )
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        validated_data.pop("accepted_terms", None)
        email = validated_data["email"]
        user = User(
            username=build_unique_username(email),
            email=email,
            full_name="Người dùng AgromindAI",
        )
        user.set_password(password)
        user.record_terms_consent()
        user.save()
        UserSetting.objects.get_or_create(user=user)
        return user


class UserSerializer(serializers.ModelSerializer):
    # Google-only accounts have no password to re-enter, so the profile page has
    # to know whether to ask for the current one before changing it.
    has_usable_password = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "full_name",
            "phone",
            "avatar_url",
            "company_name",
            "farm_name",
            "location",
            "current_plan",
            "plan_expires_at",
            "terms_accepted_at",
            "terms_version",
            "has_usable_password",
        )
        read_only_fields = (
            "id",
            "current_plan",
            "username",
            "plan_expires_at",
            "terms_accepted_at",
            "terms_version",
        )

    def get_has_usable_password(self, obj) -> bool:
        return obj.has_usable_password()

    def validate_email(self, value):
        """Login looks the account up by lowercased email, so an address stored
        with different casing — or blanked entirely — locks the owner out. The
        database also enforces a case-insensitive unique index, so a collision
        has to be reported as a 400 here instead of surfacing as an
        IntegrityError 500 further down."""
        normalized_email = (value or "").strip().lower()
        if not normalized_email:
            raise serializers.ValidationError(
                "Email không được để trống, vì đây là thông tin dùng để đăng nhập."
            )
        taken = User.objects.filter(email__iexact=normalized_email)
        if self.instance is not None:
            taken = taken.exclude(pk=self.instance.pk)
        if taken.exists():
            raise serializers.ValidationError("Email này đã được sử dụng cho tài khoản khác.")
        return normalized_email


class UserSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSetting
        fields = (
            "theme",
            "language",
            "email_notifications",
            "push_notifications",
            "diagnosis_auto_save",
            "marketing_opt_in",
            "expert_chat_enabled",
            "timezone",
            "updated_at",
        )
        read_only_fields = ("updated_at",)


class EmailTokenSerializer(serializers.Serializer):
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get("email", "").strip().lower()
        password = attrs.get("password", "")

        user = None
        for candidate in User.objects.filter(email=email):
            if candidate.check_password(password):
                user = candidate
                break

        if not user:
            raise serializers.ValidationError("Email hoặc mật khẩu không đúng.")

        # Django's ModelBackend refuses inactive users; this serializer checks the
        # password directly, so it has to enforce the same rule or a disabled
        # account could still mint a valid JWT pair.
        if not user.is_active:
            raise serializers.ValidationError("Tài khoản này đã bị vô hiệu hóa.")

        return build_tokens_for_user(user)


class GoogleLoginSerializer(serializers.Serializer):
    credential = serializers.CharField(write_only=True)
    # Only consulted when the Google identity has no account yet: that request
    # is a registration, and registrations need recorded consent.
    accepted_terms = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        client_id = getattr(settings, "GOOGLE_CLIENT_ID", "").strip()
        if not client_id:
            raise serializers.ValidationError("Chưa cấu hình đăng nhập Google trên máy chủ.")

        credential = attrs.get("credential", "").strip()
        if not credential:
            raise serializers.ValidationError("Thiếu mã xác thực Google.")

        try:
            google_payload = id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                client_id,
            )
        except ValueError:
            raise serializers.ValidationError("Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn.")

        email = str(google_payload.get("email", "")).strip().lower()
        email_verified = bool(google_payload.get("email_verified"))
        if not email or not email_verified:
            raise serializers.ValidationError("Tài khoản Google chưa xác minh email.")

        full_name = str(google_payload.get("name", "")).strip() or "Người dùng AgromindAI"
        avatar_url = str(google_payload.get("picture", "")).strip()

        user = User.objects.filter(email__iexact=email).first()
        if user is not None and not user.is_active:
            raise serializers.ValidationError("Tài khoản này đã bị vô hiệu hóa.")
        if user is None:
            # Keyed on the field so the browser can tell "needs consent" apart
            # from a genuine Google failure and show the checkbox instead.
            if not attrs.get("accepted_terms"):
                raise serializers.ValidationError(
                    {
                        "accepted_terms": (
                            "Đây là lần đầu bạn dùng Google cho Agromind AI. Vui lòng đồng ý "
                            "Điều khoản sử dụng và Chính sách quyền riêng tư để tạo tài khoản."
                        )
                    }
                )
            user = User(
                username=build_unique_username(email),
                email=email,
                full_name=full_name,
                avatar_url=avatar_url,
            )
            user.set_unusable_password()
            user.record_terms_consent()
            user.save()
            UserSetting.objects.get_or_create(user=user)
        else:
            update_fields = []
            if full_name and (not user.full_name or user.full_name in {"Người dùng Leafiq", "Người dùng AgromindAI"}):
                user.full_name = full_name
                update_fields.append("full_name")
            if avatar_url and not user.avatar_url:
                user.avatar_url = avatar_url
                update_fields.append("avatar_url")
            # Accounts created before consent was recorded keep working, but the
            # agreement is captured the first time they tick the box.
            if attrs.get("accepted_terms") and not user.terms_accepted_at:
                user.record_terms_consent()
                update_fields += ["terms_accepted_at", "terms_version"]
            if update_fields:
                user.save(update_fields=[*update_fields, "updated_at"])
            UserSetting.objects.get_or_create(user=user)

        return build_tokens_for_user(user)


class LogoutSerializer(serializers.Serializer):
    """Signing out used to be a purely local state reset, leaving the refresh
    token usable for its full 7-day lifetime. Blacklisting it here makes the
    logout real, including on a shared or borrowed device."""

    refresh = serializers.CharField(write_only=True)

    def validate_refresh(self, value):
        try:
            self.token = RefreshToken(value)
        except TokenError:
            raise serializers.ValidationError("Phiên đăng nhập đã hết hạn hoặc không hợp lệ.")
        return value

    def save(self, **kwargs):
        try:
            self.token.blacklist()
        except TokenError:
            # Already blacklisted — the caller's intent is satisfied either way.
            pass
        return self.token


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        user = self.context["request"].user
        # A Google-only account has no usable password, so there is nothing to
        # re-enter; this is the path where it sets one for email sign-in.
        if user.has_usable_password():
            current_password = attrs.get("current_password") or ""
            if not current_password:
                raise serializers.ValidationError({"current_password": "Vui lòng nhập mật khẩu hiện tại."})
            if not user.check_password(current_password):
                raise serializers.ValidationError({"current_password": "Mật khẩu hiện tại không đúng."})
            if current_password == attrs["new_password"]:
                raise serializers.ValidationError(
                    {"new_password": "Mật khẩu mới phải khác mật khẩu hiện tại."}
                )
        validate_new_password(attrs["new_password"], user=user)
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password", "updated_at"])
        revoke_all_refresh_tokens(user)
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(write_only=True)

    def validate_email(self, value):
        return value.strip().lower()

    def get_user(self):
        """Returns the matching active account, or None.

        The view answers identically either way so the endpoint cannot be used
        to find out which addresses are registered.
        """
        return User.objects.filter(email__iexact=self.validated_data["email"], is_active=True).first()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        token_row = PasswordResetToken.objects.filter(
            token_hash=PasswordResetToken.hash_token(attrs["token"])
        ).select_related("user").first()
        if token_row is None or not token_row.is_usable:
            raise serializers.ValidationError(
                {"token": "Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được dùng. Vui lòng yêu cầu liên kết mới."}
            )
        if not token_row.user.is_active:
            raise serializers.ValidationError({"token": "Tài khoản này đã bị vô hiệu hóa."})

        validate_new_password(attrs["new_password"], user=token_row.user)
        attrs["token_row"] = token_row
        return attrs

    def save(self, **kwargs):
        token_row = self.validated_data["token_row"]
        user = token_row.user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password", "updated_at"])
        token_row.consume()
        revoke_all_refresh_tokens(user)
        return user


class AccountDeleteSerializer(serializers.Serializer):
    """Deletion is irreversible and cascades across every app, so it asks for
    the password (when there is one) plus a typed confirmation phrase."""

    CONFIRM_PHRASE = "XÓA TÀI KHOẢN"

    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    confirm_text = serializers.CharField(write_only=True)

    def validate_confirm_text(self, value):
        if value.strip().upper() != self.CONFIRM_PHRASE:
            raise serializers.ValidationError(f'Vui lòng nhập chính xác "{self.CONFIRM_PHRASE}" để xác nhận.')
        return value

    def validate(self, attrs):
        user = self.context["request"].user
        if user.has_usable_password():
            if not user.check_password(attrs.get("password") or ""):
                raise serializers.ValidationError({"password": "Mật khẩu không đúng."})
        return attrs
