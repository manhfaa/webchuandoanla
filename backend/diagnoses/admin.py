from django.contrib import admin

from .models import Diagnosis


@admin.register(Diagnosis)
class DiagnosisAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "input_method",
        "is_leaf",
        "yolo_confidence",
        "plant_name",
        "disease_name",
        "created_at",
    )
    list_filter = ("input_method", "is_leaf", "created_at")
    search_fields = ("user__username", "user__email", "plant_name", "disease_name")
