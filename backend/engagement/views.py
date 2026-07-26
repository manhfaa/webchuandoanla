from django.utils import timezone
from rest_framework import generics, permissions, serializers as drf_serializers

from payments.entitlements import (
    PLAN_DISPLAY_NAMES,
    UNLIMITED,
    PlanLimitExceeded,
    enforce_limit,
    next_plan_slug,
    resolve_entitlements,
)

from .models import ChatConversation, ChatMessage, ExpertConsultation, ServicePlan, UserSubscription
from .serializers import (
    ChatConversationSerializer,
    ChatMessageSerializer,
    ExpertConsultationSerializer,
    ServicePlanSerializer,
    UserSubscriptionSerializer,
)

EXPERT_MODE = "expert"

ASSISTANT_ROLE = "assistant"
# The client writes both sides of a conversation, so ``role`` is user input, not
# a fact about who spoke. "system" is the model prompt and "expert" is a
# specialist's answer — neither is the client's to author, and accepting them let
# a caller re-label a question as something the daily quota does not count and
# the expert gate does not look at.
CLIENT_AUTHORED_ROLES = ("user", ASSISTANT_ROLE)


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
        # Quota and feature gates apply to asking something new. Persisting the
        # assistant's reply must never fail, or a question the user was allowed
        # to ask would end up with no answer stored against it — that reply is
        # the one free row, and it is free because the question that earned it
        # was already charged. Anything else the client sends is charged, and a
        # role it may not author was already refused above rather than let
        # through uncharged.
        if role != ASSISTANT_ROLE:
            conversation = serializer.validated_data.get("conversation")
            if conversation is not None and conversation.mode == EXPERT_MODE:
                # Checked first: "gói này chưa có tư vấn nâng cao" is the useful
                # message here, not "hết lượt hỏi hôm nay".
                _require_expert_chat(self.request.user)
            _enforce_daily_chat_quota(self.request.user)
        serializer.save()


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
