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
