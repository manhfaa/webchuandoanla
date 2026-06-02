from django.conf import settings
from django.db import models


class Diagnosis(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="diagnoses",
    )
    title = models.CharField(max_length=180, blank=True, default="")
    image_url = models.URLField(blank=True, default="")
    image_data_url = models.TextField(blank=True, default="")
    image_path = models.CharField(max_length=500, blank=True, default="")
    original_file_name = models.CharField(max_length=255, blank=True, default="")
    input_method = models.CharField(
        max_length=20,
        choices=(
            ("upload", "Upload"),
            ("capture", "Capture"),
            ("sample", "Sample"),
        ),
        default="upload",
    )
    status = models.CharField(
        max_length=30,
        default="pending",
        choices=(
            ("pending", "Pending"),
            ("validated", "Validated"),
            ("completed", "Completed"),
            ("rejected", "Rejected"),
        ),
    )
    is_leaf = models.BooleanField(default=False)
    yolo_confidence = models.FloatField(default=0.0)
    yolo_payload = models.JSONField(default=dict, blank=True)
    cnn_confidence = models.FloatField(default=0.0)
    cnn_payload = models.JSONField(default=dict, blank=True)
    plant_name = models.CharField(max_length=120, blank=True, default="")
    disease_name = models.CharField(max_length=150, blank=True, default="")
    severity = models.CharField(max_length=50, blank=True, default="")
    symptom_input = models.TextField(blank=True, default="")
    user_question = models.TextField(blank=True, default="")
    field_location = models.CharField(max_length=150, blank=True, default="")
    note = models.TextField(blank=True, default="")
    recommendations = models.JSONField(default=list, blank=True)
    action_plan = models.JSONField(default=dict, blank=True)
    rag_summary = models.TextField(blank=True, default="")
    rag_payload = models.JSONField(default=dict, blank=True)
    saved_by_user = models.BooleanField(default=True)
    model_version = models.CharField(max_length=80, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        label = self.disease_name or "leaf-check"
        return f"{self.user.username}::{label}"
