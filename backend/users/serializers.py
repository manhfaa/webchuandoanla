from django.contrib.auth import get_user_model
from django.conf import settings
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import UserSetting

User = get_user_model()


def build_tokens_for_user(user):
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

    class Meta:
        model = User
        fields = ("id", "email", "password")
        read_only_fields = ("id",)

    def validate_email(self, value):
        normalized_email = value.strip().lower()
        if User.objects.filter(email=normalized_email).exists():
            raise serializers.ValidationError("Email này đã được sử dụng.")
        return normalized_email

    def create(self, validated_data):
        password = validated_data.pop("password")
        email = validated_data["email"]
        user = User(
            username=build_unique_username(email),
            email=email,
            full_name="Người dùng AgromindAI",
        )
        user.set_password(password)
        user.save()
        UserSetting.objects.get_or_create(user=user)
        return user


class UserSerializer(serializers.ModelSerializer):
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
        )
        read_only_fields = ("id", "current_plan", "username")


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

        return build_tokens_for_user(user)


class GoogleLoginSerializer(serializers.Serializer):
    credential = serializers.CharField(write_only=True)

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

        user = User.objects.filter(email=email).first()
        if user is None:
            user = User(
                username=build_unique_username(email),
                email=email,
                full_name=full_name,
                avatar_url=avatar_url,
            )
            user.set_unusable_password()
            user.save()
            UserSetting.objects.get_or_create(user=user)
        else:
            changed = False
            if full_name and (not user.full_name or user.full_name in {"Người dùng Leafiq", "Người dùng AgromindAI"}):
                user.full_name = full_name
                changed = True
            if avatar_url and not user.avatar_url:
                user.avatar_url = avatar_url
                changed = True
            if changed:
                user.save(update_fields=["full_name", "avatar_url", "updated_at"])
            UserSetting.objects.get_or_create(user=user)

        return build_tokens_for_user(user)
