from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ChatConversation, ChatMessage, ExpertConsultation, ServicePlan, UserSubscription
from .serializers import (
    ChatConversationSerializer,
    ChatMessageSerializer,
    ExpertConsultationSerializer,
    ServicePlanSerializer,
    UserSubscriptionSerializer,
    VerifyTransferSerializer,
)


class ServicePlanListAPIView(generics.ListAPIView):
    queryset = ServicePlan.objects.filter(is_active=True)
    serializer_class = ServicePlanSerializer
    permission_classes = [permissions.AllowAny]


class UserSubscriptionListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = UserSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserSubscription.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


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


class VerifyTransferAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    PLAN_AMOUNTS = {
        "grow": 9000,
        "bloom": 39000,
        "elite": 99000,
    }

    def post(self, request):
        serializer = VerifyTransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        plan = data["plan"]
        amount = data["amount"]
        transfer_code = data["transfer_code"].strip().upper()
        expected_amount = self.PLAN_AMOUNTS[plan]

        if amount != expected_amount:
            return Response(
                {
                    "status": "pending",
                    "is_paid": False,
                    "message": f"Số tiền không khớp. Vui lòng chuyển đúng {expected_amount} VND.",
                    "contact": {
                        "name": data["contact_name"],
                        "email": data["contact_email"],
                        "phone": data["contact_phone"],
                    },
                },
                status=status.HTTP_200_OK,
            )

        # Mock signal for local testing: include "PAID" in transfer code.
        is_paid = "PAID" in transfer_code
        if not is_paid:
            return Response(
                {
                    "status": "pending",
                    "is_paid": False,
                    "message": "Chua nhan duoc tien. He thong se tiep tuc doi soat.",
                    "contact": {
                        "name": data["contact_name"],
                        "email": data["contact_email"],
                        "phone": data["contact_phone"],
                    },
                },
                status=status.HTTP_200_OK,
            )

        user = request.user
        user.current_plan = plan
        user.save(update_fields=["current_plan", "updated_at"])

        service_plan = ServicePlan.objects.filter(slug=plan, is_active=True).first()
        if service_plan:
            UserSubscription.objects.create(
                user=user,
                plan=service_plan,
                status="active",
                starts_at=timezone.now(),
                auto_renew=False,
                payment_provider="manual_bank_transfer",
                provider_subscription_id=f'{data["transfer_code"]}|{data["contact_email"]}',
            )

        return Response(
            {
                "status": "paid",
                "is_paid": True,
                "message": "Da nhan tien va nang cap goi thanh cong.",
                "current_plan": user.current_plan,
                "contact": {
                    "name": data["contact_name"],
                    "email": data["contact_email"],
                    "phone": data["contact_phone"],
                },
            },
            status=status.HTTP_200_OK,
        )
