from django.urls import path

from .views import (
    ChatConversationDetailAPIView,
    ChatConversationListCreateAPIView,
    ChatMessageListCreateAPIView,
    ChatRespondAPIView,
    ExpertConsultationDetailAPIView,
    ExpertConsultationListCreateAPIView,
    ServicePlanListAPIView,
    UserSubscriptionListCreateAPIView,
)

urlpatterns = [
    path("plans/", ServicePlanListAPIView.as_view(), name="plan-list"),
    # Ask and answer in one call. `messages/` still exists for reading history
    # and for the website's older write path.
    path("chat/respond/", ChatRespondAPIView.as_view(), name="chat-respond"),
    path("subscriptions/", UserSubscriptionListCreateAPIView.as_view(), name="subscription-list-create"),
    path("conversations/", ChatConversationListCreateAPIView.as_view(), name="conversation-list-create"),
    path("conversations/<int:pk>/", ChatConversationDetailAPIView.as_view(), name="conversation-detail"),
    path("messages/", ChatMessageListCreateAPIView.as_view(), name="message-list-create"),
    path("expert-consultations/", ExpertConsultationListCreateAPIView.as_view(), name="expert-consultation-list-create"),
    path("expert-consultations/<int:pk>/", ExpertConsultationDetailAPIView.as_view(), name="expert-consultation-detail"),
]
