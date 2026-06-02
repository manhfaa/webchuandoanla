from rest_framework import serializers

from .models import Diagnosis


class DiagnosisSerializer(serializers.ModelSerializer):
    class Meta:
        model = Diagnosis
        fields = (
            "id",
            "title",
            "image_url",
            "image_data_url",
            "image_path",
            "original_file_name",
            "input_method",
            "status",
            "is_leaf",
            "yolo_confidence",
            "yolo_payload",
            "cnn_confidence",
            "cnn_payload",
            "plant_name",
            "disease_name",
            "severity",
            "symptom_input",
            "user_question",
            "field_location",
            "note",
            "recommendations",
            "action_plan",
            "rag_summary",
            "rag_payload",
            "saved_by_user",
            "model_version",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
