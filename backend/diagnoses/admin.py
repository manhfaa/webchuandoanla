from django.contrib import admin

from .models import Diagnosis, RecoveryCase, RecoveryCheckIn


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


@admin.register(RecoveryCase)
class RecoveryCaseAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "title", "plant_name", "plot", "next_check_date", "is_closed")
    list_filter = ("is_closed", "next_check_date")
    search_fields = ("user__username", "user__email", "title", "plant_name")
    readonly_fields = ("user", "baseline_diagnosis", "plot", "plant_name", "created_at", "updated_at")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(RecoveryCheckIn)
class RecoveryCheckInAdmin(admin.ModelAdmin):
    list_display = ("id", "case", "condition", "affected_leaves", "created_at")
    list_filter = ("condition", "created_at")
    readonly_fields = ("case", "diagnosis", "condition", "affected_leaves", "note", "action_taken", "created_at")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
