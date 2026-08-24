from rest_framework import serializers

from .models import Diagnosis
from .thumbnails import build_thumbnail_url


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
            "thumbnail_url",
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
        read_only_fields = ("id", "thumbnail_url", "beyond_retention", "created_at", "updated_at")

    def _thumbnail_fields(self, validated_data):
        image_data_url = validated_data.get("image_data_url", "")
        image_url = validated_data.get("image_url", "")
        if image_data_url:
            return {"thumbnail_url": build_thumbnail_url(image_data_url)}
        if image_url:
            return {"thumbnail_url": image_url}
        return {}

    def create(self, validated_data):
        validated_data.update(self._thumbnail_fields(validated_data))
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "image_data_url" in validated_data or "image_url" in validated_data:
            validated_data.update(self._thumbnail_fields(validated_data))
        return super().update(instance, validated_data)

    def get_beyond_retention(self, obj) -> bool:
        cutoff = self.context.get("history_cutoff")
        return bool(cutoff and obj.created_at and obj.created_at < cutoff)


class DiagnosisListSerializer(serializers.ModelSerializer):
    """History summary: never send the multi-megabyte original image."""

    beyond_retention = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = Diagnosis
        fields = (
            "id",
            "title",
            "thumbnail_url",
            "image_url",
            "image_path",
            "original_file_name",
            "input_method",
            "status",
            "is_leaf",
            "yolo_confidence",
            "cnn_confidence",
            "plant_name",
            "disease_name",
            "severity",
            "field_location",
            "note",
            "saved_by_user",
            "model_version",
            "beyond_retention",
            "created_at",
            "updated_at",
        )

    def get_beyond_retention(self, obj) -> bool:
        cutoff = self.context.get("history_cutoff")
        return bool(cutoff and obj.created_at and obj.created_at < cutoff)

    def get_thumbnail_url(self, obj) -> str:
        if obj.thumbnail_url:
            return obj.thumbnail_url
        if obj.image_url:
            return obj.image_url
        thumbnail_url = build_thumbnail_url(obj.image_data_url)
        if thumbnail_url:
            Diagnosis.objects.filter(pk=obj.pk, thumbnail_url="").update(thumbnail_url=thumbnail_url)
        return thumbnail_url
