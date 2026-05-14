from django.conf import settings
from django.db import models

from diagnoses.models import Diagnosis


class ServicePlan(models.Model):
    slug = models.SlugField(max_length=30, unique=True)
    name = models.CharField(max_length=80)
    description = models.TextField(blank=True, default="")
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default="VND")
    yolo_enabled = models.BooleanField(default=True)
    cnn_enabled = models.BooleanField(default=False)
    rag_enabled = models.BooleanField(default=False)
    expert_chat_enabled = models.BooleanField(default=False)
    max_diagnoses_per_month = models.PositiveIntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["price_monthly", "name"]

    def __str__(self) -> str:
        return self.name


class UserSubscription(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscriptions",
    )
    plan = models.ForeignKey(ServicePlan, on_delete=models.PROTECT, related_name="subscriptions")
    status = models.CharField(
        max_length=20,
        default="active",
        choices=(
            ("active", "Active"),
            ("trial", "Trial"),
            ("expired", "Expired"),
            ("cancelled", "Cancelled"),
        ),
    )
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField(null=True, blank=True)
    auto_renew = models.BooleanField(default=False)
    payment_provider = models.CharField(max_length=50, blank=True, default="manual")
    provider_subscription_id = models.CharField(max_length=120, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.user.username}::{self.plan.slug}"


class ChatConversation(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_conversations",
    )
    diagnosis = models.ForeignKey(
        Diagnosis,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="chat_conversations",
    )
    mode = models.CharField(
        max_length=20,
        choices=(
            ("rag", "RAG"),
            ("advisor", "Advisor"),
            ("expert", "Expert"),
        ),
        default="rag",
    )
    title = models.CharField(max_length=180, blank=True, default="")
    summary = models.TextField(blank=True, default="")
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"{self.user.username}::{self.mode}"


class ChatMessage(models.Model):
    conversation = models.ForeignKey(
        ChatConversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    role = models.CharField(
        max_length=20,
        choices=(
            ("system", "System"),
            ("user", "User"),
            ("assistant", "Assistant"),
            ("expert", "Expert"),
        ),
    )
    content = models.TextField()
    citations = models.JSONField(default=list, blank=True)
    meta = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.conversation_id}::{self.role}"


class ExpertConsultation(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="expert_consultations",
    )
    diagnosis = models.ForeignKey(
        Diagnosis,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="expert_consultations",
    )
    conversation = models.OneToOneField(
        ChatConversation,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="expert_consultation",
    )
    topic = models.CharField(max_length=180)
    question = models.TextField()
    status = models.CharField(
        max_length=20,
        default="open",
        choices=(
            ("open", "Open"),
            ("assigned", "Assigned"),
            ("answered", "Answered"),
            ("closed", "Closed"),
        ),
    )
    expert_name = models.CharField(max_length=120, blank=True, default="")
    expert_reply = models.TextField(blank=True, default="")
    priority = models.CharField(max_length=20, default="normal")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.user.username}::{self.topic}"
