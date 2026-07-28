from django.conf import settings
from rest_framework import serializers

from .models import (
    ChatConversation,
    ChatMessage,
    ExpertConsultation,
    ServicePlan,
    UserSubscription,
)


class ServicePlanSerializer(serializers.ModelSerializer):
    # How many days one purchase actually buys. `_activate_locked_order` reads
    # `SEPAY_SUBSCRIPTION_DAYS` and writes the result to `plan_expires_at`, so
    # publishing the same setting here is what lets the pricing screens say
    # "90 ngày" during a promotion without anyone editing copy — and stop
    # saying it the moment the setting goes back to 30. A hardcoded duration in
    # the frontend would keep advertising a term the backend no longer grants.
    subscription_days = serializers.SerializerMethodField()

    class Meta:
        model = ServicePlan
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")

    def get_subscription_days(self, _plan) -> int:
        return max(1, int(getattr(settings, "SEPAY_SUBSCRIPTION_DAYS", 30)))


class UserSubscriptionSerializer(serializers.ModelSerializer):
    plan = ServicePlanSerializer(read_only=True)
    plan_id = serializers.PrimaryKeyRelatedField(
        source="plan",
        queryset=ServicePlan.objects.all(),
        write_only=True,
    )

    class Meta:
        model = UserSubscription
        fields = (
            "id",
            "plan",
            "plan_id",
            "status",
            "starts_at",
            "ends_at",
            "auto_renew",
            "payment_provider",
            "provider_subscription_id",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ("id", "conversation", "role", "content", "citations", "meta", "created_at")
        read_only_fields = ("id", "created_at")


class ChatConversationSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta:
        model = ChatConversation
        fields = (
            "id",
            "diagnosis",
            "mode",
            "title",
            "summary",
            "is_archived",
            "messages",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class ExpertConsultationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpertConsultation
        fields = (
            "id",
            "diagnosis",
            "conversation",
            "topic",
            "question",
            "status",
            "expert_name",
            "expert_reply",
            "priority",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
