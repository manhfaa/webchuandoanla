from datetime import timedelta
from decimal import Decimal
from functools import lru_cache
from zoneinfo import available_timezones

from django.utils import timezone
from rest_framework import serializers

from .models import Crop, CropLocation, CropPlan, CropPlanStep, Reminder, WeatherSnapshot

# A plan more than a year old, or more than two years ahead, is a typo rather
# than a growing season.
MAX_PAST_START_DAYS = 365
MAX_FUTURE_START_DAYS = 730

# DRF's own range messages are English; these fields are shown to growers.
LAT_ERRORS = {
    "min_value": "Vĩ độ phải nằm trong khoảng -90 đến 90.",
    "max_value": "Vĩ độ phải nằm trong khoảng -90 đến 90.",
}
LON_ERRORS = {
    "min_value": "Kinh độ phải nằm trong khoảng -180 đến 180.",
    "max_value": "Kinh độ phải nằm trong khoảng -180 đến 180.",
}
AREA_ERRORS = {"min_value": "Diện tích không được là số âm."}
PLANT_COUNT_ERRORS = {
    "min_value": "Số lượng cây phải từ 1 trở lên.",
    "max_value": "Số lượng cây vượt quá mức hệ thống hỗ trợ.",
}
DELAY_ERRORS = {
    "min_value": "Chỉ dời được từ 1 đến 30 ngày.",
    "max_value": "Chỉ dời được từ 1 đến 30 ngày.",
}


@lru_cache(maxsize=1)
def _known_timezones() -> frozenset[str]:
    return frozenset(available_timezones())


def _validate_timezone(value: str) -> str:
    name = (value or "").strip()
    if not name:
        return "Asia/Ho_Chi_Minh"
    if name not in _known_timezones():
        raise serializers.ValidationError("Múi giờ không hợp lệ.")
    return name


def _validate_start_date(value):
    today = timezone.localdate()
    if value < today - timedelta(days=MAX_PAST_START_DAYS):
        raise serializers.ValidationError("Ngày bắt đầu quá xa trong quá khứ.")
    if value > today + timedelta(days=MAX_FUTURE_START_DAYS):
        raise serializers.ValidationError("Ngày bắt đầu quá xa trong tương lai.")
    return value


class CropSerializer(serializers.ModelSerializer):
    class Meta:
        model = Crop
        fields = (
            "id",
            "slug",
            "name",
            "name_en",
            "category",
            "description",
            "description_en",
            "default_planting_modes",
            "is_beginner_friendly",
            "created_at",
            "updated_at",
        )


class CropLocationSerializer(serializers.ModelSerializer):
    lat = serializers.FloatField(min_value=-90, max_value=90, error_messages=LAT_ERRORS)
    lon = serializers.FloatField(min_value=-180, max_value=180, error_messages=LON_ERRORS)

    class Meta:
        model = CropLocation
        fields = "__all__"
        read_only_fields = ("id", "user", "created_at", "updated_at")

    def validate_timezone(self, value):
        return _validate_timezone(value)


class WeatherSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeatherSnapshot
        # daily_series is up to four months of rows that no screen renders, so
        # it stays in the database and out of the response.
        fields = ("id", "source", "time_range_start", "time_range_end", "derived_metrics", "fetched_at")


