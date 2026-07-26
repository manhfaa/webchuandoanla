from django.db.models import Count
from django.db.models.deletion import ProtectedError
from django.utils import timezone
from rest_framework import generics, permissions, response, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView

# The crop-plan cap is sold on the pricing page and resolved from the billing
# catalogue, so it is never re-typed here: a number written twice drifts.
from payments.entitlements import (
    PLAN_DISPLAY_NAMES,
    enforce_limit,
    next_plan_slug,
    resolve_entitlements,
)

from .models import Crop, CropLocation, CropPlan, CropPlanStep, Reminder
from .serializers import (
    CreateCropPlanSerializer,
    CropLocationSerializer,
    CropPlanListSerializer,
    CropPlanSerializer,
    CropSerializer,
    ReminderReadSerializer,
    ReminderSerializer,
    StepCompleteSerializer,
    StepDelaySerializer,
    StepNoteSerializer,
    StepReopenSerializer,
)
from .services.planner import (
    build_context_from_request,
    create_plan_from_payload,
    delay_step,
    generate_plan_payload,
    mark_step_complete,
    refresh_plan_weather,
    regenerate_plan,
    reopen_step,
)


class CropPlanPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


class ReminderPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


def _crop_plan_quota_message(entitlements, used: int, *, restoring: bool = False) -> str | None:
    """Vietnamese copy for the 402, naming the cap and the plan that lifts it.

    Every number and plan name comes from the resolved entitlements, so the
    message can never contradict the cap that is actually enforced.
    """
    limit = entitlements["limits"].get("crop_plans")
    if limit is None:
        return None

    plan_name = entitlements["plan_name"]
    upgrade_slug = next_plan_slug(entitlements["plan"])
    upgrade_name = PLAN_DISPLAY_NAMES.get(upgrade_slug, upgrade_slug.title())

    if restoring:
        # The plan being restored is untouched and still readable in the
        # archive; the refusal is only about the tracked list, and the copy has
        # to say so or it reads as "my plan is gone".
        if limit == 0:
            return (
                f"Gói {plan_name} chưa bao gồm tính năng kế hoạch trồng cây nên chưa thể đưa "
                f"kế hoạch này trở lại danh sách đang theo dõi. Kế hoạch vẫn được giữ nguyên "
                f"trong mục đã lưu trữ và bạn vẫn xem được đầy đủ. "
                f"Hãy nâng cấp lên gói {upgrade_name} để theo dõi lại."
            )
        return (
            f"Gói {plan_name} cho phép tối đa {limit} kế hoạch đang theo dõi, bạn đang có {used}. "
            f"Kế hoạch này vẫn được giữ nguyên trong mục đã lưu trữ. "
            f"Hãy lưu trữ một kế hoạch khác để trống chỗ, "
            f"hoặc nâng cấp lên gói {upgrade_name} để theo dõi lại."
        )

    if limit == 0:
        message = (
            f"Gói {plan_name} chưa bao gồm tính năng kế hoạch trồng cây. "
            f"Vui lòng nâng cấp lên gói {upgrade_name} để tạo kế hoạch."
        )
        if used:
            # These plans predate the cap. Say plainly that nothing was taken
            # away, otherwise a refusal reads as "my data was deleted".
            message += (
                f" {used} kế hoạch bạn đã tạo trước đó vẫn được giữ nguyên và dùng bình thường."
            )
        return message

    return (
        f"Gói {plan_name} cho phép tối đa {limit} kế hoạch đang theo dõi, bạn đang có {used}. "
        f"Hãy lưu trữ một kế hoạch đã xong để trống chỗ, "
        f"hoặc nâng cấp lên gói {upgrade_name} để tạo thêm."
    )


def _enforce_crop_plan_quota(user, *, exclude_pk: int | None = None, restoring: bool = False) -> None:
    """Refuse (HTTP 402) an action that would put the grower over the plan cap.

    What fills a slot is the set this app lists by default: every plan that is
    not archived. Archiving is the grower's own reversible way to close a
    finished season and it frees a slot — which is exactly why *every* way back
    into that set has to be counted, not just creation. Checking only creation
    left `create -> archive -> create -> archive ...` walking past the cap and
    then un-archiving the lot, so a Grow account could hold any number of
    active plans.

    Nothing already created is touched. Existing plans stay listed, stay
    openable and keep their steps and reminders even when the user is over the
    cap (a lapsed Bloom, or a Seed account from before the cap existed); only
    adding to the tracked set is refused.
    """
    queryset = CropPlan.objects.filter(user=user).exclude(status=CropPlan.Status.ARCHIVED)
    if exclude_pk is not None:
        # The plan being restored must not count against itself.
        queryset = queryset.exclude(pk=exclude_pk)
    used = queryset.count()
    entitlements = resolve_entitlements(user)
    enforce_limit(
        user,
        "crop_plans",
        used,
        message=_crop_plan_quota_message(entitlements, used, restoring=restoring),
    )


def _int_param(request, name: str) -> int | None:
    raw = request.query_params.get(name)
    if raw in (None, ""):
        return None
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


