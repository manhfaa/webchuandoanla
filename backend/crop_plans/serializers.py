from rest_framework import serializers

from .models import Crop, CropLocation, CropPlan, CropPlanStep, Reminder, WeatherSnapshot


class CropSerializer(serializers.ModelSerializer):
    class Meta:
        model = Crop
        fields = (
            "id",
            "slug",
            "name",
            "category",
            "description",
            "default_planting_modes",
            "is_beginner_friendly",
            "created_at",
            "updated_at",
        )


class CropLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CropLocation
        fields = "__all__"
        read_only_fields = ("id", "user", "created_at", "updated_at")


class WeatherSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeatherSnapshot
        fields = ("id", "source", "time_range_start", "time_range_end", "daily_series", "derived_metrics", "fetched_at")


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
            "short_label",
            "description",
            "why_this_step_matters",
            "prerequisites",
            "tools_needed",
            "estimated_duration_minutes",
            "suggested_start_time",
            "suggested_end_time",
            "repeat_rule",
            "reminder_times",
            "completion_condition",
            "risk_notes",
            "weather_dependency",
            "water_amount",
            "fertilizer_amount",
            "sunlight_requirement_text",
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
        return {"value": float(obj.water_amount_value), "unit": obj.water_amount_unit}

    def get_fertilizer_amount(self, obj):
        if obj.fertilizer_amount_value is None:
            return None
        return {"value": float(obj.fertilizer_amount_value), "unit": obj.fertilizer_amount_unit}


class ReminderSerializer(serializers.ModelSerializer):
    step_title = serializers.CharField(source="step.title", read_only=True)

    class Meta:
        model = Reminder
        fields = (
            "id",
            "crop_plan",
            "step",
            "step_title",
            "title",
            "body",
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


class CropPlanSerializer(serializers.ModelSerializer):
    crop = CropSerializer(read_only=True)
    location = CropLocationSerializer(read_only=True)
    weather_snapshot = WeatherSnapshotSerializer(read_only=True)
    steps = CropPlanStepSerializer(many=True, read_only=True)
    reminders = ReminderSerializer(many=True, read_only=True)

    class Meta:
        model = CropPlan
        fields = (
            "id",
            "crop",
            "location",
            "weather_snapshot",
            "title",
            "planting_mode",
            "area_value",
            "area_unit",
            "plant_count",
            "planned_start_date",
            "recommended_start_date",
            "status",
            "suitability_score",
            "suitability_level",
            "summary",
            "ai_reasoning_summary",
            "plan_goal",
            "experience_level",
            "plan_version",
            "metadata",
            "steps",
            "reminders",
            "created_at",
            "updated_at",
        )


class CreateCropPlanSerializer(serializers.Serializer):
    crop_type = serializers.SlugField()
    location_id = serializers.IntegerField(required=False)
    location_name = serializers.CharField(required=False, allow_blank=True)
    lat = serializers.FloatField(required=False)
    lon = serializers.FloatField(required=False)
    address_text = serializers.CharField(required=False, allow_blank=True)
    planting_mode = serializers.ChoiceField(choices=(("pot", "Pot"), ("ground", "Ground")))
    area_value = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    area_unit = serializers.CharField(required=False, default="m2")
    plant_count = serializers.IntegerField(min_value=1, default=1)
    start_date = serializers.DateField()
    experience_level = serializers.ChoiceField(choices=(("beginner", "Beginner"), ("intermediate", "Intermediate")), default="beginner")
    plan_goal = serializers.ChoiceField(
        choices=(("home", "Home"), ("trial", "Trial"), ("small_farm", "Small farm"), ("commercial", "Commercial")),
        default="home",
    )
    timezone = serializers.CharField(required=False, default="Asia/Ho_Chi_Minh")

    def validate(self, attrs):
        if not attrs.get("location_id") and (attrs.get("lat") is None or attrs.get("lon") is None):
            raise serializers.ValidationError("Cần cung cấp location_id hoặc lat/lon.")
        return attrs


class StepCompleteSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True)


class StepDelaySerializer(serializers.Serializer):
    delay_days = serializers.IntegerField(min_value=1, max_value=30)
    reason = serializers.CharField(required=False, allow_blank=True)


class StepNoteSerializer(serializers.Serializer):
    note = serializers.CharField()


class ReminderReadSerializer(serializers.Serializer):
    read = serializers.BooleanField(default=True)