class CropPlanStepSerializer(serializers.ModelSerializer):
    water_amount = serializers.SerializerMethodField()
    fertilizer_amount = serializers.SerializerMethodField()

    class Meta:
        model = CropPlanStep
        fields = (
            "id",
            "phase_key",
            "step_number",
            "title",
            "title_en",
            "short_label",
            "short_label_en",
            "description",
            "description_en",
            "why_this_step_matters",
            "why_this_step_matters_en",
            "prerequisites",
            "prerequisites_en",
            "tools_needed",
            "tools_needed_en",
            "estimated_duration_minutes",
            "suggested_start_time",
            "suggested_end_time",
            "repeat_rule",
            "reminder_times",
            "completion_condition",
            "completion_condition_en",
            "risk_notes",
            "risk_notes_en",
            "weather_dependency",
            "water_amount",
            "fertilizer_amount",
            "sunlight_requirement_text",
            "sunlight_requirement_text_en",
            "dependency_step_ids",
            "status",
            "delay_reason",
            "sort_key",
            "user_notes",
            "completed_at",
            "created_at",
            "updated_at",
        )

    def get_water_amount(self, obj):
        if obj.water_amount_value is None:
            return None
        return {
            "value": float(obj.water_amount_value),
            "unit": obj.water_amount_unit,
            "unit_en": obj.water_amount_unit_en or "",
        }

    def get_fertilizer_amount(self, obj):
        if obj.fertilizer_amount_value is None:
            return None
        return {
            "value": float(obj.fertilizer_amount_value),
            "unit": obj.fertilizer_amount_unit,
            "unit_en": obj.fertilizer_amount_unit_en or "",
        }


class CropPlanStepSummarySerializer(serializers.ModelSerializer):
    """Just enough of a step for the plan list card."""

    class Meta:
        model = CropPlanStep
        fields = ("id", "step_number", "title", "title_en", "short_label", "short_label_en", "status")


