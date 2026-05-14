from django.contrib import admin

from .models import (
    CompletionLog,
    Crop,
    CropLocation,
    CropPlan,
    CropPlanStep,
    Reminder,
    ReminderLog,
    WeatherSnapshot,
)


@admin.register(Crop)
class CropAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "category", "is_beginner_friendly", "is_active")
    search_fields = ("name", "slug")
    list_filter = ("category", "is_active", "is_beginner_friendly")


@admin.register(CropLocation)
class CropLocationAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "lat", "lon", "is_default", "updated_at")
    search_fields = ("name", "address_text", "user__email")


@admin.register(WeatherSnapshot)
class WeatherSnapshotAdmin(admin.ModelAdmin):
    list_display = ("location", "source", "time_range_start", "time_range_end", "fetched_at")


class CropPlanStepInline(admin.TabularInline):
    model = CropPlanStep
    extra = 0
    fields = ("step_number", "title", "phase_key", "status", "suggested_start_time")


@admin.register(CropPlan)
class CropPlanAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "user",
        "crop",
        "planting_mode",
        "status",
        "suitability_score",
        "recommended_start_date",
        "updated_at",
    )
    list_filter = ("status", "planting_mode", "crop")
    search_fields = ("title", "user__email", "crop__name")
    inlines = [CropPlanStepInline]


@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "type", "trigger_time", "status", "read")
    list_filter = ("type", "status", "channel")


@admin.register(ReminderLog)
class ReminderLogAdmin(admin.ModelAdmin):
    list_display = ("reminder", "event_type", "event_time")


@admin.register(CompletionLog)
class CompletionLogAdmin(admin.ModelAdmin):
    list_display = ("user", "crop_plan", "step", "action", "logged_at")

