from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import generics, permissions, serializers as drf_serializers, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from aiproviders import ProviderFailed, ProviderNotConfigured
from diagnoses import idempotency
from diagnoses.models import ClientRequest, Diagnosis
from payments.entitlements import (
    PLAN_DISPLAY_NAMES,
    UNLIMITED,
    PlanLimitExceeded,
    enforce_limit,
    next_plan_slug,
    resolve_entitlements,
)

from .models import ChatConversation, ChatMessage, ExpertConsultation, ServicePlan, UserSubscription
from .services import chat as chat_service
from .serializers import (
    ChatConversationSerializer,
    ChatMessageSerializer,
    ExpertConsultationSerializer,
    ServicePlanSerializer,
    UserSubscriptionSerializer,
)

EXPERT_MODE = "expert"
ASSISTANT_ROLE = "assistant"

# Only the server-side respond endpoint may author assistant/expert messages.
# Trusting this client field lets a caller forge an AI answer in saved history
# and bypass the question quota entirely.
CLIENT_AUTHORED_ROLES = ("user",)


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


def _questions_sent_today(user, now):
    """How many questions the user has already asked since local midnight.

    Only ``user`` rows are counted: an assistant reply is the answer to a
    question that was already charged, so counting it would halve the cap the
    pricing page sells. The window is the local day (``settings.TIME_ZONE``)
    because the quota is sold to a Vietnamese grower as "câu/ngày", not per UTC
    day — otherwise the counter would reset at 7am for them.
    """
    day_start = timezone.localtime(now).replace(hour=0, minute=0, second=0, microsecond=0)
    return ChatMessage.objects.filter(
        conversation__user=user,
        role="user",
        created_at__gte=day_start,
        created_at__lte=now,
    ).count()


def _enforce_daily_chat_quota(user):
    """Raise 402 when today's chat quota is already used up.

    Every number in the message comes back from the catalogue through
    ``resolve_entitlements``; nothing about the cap is typed here, so changing a
    plan in the database changes both what is sold and what is enforced.
    """
    entitlements = resolve_entitlements(user)
    limit = entitlements["limits"]["daily_chat_messages"]
    if limit is UNLIMITED:
        # Bloom/Elite sell unlimited chat — skip the COUNT entirely.
        return

    now = timezone.now()
    used = _questions_sent_today(user, now)
    upgrade_to = next_plan_slug(entitlements["plan"])
    enforce_limit(
        user,
        "daily_chat_messages",
        used,
        message=(
            f"Gói {entitlements['plan_name']} cho phép {limit} câu hỏi mỗi ngày và bạn đã dùng hết "
            f"trong hôm nay. Nâng cấp lên gói {PLAN_DISPLAY_NAMES.get(upgrade_to, upgrade_to)} "
            "để hỏi thêm, hoặc chờ sang ngày mai."
        ),
        now=now,
    )


