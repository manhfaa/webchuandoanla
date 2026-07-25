from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.functions import Lower


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
