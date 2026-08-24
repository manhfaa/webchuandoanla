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
    thumbnail_url = models.TextField(blank=True, default="")
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


class ClientRequest(models.Model):
    """One answer, remembered against the id the client generated for it.

    A phone loses signal mid-upload far more often than a browser does, and the
    natural thing for the app to do is send the request again. Without this the
    retry runs the model a second time, spends a second Tavily search, or charges
    a second chat question for an answer the grower never received.

    The client sends `client_request_id` (a UUID it keeps in its local draft) and
    the same id always gets the same answer back. Scoped per user so one
    account's id can never read another's result, and per `scope` so the chat and
    the leaf check cannot collide on a shared UUID.

    Rows are disposable: `core.housekeeping` prunes anything past
    ``settings.CLIENT_REQUEST_TTL_HOURS``, because after that the client has long
    since given up and a stale replay would be more confusing than a fresh run.
    """

    SCOPE_CNN = "cnn"
    SCOPE_RESEARCH = "research"
    SCOPE_CHAT = "chat"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="client_requests",
    )
    scope = models.CharField(
        max_length=20,
        choices=(
            (SCOPE_CNN, "Leaf check"),
            (SCOPE_RESEARCH, "Symptom research"),
            (SCOPE_CHAT, "Chat answer"),
        ),
    )
    client_request_id = models.CharField(max_length=64)
    response = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "scope", "client_request_id"],
                name="unique_client_request_per_user_scope",
            )
        ]

    def __str__(self) -> str:
        return f"{self.user_id}::{self.scope}::{self.client_request_id}"
