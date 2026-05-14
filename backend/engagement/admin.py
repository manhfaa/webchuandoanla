from django.contrib import admin

from .models import (
    ChatConversation,
    ChatMessage,
    ExpertConsultation,
    ServicePlan,
    UserSubscription,
)


@admin.register(ServicePlan)
class ServicePlanAdmin(admin.ModelAdmin):
    list_display = ("id", "slug", "name", "price_monthly", "yolo_enabled", "cnn_enabled", "rag_enabled", "expert_chat_enabled", "is_active")
    search_fields = ("slug", "name")


@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "plan", "status", "starts_at", "ends_at", "auto_renew")
    search_fields = ("user__username", "user__email", "provider_subscription_id")
    list_filter = ("status", "auto_renew", "plan__slug")


@admin.register(ChatConversation)
class ChatConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "mode", "title", "is_archived", "updated_at")
    search_fields = ("user__username", "user__email", "title", "summary")
    list_filter = ("mode", "is_archived")


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "role", "created_at")
    search_fields = ("content", "conversation__title", "conversation__user__username")
    list_filter = ("role",)


@admin.register(ExpertConsultation)
class ExpertConsultationAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "topic", "status", "expert_name", "priority", "created_at")
    search_fields = ("topic", "question", "expert_name", "user__username", "user__email")
    list_filter = ("status", "priority")
