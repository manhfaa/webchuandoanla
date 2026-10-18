import hashlib
import secrets
from datetime import timedelta

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone

# Bumped whenever the terms/privacy documents change materially, so an existing
# consent record can be told apart from consent to the current wording. Keep in
# step with LEGAL_UPDATED in src/data/legal-content.ts.
TERMS_VERSION = "2026-07-25"

# Short enough that a leaked mailbox is not a standing key to the account.
PASSWORD_RESET_TOKEN_TTL = timedelta(hours=2)
EMAIL_VERIFICATION_TOKEN_TTL = timedelta(hours=24)
WEB_ACCESS_TTL = timedelta(minutes=30)
WEB_REFRESH_TTL = timedelta(days=7)


class User(AbstractUser):
    full_name = models.CharField(max_length=120, blank=True, default="Người dùng AgromindAI")
    phone = models.CharField(max_length=30, blank=True)
    avatar_url = models.URLField(blank=True, default="")
    company_name = models.CharField(max_length=150, blank=True)
    farm_name = models.CharField(max_length=150, blank=True)
    location = models.CharField(max_length=150, blank=True)
    current_plan = models.CharField(
        max_length=10,
        default="seed",
        choices=(
            ("seed", "Seed"),
            ("grow", "Grow"),
            ("bloom", "Bloom"),
            ("elite", "Elite"),
        ),
    )
    plan_expires_at = models.DateTimeField(null=True, blank=True)
    # Consent used to live only in the browser, so there was no record of who
    # agreed to what. Null means the account predates server-side recording.
    terms_accepted_at = models.DateTimeField(null=True, blank=True)
    terms_version = models.CharField(max_length=32, blank=True, default="")
    email_verified_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta(AbstractUser.Meta):
        constraints = [
            # Email is the login identifier but AbstractUser does not make it
            # unique, so only application code prevented duplicates. Enforce it
            # in the database too. Lower() matches how login/registration
            # normalise the address, and accounts with no email are excluded so
            # the constraint cannot collide on empty strings.
            models.UniqueConstraint(
                Lower("email"),
                condition=~models.Q(email=""),
                name="unique_user_email_ci",
            ),
        ]

    def __str__(self) -> str:
        return self.username

    def record_terms_consent(self, *, version: str = TERMS_VERSION) -> None:
        self.terms_accepted_at = timezone.now()
        self.terms_version = version


class PasswordResetToken(models.Model):
    """One-time token behind the forgot-password flow.

    Only the SHA-256 digest is stored: a database leak then yields nothing that
    can be replayed against the reset endpoint.
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="password_reset_tokens")
    token_hash = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    requested_ip = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"PasswordResetToken<{self.user_id}>"

    @staticmethod
    def hash_token(raw_token: str) -> str:
        return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    @classmethod
    def issue(cls, user, *, requested_ip: str | None = None) -> tuple["PasswordResetToken", str]:
        """Invalidate any outstanding token for this user, then mint a new one.

        Returns the row plus the raw token, which is the only moment the raw
        value exists — it goes into the email and is never stored.
        """
        now = timezone.now()
        cls.objects.filter(user=user, used_at__isnull=True).update(used_at=now)
        raw_token = secrets.token_urlsafe(32)
        instance = cls.objects.create(
            user=user,
            token_hash=cls.hash_token(raw_token),
            expires_at=now + PASSWORD_RESET_TOKEN_TTL,
            requested_ip=requested_ip or None,
        )
        return instance, raw_token

    @property
    def is_usable(self) -> bool:
        return self.used_at is None and self.expires_at > timezone.now()

    def consume(self) -> None:
        self.used_at = timezone.now()
        self.save(update_fields=["used_at"])


class EmailVerificationToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="email_verification_tokens")
    token_hash = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    @classmethod
    def issue(cls, user) -> str:
        now = timezone.now()
        cls.objects.filter(user=user, used_at__isnull=True).update(used_at=now)
        raw = secrets.token_urlsafe(32)
        cls.objects.create(
            user=user,
            token_hash=hashlib.sha256(raw.encode()).hexdigest(),
            expires_at=now + EMAIL_VERIFICATION_TOKEN_TTL,
        )
        return raw

    @classmethod
    def from_raw(cls, raw: str):
        if not isinstance(raw, str) or not raw or len(raw) > 256:
            return None
        return cls.objects.select_related("user").filter(
            token_hash=hashlib.sha256(raw.encode()).hexdigest(),
        ).first()

    @property
    def is_usable(self) -> bool:
        return self.used_at is None and self.expires_at > timezone.now()


class RegistrationAttempt(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    ip_hash = models.CharField(max_length=64, db_index=True)
    agent_hash = models.CharField(max_length=64, db_index=True)
    email_pattern_hash = models.CharField(max_length=64, db_index=True)
    outcome = models.CharField(max_length=24)

    class Meta:
        indexes = [
            models.Index(fields=["ip_hash", "created_at"]),
            models.Index(fields=["agent_hash", "created_at"]),
            models.Index(fields=["email_pattern_hash", "created_at"]),
        ]


class WebSession(models.Model):
    """Opaque browser credentials; only digests are persisted in the database."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="web_sessions")
    access_hash = models.CharField(max_length=64, unique=True)
    refresh_hash = models.CharField(max_length=64, unique=True)
    access_expires_at = models.DateTimeField()
    refresh_expires_at = models.DateTimeField(db_index=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @staticmethod
    def hash_token(raw: str) -> str:
        return hashlib.sha256(raw.encode("ascii")).hexdigest()

    @classmethod
    def issue(cls, user):
        now = timezone.now()
        access, refresh = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        cls.objects.create(
            user=user,
            access_hash=cls.hash_token(access),
            refresh_hash=cls.hash_token(refresh),
            access_expires_at=now + WEB_ACCESS_TTL,
            refresh_expires_at=now + WEB_REFRESH_TTL,
        )
        return {"access": access, "refresh": refresh}

    @classmethod
    def from_access(cls, raw: str):
        if not isinstance(raw, str) or len(raw) != 43:
            return None
        now = timezone.now()
        return cls.objects.select_related("user").filter(
            access_hash=cls.hash_token(raw),
            access_expires_at__gt=now,
            refresh_expires_at__gt=now,
            revoked_at__isnull=True,
        ).first()


class UserSetting(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="settings")
    theme = models.CharField(max_length=20, default="light")
    language = models.CharField(max_length=20, default="vi")
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=True)
    diagnosis_auto_save = models.BooleanField(default=True)
    marketing_opt_in = models.BooleanField(default=False)
    expert_chat_enabled = models.BooleanField(default=True)
    timezone = models.CharField(max_length=50, default="Asia/Ho_Chi_Minh")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Settings<{self.user.username}>"
