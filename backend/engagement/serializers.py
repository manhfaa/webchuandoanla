from rest_framework import serializers

from .models import (
    ChatConversation,
    ChatMessage,
    ExpertConsultation,
    ServicePlan,
    UserSubscription,
)


class ServicePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServicePlan
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")


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