class CropListAPIView(generics.ListAPIView):
    queryset = Crop.objects.filter(is_active=True)
    serializer_class = CropSerializer
    permission_classes = [permissions.IsAuthenticated]


class CropLocationListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = CropLocationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CropLocation.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CropLocationDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CropLocationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CropLocation.objects.filter(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            instance.delete()
        except ProtectedError:
            titles = list(instance.crop_plans.values_list("title", flat=True)[:5])
            return response.Response(
                {
                    "detail": "Khu trồng này đang được dùng bởi kế hoạch: " + ", ".join(titles) + ". "
                    "Hãy xóa hoặc lưu trữ các kế hoạch đó trước.",
                    "detail_en": "This growing area is still used by: " + ", ".join(titles) + ". "
                    "Delete or archive those plans first.",
                },
                status=status.HTTP_409_CONFLICT,
            )
        return response.Response(status=status.HTTP_204_NO_CONTENT)


class CropPlanListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = CropPlanPagination

    def get_queryset(self):
        queryset = (
            CropPlan.objects.filter(user=self.request.user)
            .select_related("crop", "location", "weather_snapshot")
            .prefetch_related("steps")
            .annotate(reminder_total=Count("reminders", distinct=True))
            # Explicit and unique, so page 2 cannot repeat a row from page 1.
            .order_by("-updated_at", "-id")
        )
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        elif self.request.query_params.get("include_archived") not in ("1", "true", "True"):
            queryset = queryset.exclude(status=CropPlan.Status.ARCHIVED)
        return queryset

    def get_serializer_class(self):
        if self.request.method.upper() == "POST":
            return CreateCropPlanSerializer
        return CropPlanListSerializer

    def create(self, request, *args, **kwargs):
        # Checked before anything is validated or written: committing a plan
        # also creates a growing area and a weather snapshot, and a refused
        # request must leave none of that behind.
        _enforce_crop_plan_quota(request.user)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        crop = generics.get_object_or_404(Crop.objects.filter(is_active=True), slug=validated["crop_type"])
        location = self._resolve_location(validated)
        context = build_context_from_request(crop, location, validated)
        plan = create_plan_from_payload(request.user, context)
        output = CropPlanSerializer(plan, context={"request": request})
        return response.Response(output.data, status=status.HTTP_201_CREATED)

    def _resolve_location(self, validated_data):
        location_id = validated_data.get("location_id")
        if location_id:
            return generics.get_object_or_404(CropLocation.objects.filter(user=self.request.user), pk=location_id)
        return CropLocation.objects.create(
            user=self.request.user,
            name=validated_data.get("location_name") or "Khu trồng mới",
            lat=validated_data["lat"],
            lon=validated_data["lon"],
            address_text=validated_data.get("address_text", ""),
            timezone=validated_data.get("timezone") or "Asia/Ho_Chi_Minh",
        )


class CropPlanPreviewAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    # Deliberately not capped: a preview writes nothing and is how a grower
    # finds out whether the crop even suits their weather. Only committing the
    # plan in CropPlanListCreateAPIView consumes a slot.
    def post(self, request):
        serializer = CreateCropPlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        crop = generics.get_object_or_404(Crop.objects.filter(is_active=True), slug=validated["crop_type"])
        if validated.get("location_id"):
            location = generics.get_object_or_404(CropLocation.objects.filter(user=request.user), pk=validated["location_id"])
        else:
            location = CropLocation(
                user=request.user,
                name=validated.get("location_name") or "Khu trồng tạm",
                lat=validated["lat"],
                lon=validated["lon"],
                address_text=validated.get("address_text", ""),
                timezone=validated.get("timezone") or "Asia/Ho_Chi_Minh",
            )
        context = build_context_from_request(crop, location, validated)
        payload = generate_plan_payload(context)
        return response.Response(
            {
                "crop": CropSerializer(crop).data,
                "location": {
                    "name": location.name,
                    "lat": location.lat,
                    "lon": location.lon,
                    "address_text": location.address_text,
                    "timezone": location.timezone,
                },
                "summary": {
                    "planned_start_date": validated["start_date"].isoformat(),
                    "recommended_start_date": payload["recommended_start_date"].isoformat(),
                    "suitability_score": payload["suitability"]["score"],
                    "suitability_level": payload["suitability"]["level"],
                    "key_warnings": payload["suitability"]["warnings"],
                    "key_warnings_en": payload["suitability"].get("warnings_en", []),
                    "reasoning_summary": payload["suitability"]["reasoning_summary"],
                    "reasoning_summary_en": payload["suitability"].get("reasoning_summary_en", ""),
                    "climate_metrics": payload["weather"]["derived_metrics"],
                    "climate_confidence": payload["climate_confidence"],
                    "climate_coverage": payload["weather"].get("coverage", {}),
                    "weather_source": payload["weather"]["source"],
                },
                "steps": payload["steps"],
            }
        )


class CropPlanDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CropPlanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # No cap filtering here on purpose: a plan the user owns always opens,
        # even when they are over the cap of their current plan.
        return (
            CropPlan.objects.filter(user=self.request.user)
            .select_related("crop", "location", "weather_snapshot")
            .prefetch_related("steps")
        )

    def perform_update(self, serializer):
        plan = serializer.instance
        next_status = serializer.validated_data.get("status", plan.status)
        # Taking a plan out of the archive fills a slot exactly like creating
        # one, so it is checked the same way. Runs after validation and before
        # the write, so a refusal leaves the plan (and its title) untouched.
        if plan.status == CropPlan.Status.ARCHIVED and next_status != CropPlan.Status.ARCHIVED:
            _enforce_crop_plan_quota(self.request.user, exclude_pk=plan.pk, restoring=True)
        serializer.save()


class CropPlanRegenerateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk: int):
        plan = generics.get_object_or_404(
            CropPlan.objects.filter(user=request.user).select_related("crop", "location"), pk=pk
        )
        # regenerate_plan always leaves the plan ACTIVE, so regenerating an
        # archived one is a restore and has to fit the cap like any other.
        if plan.status == CropPlan.Status.ARCHIVED:
            _enforce_crop_plan_quota(request.user, exclude_pk=plan.pk, restoring=True)
        refreshed = regenerate_plan(plan)
        return response.Response(CropPlanSerializer(refreshed, context={"request": request}).data)


class CropPlanWeatherRefreshAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk: int):
        plan = generics.get_object_or_404(CropPlan.objects.filter(user=request.user).select_related("crop", "location"), pk=pk)
        was_archived = plan.status == CropPlan.Status.ARCHIVED
        result = refresh_plan_weather(plan)
        # A bad forecast flags the plan "needs review" whatever it was before,
        # which would pull an archived plan back into the tracked list — past
        # the cap and without the grower asking. Archiving is their decision;
        # only they undo it. The warnings are still returned and still stored.
        if was_archived and plan.status != CropPlan.Status.ARCHIVED:
            CropPlan.objects.filter(pk=plan.pk).update(status=CropPlan.Status.ARCHIVED)
            result["status"] = CropPlan.Status.ARCHIVED
        return response.Response(result)


class CropPlanStepCompleteAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk: int):
        serializer = StepCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        step = generics.get_object_or_404(CropPlanStep.objects.filter(crop_plan__user=request.user), pk=pk)
        mark_step_complete(step, serializer.validated_data.get("note", ""))
        return response.Response({"status": "ok"})


class CropPlanStepReopenAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk: int):
        serializer = StepReopenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        step = generics.get_object_or_404(CropPlanStep.objects.filter(crop_plan__user=request.user), pk=pk)
        if step.status != CropPlanStep.Status.COMPLETED:
            return response.Response(
                {"detail": "Bước này chưa được đánh dấu hoàn thành."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reopen_step(step, serializer.validated_data.get("note", ""))
        return response.Response({"status": "ok"})


class CropPlanStepDelayAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk: int):
        serializer = StepDelaySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        step = generics.get_object_or_404(CropPlanStep.objects.filter(crop_plan__user=request.user), pk=pk)
        if step.status == CropPlanStep.Status.COMPLETED:
            return response.Response(
                {"detail": "Bước đã hoàn thành nên không dời lịch được. Hãy bỏ đánh dấu hoàn thành trước."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        delay_step(step, serializer.validated_data["delay_days"], serializer.validated_data.get("reason", ""))
        return response.Response({"status": "ok"})


class CropPlanStepNoteAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk: int):
        serializer = StepNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        step = generics.get_object_or_404(CropPlanStep.objects.filter(crop_plan__user=request.user), pk=pk)
        step.user_notes = serializer.validated_data.get("note", "")
        step.save(update_fields=["user_notes", "updated_at"])
        return response.Response({"status": "ok"})


class ReminderListAPIView(generics.ListAPIView):
    serializer_class = ReminderSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ReminderPagination

    def get_queryset(self):
        queryset = Reminder.objects.filter(user=self.request.user).select_related("crop_plan", "step")
        plan_id = _int_param(self.request, "plan")
        if plan_id is not None:
            queryset = queryset.filter(crop_plan_id=plan_id)

        filter_value = self.request.query_params.get("filter")
        if filter_value == "today":
            queryset = queryset.filter(trigger_time__date=timezone.localdate())
        elif filter_value == "missed":
            queryset = queryset.filter(trigger_time__lt=timezone.now(), completed_or_not=False).exclude(
                status=Reminder.Status.CANCELLED
            )
            # Most recently missed first: those are the ones still worth acting on.
            return queryset.order_by("-trigger_time", "-id")
        elif filter_value == "upcoming":
            queryset = queryset.filter(trigger_time__gte=timezone.now()).exclude(status=Reminder.Status.CANCELLED)
        elif filter_value == "unread":
            queryset = queryset.filter(read=False)
        return queryset.order_by("trigger_time", "id")


class ReminderReadAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk: int):
        serializer = ReminderReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reminder = generics.get_object_or_404(Reminder.objects.filter(user=request.user), pk=pk)
        reminder.read = serializer.validated_data["read"]
        reminder.status = Reminder.Status.READ if reminder.read else reminder.status
        reminder.save(update_fields=["read", "status", "updated_at"])
        return response.Response({"status": "ok"})
