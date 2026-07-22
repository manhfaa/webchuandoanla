from rest_framework import generics, permissions

from .models import ChatConversation, ChatMessage, ExpertConsultation, ServicePlan, UserSubscription
from .serializers import (
    ChatConversationSerializer,
    ChatMessageSerializer,
    ExpertConsultationSerializer,
    ServicePlanSerializer,
    UserSubscriptionSerializer,
)


class ServicePlanListAPIView(generics.ListAPIView):
    queryset = ServicePlan.objects.filter(is_active=True)
    serializer_class = ServicePlanSerializer
    permission_classes = [permissions.AllowAny]


class UserSubscriptionListCreateAPIView(generics.ListAPIView):
    serializer_class = UserSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserSubscription.objects.filter(user=self.request.user)


class ChatConversationListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ChatConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ChatConversation.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ChatConversationDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ChatConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ChatConversation.objects.filter(user=self.request.user)


class ChatMessageListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ChatMessage.objects.filter(conversation__user=self.request.user)

    def perform_create(self, serializer):
        serializer.save()


class ExpertConsultationListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ExpertConsultationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ExpertConsultation.objects.filter(user=self.request.user)
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ExpertConsultationDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ExpertConsultationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ExpertConsultation.objects.filter(user=self.request.user)
