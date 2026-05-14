from django.urls import path

from .views import (
    ChatConversationDetailAPIView,
    ChatConversationListCreateAPIView,
    ChatMessageListCreateAPIView,
    ExpertConsultationDetailAPIView,
    ExpertConsultationListCreateAPIView,
    ServicePlanListAPIView,
    UserSubscriptionListCreateAPIView,
    VerifyTransferAPIView,
)

urlpatterns = [
    path("plans/", ServicePlanListAPIView.as_view(), name="plan-list"),
    path("subscriptions/", UserSubscriptionListCreateAPIView.as_view(), name="subscription-list-create"),
    path("conversations/", ChatConversationListCreateAPIView.as_view(), name="conversation-list-create"),
    path("conversations/<int:pk>/", ChatConversationDetailAPIView.as_view(), name="conversation-detail"),
    path("messages/", ChatMessageListCreateAPIView.as_view(), name="message-list-create"),
    path("expert-consultations/", ExpertConsultationListCreateAPIView.as_view(), name="expert-consultation-list-create"),
    path("expert-consultations/<int:pk>/", ExpertConsultationDetailAPIView.as_view(), name="expert-consultation-detail"),
    path("verify-transfer/", VerifyTransferAPIView.as_view(), name="verify-transfer"),
]
