from rest_framework import generics, permissions, serializers as drf_serializers

from .models import ChatConversation, ChatMessage, ExpertConsultation, ServicePlan, UserSubscription
from .serializers import (
    ChatConversationSerializer,
    ChatMessageSerializer,
    ExpertConsultationSerializer,
    ServicePlanSerializer,
    UserSubscriptionSerializer,
)


def _require_own_related(serializer, user, *field_names):
    """Reject writes that link a record to another user's object.

    DRF's ModelSerializer accepts any primary key for a writable relation, and
    filtering ``get_queryset`` only protects reads — so without this check a user
    could POST into someone else's conversation (IDOR). Raises a validation error
    rather than 403 so we don't reveal whether the id exists.
    """
    for field_name in field_names:
        related = serializer.validated_data.get(field_name)
        if related is None:
            continue
        owner_id = getattr(related, "user_id", None)
        if owner_id != user.id:
            raise drf_serializers.ValidationError({field_name: "Giá trị không hợp lệ."})


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
        _require_own_related(serializer, self.request.user, "diagnosis")
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
        _require_own_related(serializer, self.request.user, "conversation")
        serializer.save()


class ExpertConsultationListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ExpertConsultationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ExpertConsultation.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        _require_own_related(serializer, self.request.user, "conversation", "diagnosis")
        serializer.save(user=self.request.user)


class ExpertConsultationDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ExpertConsultationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ExpertConsultation.objects.filter(user=self.request.user)
