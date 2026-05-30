from django.utils import timezone
from rest_framework import generics, permissions, response, status
from rest_framework.views import APIView

from .models import Crop, CropLocation, CropPlan, CropPlanStep, Reminder
from .serializers import (
    CreateCropPlanSerializer,
    CropLocationSerializer,
    CropPlanSerializer,
    CropSerializer,
    ReminderReadSerializer,
    ReminderSerializer,
    StepCompleteSerializer,
    StepDelaySerializer,
    StepNoteSerializer,
)
from .services.planner import (
    build_context_from_request,
    create_plan_from_payload,
    delay_step,
    generate_plan_payload,
    mark_step_complete,
    refresh_plan_weather,
)


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


class CropPlanListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CropPlan.objects.filter(user=self.request.user).select_related("crop", "location", "weather_snapshot")

    def get_serializer_class(self):
        if self.request.method.upper() == "POST":
            return CreateCropPlanSerializer
        return CropPlanSerializer

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
                    "reasoning_summary": payload["suitability"]["reasoning_summary"],
                    "climate_metrics": payload["weather"]["derived_metrics"],
                },
                "steps": payload["steps"],
            }
        )


class CropPlanDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CropPlanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CropPlan.objects.filter(user=self.request.user).select_related("crop", "location", "weather_snapshot")


class CropPlanRegenerateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk: int):
        plan = generics.get_object_or_404(CropPlan.objects.filter(user=request.user).select_related("crop", "location"), pk=pk)
        payload = {
            "planting_mode": plan.planting_mode,
            "area_value": plan.area_value,
            "area_unit": plan.area_unit,
            "plant_count": plan.plant_count,
            "start_date": plan.planned_start_date,
            "experience_level": plan.experience_level or "beginner",
            "plan_goal": plan.plan_goal or "home",
            "timezone": plan.location.timezone,
        }
        plan.steps.all().delete()
        plan.reminders.all().delete()
        context = build_context_from_request(plan.crop, plan.location, payload)
        refreshed = create_plan_from_payload(request.user, context)
        plan.delete()
        return response.Response(CropPlanSerializer(refreshed).data)


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


class CropPlanStepDelayAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk: int):
        serializer = StepDelaySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        step = generics.get_object_or_404(CropPlanStep.objects.filter(crop_plan__user=request.user), pk=pk)
        delay_step(step, serializer.validated_data["delay_days"], serializer.validated_data.get("reason", ""))
        return response.Response({"status": "ok"})


class CropPlanStepNoteAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk: int):
        serializer = StepNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        step = generics.get_object_or_404(CropPlanStep.objects.filter(crop_plan__user=request.user), pk=pk)
        step.user_notes = serializer.validated_data["note"]
        step.save(update_fields=["user_notes", "updated_at"])
        return response.Response({"status": "ok"})


class ReminderListAPIView(generics.ListAPIView):
    serializer_class = ReminderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Reminder.objects.filter(user=self.request.user).select_related("crop_plan", "step")
        filter_value = self.request.query_params.get("filter")
        if filter_value == "today":
            today = timezone.localdate()
            queryset = queryset.filter(trigger_time__date=today)
        elif filter_value == "missed":
            queryset = queryset.filter(trigger_time__lt=timezone.now(), completed_or_not=False).exclude(status=Reminder.Status.CANCELLED)
        elif filter_value == "unread":
            queryset = queryset.filter(read=False)
        return queryset


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