class ReminderSerializer(serializers.ModelSerializer):
    step_title = serializers.CharField(source="step.title", read_only=True)
    step_title_en = serializers.CharField(source="step.title_en", read_only=True)

    class Meta:
        model = Reminder
        fields = (
            "id",
            "crop_plan",
            "step",
            "step_title",
            "step_title_en",
            "title",
            "title_en",
            "body",
            "body_en",
            "deep_link",
            "trigger_time",
            "fallback_trigger_time",
            "priority",
            "type",
            "channel",
            "status",
            "read",
            "completed_or_not",
            "payload",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class CropPlanListSerializer(serializers.ModelSerializer):
    """Plan list rows: no steps, no reminders, no weather series."""

    crop = CropSerializer(read_only=True)
    location = CropLocationSerializer(read_only=True)
    current_step = serializers.SerializerMethodField()
    step_count = serializers.SerializerMethodField()
    completed_step_count = serializers.SerializerMethodField()
    reminder_count = serializers.SerializerMethodField()
    climate_confidence = serializers.SerializerMethodField()
    weather_source = serializers.SerializerMethodField()

    class Meta:
        model = CropPlan
        fields = (
            "id",
            "crop",
            "location",
            "title",
            "title_en",
            "planting_mode",
            "plant_count",
            "planned_start_date",
            "recommended_start_date",
            "status",
            "suitability_score",
            "suitability_level",
            "summary",
            "summary_en",
            "plan_version",
            "current_step",
            "step_count",
            "completed_step_count",
            "reminder_count",
            "climate_confidence",
            "weather_source",
            "created_at",
            "updated_at",
        )

    def _steps(self, obj):
        return sorted(obj.steps.all(), key=lambda step: step.step_number)

    def get_current_step(self, obj):
        steps = self._steps(obj)
        current = next((step for step in steps if step.status == CropPlanStep.Status.CURRENT), None)
        target = current or next((step for step in steps if step.status != CropPlanStep.Status.COMPLETED), None)
        if target is None:
            return None
        return CropPlanStepSummarySerializer(target).data

    def get_step_count(self, obj):
        return len(obj.steps.all())

    def get_completed_step_count(self, obj):
        return len([step for step in obj.steps.all() if step.status == CropPlanStep.Status.COMPLETED])

    def get_reminder_count(self, obj):
        return getattr(obj, "reminder_total", None)

    def get_climate_confidence(self, obj):
        return (obj.metadata or {}).get("climate_confidence", "")

    def get_weather_source(self, obj):
        return obj.weather_snapshot.source if obj.weather_snapshot_id else ""


class CropPlanSerializer(serializers.ModelSerializer):
    crop = CropSerializer(read_only=True)
    location = CropLocationSerializer(read_only=True)
    weather_snapshot = WeatherSnapshotSerializer(read_only=True)
    steps = CropPlanStepSerializer(many=True, read_only=True)
    climate_confidence = serializers.SerializerMethodField()
    reminder_count = serializers.SerializerMethodField()

    class Meta:
        model = CropPlan
        # Reminders are fetched from /reminders/ so a plan detail is not 180 KB
        # of notifications the page never renders.
        fields = (
            "id",
            "crop",
            "location",
            "weather_snapshot",
            "title",
            "title_en",
            "planting_mode",
            "area_value",
            "area_unit",
            "plant_count",
            "planned_start_date",
            "recommended_start_date",
            "status",
            "suitability_score",
            "suitability_level",
            "climate_confidence",
            "summary",
            "summary_en",
            "ai_reasoning_summary",
            "ai_reasoning_summary_en",
            "plan_goal",
            "experience_level",
            "plan_version",
            "metadata",
            "steps",
            "reminder_count",
            "created_at",
            "updated_at",
        )
        # Everything the planner computes; an edit screen only owns the title
        # and the plan status (active / paused / archived).
        read_only_fields = (
            "id",
            "title_en",
            "planting_mode",
            "area_value",
            "area_unit",
            "plant_count",
            "planned_start_date",
            "recommended_start_date",
            "suitability_score",
            "suitability_level",
            "summary",
            "summary_en",
            "ai_reasoning_summary",
            "ai_reasoning_summary_en",
            "plan_goal",
            "experience_level",
            "plan_version",
            "metadata",
            "created_at",
            "updated_at",
        )

    def get_climate_confidence(self, obj):
        return (obj.metadata or {}).get("climate_confidence", "")

    def get_reminder_count(self, obj):
        return obj.reminders.count()


class CreateCropPlanSerializer(serializers.Serializer):
    crop_type = serializers.SlugField()
    location_id = serializers.IntegerField(required=False)
    location_name = serializers.CharField(required=False, allow_blank=True, max_length=120)
    lat = serializers.FloatField(required=False, min_value=-90, max_value=90, error_messages=LAT_ERRORS)
    lon = serializers.FloatField(required=False, min_value=-180, max_value=180, error_messages=LON_ERRORS)
    address_text = serializers.CharField(required=False, allow_blank=True, max_length=255)
    planting_mode = serializers.ChoiceField(choices=(("pot", "Pot"), ("ground", "Ground")))
    area_value = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True,
        min_value=Decimal("0"),
        error_messages=AREA_ERRORS,
    )
    area_unit = serializers.CharField(required=False, default="m2", max_length=20)
    plant_count = serializers.IntegerField(min_value=1, max_value=100000, default=1, error_messages=PLANT_COUNT_ERRORS)
    start_date = serializers.DateField(validators=[_validate_start_date])
    experience_level = serializers.ChoiceField(choices=(("beginner", "Beginner"), ("intermediate", "Intermediate")), default="beginner")
    plan_goal = serializers.ChoiceField(
        choices=(("home", "Home"), ("trial", "Trial"), ("small_farm", "Small farm"), ("commercial", "Commercial")),
        default="home",
    )
    timezone = serializers.CharField(required=False, default="Asia/Ho_Chi_Minh", max_length=50)

    def validate_timezone(self, value):
        return _validate_timezone(value)

    def validate(self, attrs):
        if not attrs.get("location_id") and (attrs.get("lat") is None or attrs.get("lon") is None):
            raise serializers.ValidationError("Cần cung cấp location_id hoặc lat/lon.")
        return attrs


class StepCompleteSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class StepReopenSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class StepDelaySerializer(serializers.Serializer):
    delay_days = serializers.IntegerField(min_value=1, max_value=30, error_messages=DELAY_ERRORS)
    reason = serializers.CharField(required=False, allow_blank=True, max_length=255)


class StepNoteSerializer(serializers.Serializer):
    # Blank is how a note gets cleared, so it must be accepted.
    note = serializers.CharField(required=False, allow_blank=True, default="", max_length=2000)


class ReminderReadSerializer(serializers.Serializer):
    read = serializers.BooleanField(default=True)
