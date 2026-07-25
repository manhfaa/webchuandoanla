from django.db.models import Count
from django.db.models.deletion import ProtectedError
from django.utils import timezone
from rest_framework import generics, permissions, response, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView

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
        return (
            CropPlan.objects.filter(user=self.request.user)
            .select_related("crop", "location", "weather_snapshot")
            .prefetch_related("steps")
        )


class CropPlanRegenerateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk: int):
        plan = generics.get_object_or_404(
            CropPlan.objects.filter(user=request.user).select_related("crop", "location"), pk=pk
        )
        refreshed = regenerate_plan(plan)
        return response.Response(CropPlanSerializer(refreshed, context={"request": request}).data)


class CropPlanWeatherRefreshAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk: int):
        plan = generics.get_object_or_404(CropPlan.objects.filter(user=request.user).select_related("crop", "location"), pk=pk)
        result = refresh_plan_weather(plan)
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
