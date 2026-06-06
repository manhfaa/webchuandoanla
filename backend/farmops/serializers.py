from urllib.parse import quote_plus, urljoin

from django.conf import settings
from rest_framework import serializers

from .models import (
    AgriculturalInput,
    CultivationLog,
    FarmLocation,
    FarmPlot,
    NutritionSymptom,
    TraceabilityRecord,
)
from .services import geocode_location_fields


class FarmLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = FarmLocation
        fields = "__all__"
        read_only_fields = ("id", "user", "created_at", "updated_at")

    def validate(self, attrs):
        attrs = super().validate(attrs)
        lat = attrs.get("latitude")
        lon = attrs.get("longitude")
        if lat is not None and lon is not None:
            if not (-90 <= float(lat) <= 90 and -180 <= float(lon) <= 180):
                raise serializers.ValidationError("Tọa độ không hợp lệ.")
            return attrs

        geocoded = geocode_location_fields(
            province=attrs.get("province", ""),
            district=attrs.get("district", ""),
            ward=attrs.get("ward", ""),
            address_text=attrs.get("address_text", ""),
        )
        if geocoded:
            attrs["latitude"] = geocoded["latitude"]
            attrs["longitude"] = geocoded["longitude"]
            metadata = dict(attrs.get("metadata") or {})
            metadata["geocoding"] = {
                "source": geocoded["source"],
                "label": geocoded["label"],
            }
            attrs["metadata"] = metadata
        else:
            raise serializers.ValidationError(
                "Không xác định được tọa độ thật từ địa chỉ. Hãy bấm lấy vị trí hiện tại hoặc nhập địa chỉ rõ hơn."
            )
        return attrs


class CultivationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CultivationLog
        fields = "__all__"
        read_only_fields = ("id", "user", "created_at", "updated_at")

    def validate_plot(self, plot):
        request = self.context.get("request")
        if request and plot.user_id != request.user.id:
            raise serializers.ValidationError("Bạn không có quyền ghi nhật ký cho lô này.")
        return plot


class FarmPlotSerializer(serializers.ModelSerializer):
    logs = CultivationLogSerializer(many=True, read_only=True)

    class Meta:
        model = FarmPlot
        fields = "__all__"
        read_only_fields = ("id", "user", "created_at", "updated_at")

    def validate_location(self, location):
        request = self.context.get("request")
        if location and request and location.user_id != request.user.id:
            raise serializers.ValidationError("Bạn không có quyền dùng vị trí này.")
        return location


class TraceabilityRecordSerializer(serializers.ModelSerializer):
    plot_name = serializers.CharField(source="plot.name", read_only=True)
    crop_type = serializers.CharField(source="plot.crop_type", read_only=True)
    public_url = serializers.SerializerMethodField()
    qr_image_url = serializers.SerializerMethodField()

    class Meta:
        model = TraceabilityRecord
        fields = (
            "id",
            "plot",
            "plot_name",
            "crop_type",
            "public_token",
            "product_name",
            "public_settings",
            "is_public",
            "public_url",
            "qr_image_url",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "user", "public_token", "created_at", "updated_at")

    def get_public_url(self, obj):
        path = f"/trace/{obj.public_token}"
        frontend_base_url = getattr(settings, "FRONTEND_ORIGIN", "http://127.0.0.1:3000")
        return urljoin(frontend_base_url.rstrip("/") + "/", path.lstrip("/"))

    def get_qr_image_url(self, obj):
        public_url = self.get_public_url(obj)
        return f"https://api.qrserver.com/v1/create-qr-code/?size=220x220&data={quote_plus(public_url)}"

    def validate_plot(self, plot):
        request = self.context.get("request")
        if request and plot.user_id != request.user.id:
            raise serializers.ValidationError("Bạn không có quyền tạo QR cho lô này.")
        return plot


class AgriculturalInputSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgriculturalInput
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")


class NutritionSymptomSerializer(serializers.ModelSerializer):
    class Meta:
        model = NutritionSymptom
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")
