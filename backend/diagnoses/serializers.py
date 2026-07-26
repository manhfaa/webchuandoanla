from rest_framework import serializers

from .models import Diagnosis


class DiagnosisSerializer(serializers.ModelSerializer):
    # Retention keeps an older record out of the history list without touching
    # the row. This flag lets the result page say "vẫn được lưu, chỉ nằm ngoài
    # khoảng lịch sử của gói" instead of leaving the user to guess why a record
    # they just opened is missing from the list.
    beyond_retention = serializers.SerializerMethodField()

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
            "beyond_retention",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "beyond_retention", "created_at", "updated_at")

    def get_beyond_retention(self, obj) -> bool:
        cutoff = self.context.get("history_cutoff")
        return bool(cutoff and obj.created_at and obj.created_at < cutoff)