def _require_expert_chat(user):
    """Gate the advanced-advice workspace on the plan's ``expert_chat`` flag.

    Seed and Grow do not include it. The plan that unlocks it is looked up in the
    catalogue (``ServicePlan.Meta`` orders by price, so the first active row with
    the flag on is the cheapest way in) rather than named here, so moving the
    feature between plans stays a data change.

    This reuses ``PlanLimitExceeded`` so the client has a single 402 "cần nâng
    cấp" path for both quotas and locked features; ``code`` tells them apart.
    """
    entitlements = resolve_entitlements(user)
    if entitlements["features"]["expert_chat"]:
        return

    unlock = ServicePlan.objects.filter(is_active=True, expert_chat_enabled=True).first()
    upgrade_slug = unlock.slug if unlock else next_plan_slug(entitlements["plan"])
    upgrade_name = unlock.name if unlock else PLAN_DISPLAY_NAMES.get(upgrade_slug, upgrade_slug)
    raise PlanLimitExceeded(
        {
            "detail": (
                f"Tư vấn nông nghiệp nâng cao chưa có trong gói {entitlements['plan_name']}. "
                f"Nâng cấp lên gói {upgrade_name} để mở luồng tư vấn này."
            ),
            "code": "plan_feature_locked",
            "plan": entitlements["plan"],
            "feature": "expert_chat",
            "upgrade_to": upgrade_slug,
        }
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
        _require_own_related(serializer, self.request.user, "diagnosis")
        if serializer.validated_data.get("mode") == EXPERT_MODE:
            _require_expert_chat(self.request.user)
        serializer.save(user=self.request.user)


class ChatConversationDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ChatConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Deliberately unfiltered by plan: a user who paid for expert advice and
        # then lapsed keeps every conversation readable. The gate below is only
        # about switching a conversation into the paid workspace.
        return ChatConversation.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        _require_own_related(serializer, self.request.user, "diagnosis")
        if serializer.validated_data.get("mode") == EXPERT_MODE and serializer.instance.mode != EXPERT_MODE:
            # Without this, PATCH mode="expert" would be a free way around the
            # check on create.
            _require_expert_chat(self.request.user)
        serializer.save()


class ChatMessageListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ChatMessage.objects.filter(conversation__user=self.request.user)

    def perform_create(self, serializer):
        _require_own_related(serializer, self.request.user, "conversation")
        role = serializer.validated_data.get("role")
        if role not in CLIENT_AUTHORED_ROLES:
            raise drf_serializers.ValidationError(
                {"role": "Chỉ chấp nhận tin nhắn của bạn hoặc câu trả lời của trợ lý."}
            )
        conversation = serializer.validated_data.get("conversation")
        if conversation is not None and conversation.mode == EXPERT_MODE:
            # Checked first: "gói này chưa có tư vấn nâng cao" is the useful
            # message here, not "hết lượt hỏi hôm nay".
            _require_expert_chat(self.request.user)
        _enforce_daily_chat_quota(self.request.user)
        serializer.save()


class ChatRespondAPIView(APIView):
    """Ask a question and get the answer, in one request.

    The website did this in three: create the conversation over HTTP, post the
    message over HTTP, then call DeepSeek from Vercel. A phone on a field
    connection cannot afford three round trips that can each fail separately, and
    the provider key cannot live in the app, so the whole exchange happens here.

    Order matters and is not negotiable:

    1. Replay check. A retry of a question already answered returns that answer.
    2. Charge — the expert-workspace gate, then the daily cap, then the user's
       message row — inside one transaction. The question is recorded *before* a
       paid provider is touched, so a question the plan does not allow never
       reaches DeepSeek and never looks like it was answered.
    3. Call the provider outside that transaction, so a slow model does not hold
       a database row lock for 20 seconds.
    4. Save the answer.

    If step 3 fails, the charge from step 2 is remembered against
    `client_request_id`. Retrying with the same id reuses the question that was
    already paid for instead of spending a second one — the grower is charged for
    the question, once, and eventually gets an answer to it.
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "chat_respond"

    def post(self, request):
        query = str(request.data.get("query") or "").strip()
        if not query:
            return Response({"detail": "Vui lòng nhập câu hỏi."}, status=status.HTTP_400_BAD_REQUEST)
        if len(query) > int(getattr(settings, "MAX_CHAT_QUERY_CHARS", 4000)):
            return Response({"detail": "Câu hỏi quá dài."}, status=status.HTTP_400_BAD_REQUEST)

        mode = (
            chat_service.MODE_EXPERT
            if request.data.get("mode") == chat_service.MODE_EXPERT
            else chat_service.MODE_ASSISTANT
        )

        try:
            request_id = idempotency.normalize(request.data.get("client_request_id"), required=True)
        except idempotency.InvalidRequestId as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        remembered = idempotency.recall(request.user, ClientRequest.SCOPE_CHAT, request_id) or {}
        if remembered.get("answer"):
            return Response(remembered)

        # `expert` never sees a diagnosis, whatever the client sends. The chooser
        # screen tells the grower this workspace does not use their photos or
        # history, and that promise is kept here rather than in the app.
        diagnosis = None
        if mode == chat_service.MODE_ASSISTANT:
            diagnosis_id = request.data.get("diagnosis_id")
            if diagnosis_id not in (None, ""):
                diagnosis = Diagnosis.objects.filter(user=request.user, pk=diagnosis_id).first()
                if diagnosis is None:
                    return Response(
                        {"detail": "Không tìm thấy lần kiểm tra này."},
                        status=status.HTTP_404_NOT_FOUND,
                    )

        if remembered.get("status") == "charged":
            # A previous attempt paid for this question and the provider failed.
            # Pick the conversation back up; do not charge again.
            conversation = ChatConversation.objects.filter(
                user=request.user, pk=remembered.get("conversation_id")
            ).first()
            if conversation is None:
                remembered = {}

        if remembered.get("status") != "charged":
            # A 402 from here propagates untouched: the refusal, its Vietnamese
            # wording and the plan it points at are the catalogue's, and nothing
            # has been charged yet when it is raised.
            conversation = self._charge(request.user, mode, query, request, diagnosis)
            idempotency.remember(
                request.user,
                ClientRequest.SCOPE_CHAT,
                request_id,
                {"status": "charged", "conversation_id": conversation.pk},
            )

        try:
            answer = chat_service.answer(query=query, mode=mode, diagnosis=diagnosis)
        except ProviderNotConfigured as exc:
            return Response(
                {"detail": exc.message, "conversation_id": conversation.pk, "charged": True},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except ProviderFailed as exc:
            return Response(
                {"detail": exc.message, "conversation_id": conversation.pk, "charged": True},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        message = ChatMessage.objects.create(
            conversation=conversation,
            role=ASSISTANT_ROLE,
            content=answer,
            meta={"mode": mode, "client_request_id": request_id},
        )
        conversation.save(update_fields=["updated_at"])

        payload = {
            "mode": mode,
            "answer": answer,
            "conversation_id": conversation.pk,
            "message_id": message.pk,
            "generated_at": timezone.now().isoformat(),
        }
        idempotency.remember(request.user, ClientRequest.SCOPE_CHAT, request_id, payload)
        return Response(payload)

    @transaction.atomic
    def _charge(self, user, mode, query, request, diagnosis):
        """Gate, count and record the question. Returns the conversation it went into."""
        wanted_mode = chat_service.CONVERSATION_MODE[mode]
        conversation = None

        requested_id = request.data.get("conversation_id")
        if requested_id not in (None, ""):
            # Only reused when it is this account's *and* belongs to the
            # workspace being asked about. Without the mode check, a Seed account
            # could point an expert question at its own advisor conversation and
            # read the advanced-advice prompt for free.
            conversation = ChatConversation.objects.filter(
                user=user, pk=requested_id, mode=wanted_mode
            ).first()

        if conversation is None:
            if mode == chat_service.MODE_EXPERT:
                _require_expert_chat(user)
            conversation = ChatConversation.objects.create(
                user=user,
                mode=wanted_mode,
                title=query[:180],
                diagnosis=diagnosis,
            )
        elif mode == chat_service.MODE_EXPERT:
            _require_expert_chat(user)

        _enforce_daily_chat_quota(user)
        ChatMessage.objects.create(
            conversation=conversation,
            role="user",
            content=query,
            meta={"mode": mode},
        )
        return conversation


class ExpertConsultationListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ExpertConsultationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ExpertConsultation.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        _require_own_related(serializer, self.request.user, "conversation", "diagnosis")
        _require_expert_chat(self.request.user)
        serializer.save(user=self.request.user)


class ExpertConsultationDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ExpertConsultationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ExpertConsultation.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        _require_own_related(serializer, self.request.user, "conversation", "diagnosis")
        serializer.save()
