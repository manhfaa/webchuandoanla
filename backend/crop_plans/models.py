from django.conf import settings
from django.db import models


class Crop(models.Model):
    slug = models.SlugField(max_length=50, unique=True)
    name = models.CharField(max_length=120)
    category = models.CharField(max_length=80, default="vegetable")
    description = models.TextField(blank=True, default="")
    default_planting_modes = models.JSONField(default=list, blank=True)
    climate_profile = models.JSONField(default=dict, blank=True)
    growth_profile = models.JSONField(default=dict, blank=True)
    care_rules = models.JSONField(default=dict, blank=True)
    is_beginner_friendly = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class CropLocation(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="crop_locations",
    )
    name = models.CharField(max_length=120)
    lat = models.FloatField()
    lon = models.FloatField()
    address_text = models.CharField(max_length=255, blank=True, default="")
    admin_area_1 = models.CharField(max_length=120, blank=True, default="")
    admin_area_2 = models.CharField(max_length=120, blank=True, default="")
    country_code = models.CharField(max_length=10, blank=True, default="VN")
    timezone = models.CharField(max_length=50, default="Asia/Ho_Chi_Minh")
    is_default = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_default", "-updated_at"]

    def __str__(self) -> str:
        return self.name


class WeatherSnapshot(models.Model):
    location = models.ForeignKey(
        CropLocation,
        on_delete=models.CASCADE,
        related_name="weather_snapshots",
    )
    source = models.CharField(max_length=50, default="nasa_power")
    time_range_start = models.DateField()
    time_range_end = models.DateField()
    raw_payload = models.JSONField(default=dict, blank=True)
    daily_series = models.JSONField(default=list, blank=True)
    derived_metrics = models.JSONField(default=dict, blank=True)
    fetched_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fetched_at"]

    def __str__(self) -> str:
        return f"{self.location.name}::{self.source}"


class CropPlan(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        PAUSED = "paused", "Paused"
        COMPLETED = "completed", "Completed"
        NEEDS_REVIEW = "needs_review", "Needs review"
        ARCHIVED = "archived", "Archived"

    class SuitabilityLevel(models.TextChoices):
        SUITABLE = "suitable", "Suitable"
        BORDERLINE = "borderline", "Borderline"
        NOT_RECOMMENDED = "not_recommended", "Not recommended"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="crop_plans",
    )
    crop = models.ForeignKey(Crop, on_delete=models.PROTECT, related_name="crop_plans")
    location = models.ForeignKey(
        CropLocation,
        on_delete=models.PROTECT,
        related_name="crop_plans",
    )
    weather_snapshot = models.ForeignKey(
        WeatherSnapshot,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="crop_plans",
    )
    title = models.CharField(max_length=180)
    planting_mode = models.CharField(max_length=30, default="pot")
    area_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    area_unit = models.CharField(max_length=20, default="m2")
    plant_count = models.PositiveIntegerField(default=1)
    planned_start_date = models.DateField()
    recommended_start_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    suitability_score = models.PositiveIntegerField(default=0)
    suitability_level = models.CharField(
        max_length=20,
        choices=SuitabilityLevel.choices,
        default=SuitabilityLevel.BORDERLINE,
    )
    summary = models.TextField(blank=True, default="")
    ai_reasoning_summary = models.TextField(blank=True, default="")
    plan_goal = models.CharField(max_length=40, blank=True, default="")
    experience_level = models.CharField(max_length=30, blank=True, default="beginner")
    plan_version = models.PositiveIntegerField(default=1)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return self.title


class CropPlanStep(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CURRENT = "current", "Current"
        COMPLETED = "completed", "Completed"
        SKIPPED = "skipped", "Skipped"
        DELAYED = "delayed", "Delayed"

    crop_plan = models.ForeignKey(
        CropPlan,
        on_delete=models.CASCADE,
        related_name="steps",
    )
    parent_step = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="children",
    )
    phase_key = models.CharField(max_length=50)
    step_number = models.PositiveIntegerField()
    title = models.CharField(max_length=180)
    short_label = models.CharField(max_length=100, blank=True, default="")
    description = models.TextField()
    why_this_step_matters = models.TextField(blank=True, default="")
    prerequisites = models.JSONField(default=list, blank=True)
    tools_needed = models.JSONField(default=list, blank=True)
    estimated_duration_minutes = models.PositiveIntegerField(default=0)
    suggested_start_time = models.DateTimeField()
    suggested_end_time = models.DateTimeField()
    repeat_rule = models.JSONField(null=True, blank=True)
    reminder_times = models.JSONField(default=list, blank=True)
    completion_condition = models.TextField(blank=True, default="")
    risk_notes = models.JSONField(default=list, blank=True)
    weather_dependency = models.JSONField(default=dict, blank=True)
    water_amount_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    water_amount_unit = models.CharField(max_length=30, blank=True, default="")
    fertilizer_amount_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    fertilizer_amount_unit = models.CharField(max_length=30, blank=True, default="")
    sunlight_requirement_text = models.CharField(max_length=150, blank=True, default="")
    dependency_step_ids = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    delay_reason = models.CharField(max_length=255, blank=True, default="")
    sort_key = models.CharField(max_length=50, blank=True, default="")
    user_notes = models.TextField(blank=True, default="")
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["step_number", "suggested_start_time"]
        unique_together = ("crop_plan", "step_number")

    def __str__(self) -> str:
        return f"{self.crop_plan_id}::{self.step_number}"


class Reminder(models.Model):
    class Channel(models.TextChoices):
        IN_APP = "in_app", "In app"
        PUSH = "push", "Push"
        EMAIL = "email", "Email"

    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        SENT = "sent", "Sent"
        DELIVERED = "delivered", "Delivered"
        READ = "read", "Read"
        CANCELLED = "cancelled", "Cancelled"
        EXPIRED = "expired", "Expired"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reminders",
    )
    crop_plan = models.ForeignKey(
        CropPlan,
        on_delete=models.CASCADE,
        related_name="reminders",
    )
    step = models.ForeignKey(
        CropPlanStep,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="reminders",
    )
    title = models.CharField(max_length=180)
    body = models.TextField()
    deep_link = models.CharField(max_length=255, blank=True, default="")
    trigger_time = models.DateTimeField()
    fallback_trigger_time = models.DateTimeField(null=True, blank=True)
    priority = models.CharField(max_length=20, default="medium")
    type = models.CharField(max_length=40, default="step_due")
    channel = models.CharField(max_length=20, choices=Channel.choices, default=Channel.IN_APP)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    read = models.BooleanField(default=False)
    completed_or_not = models.BooleanField(default=False)
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["trigger_time"]

    def __str__(self) -> str:
        return self.title


class ReminderLog(models.Model):
    reminder = models.ForeignKey(
        Reminder,
        on_delete=models.CASCADE,
        related_name="logs",
    )
    event_type = models.CharField(max_length=30)
    event_time = models.DateTimeField(auto_now_add=True)
    provider_response = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-event_time"]


class CompletionLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="completion_logs",
    )
    crop_plan = models.ForeignKey(
        CropPlan,
        on_delete=models.CASCADE,
        related_name="completion_logs",
    )
    step = models.ForeignKey(
        CropPlanStep,
        on_delete=models.CASCADE,
        related_name="completion_logs",
    )
    action = models.CharField(max_length=20, default="completed")
    note = models.TextField(blank=True, default="")
    proof_image_url = models.URLField(blank=True, default="")
    logged_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-logged_at"]

