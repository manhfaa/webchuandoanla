from django.contrib import admin

from .models import (
    AgriculturalInput,
    CultivationLog,
    FarmLocation,
    FarmPlot,
    NutritionSymptom,
    TraceabilityRecord,
)


@admin.register(FarmLocation)
class FarmLocationAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "user", "province", "district", "crop_type", "is_default")
    search_fields = ("name", "province", "district", "ward", "crop_type")


@admin.register(FarmPlot)
class FarmPlotAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "user", "crop_type", "growth_stage", "is_active")
    search_fields = ("name", "crop_type", "address_text")


@admin.register(CultivationLog)
class CultivationLogAdmin(admin.ModelAdmin):
    list_display = ("id", "plot", "activity_type", "activity_date", "title", "user")
    list_filter = ("activity_type",)


@admin.register(TraceabilityRecord)
class TraceabilityRecordAdmin(admin.ModelAdmin):
    list_display = ("id", "product_name", "plot", "public_token", "is_public")
    search_fields = ("product_name", "public_token")


@admin.register(AgriculturalInput)
class AgriculturalInputAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "category", "group", "active_ingredient", "is_active")
    list_filter = ("category", "is_active")
    search_fields = ("name", "group", "active_ingredient")


@admin.register(NutritionSymptom)
class NutritionSymptomAdmin(admin.ModelAdmin):
    list_display = ("id", "nutrient")
    search_fields = ("nutrient", "symptom")
