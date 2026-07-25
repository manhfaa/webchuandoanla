from datetime import date, timedelta
from decimal import Decimal
from urllib.parse import quote_plus, urljoin

from django.conf import settings
from django.utils import timezone
from rest_framework import serializers

from .models import (
    AgriculturalInput,
    CultivationLog,
    FarmLocation,
    FarmPlot,
    NutritionSymptom,
    TraceabilityRecord,
)
from .services import fold_text, geocode_location_fields


ADDRESS_FIELDS = ("province", "district", "ward", "address_text")

# Dates outside this window are always a typo (a slipped year, a swapped
# day/month), never a real field record.
EARLIEST_FARM_DATE = date(2000, 1, 1)
FUTURE_DATE_ALLOWANCE = timedelta(days=365)

# Canonical area units keyed by their folded spelling, so "Sào", "sao" and
# "SÀO" all land on the same unit.
AREA_UNIT_ALIASES = {
    "m2": "m2",
    "m²": "m2",
    "met vuong": "m2",
    "sqm": "m2",
    "ha": "ha",
    "hecta": "ha",
    "hec ta": "ha",
    "hectare": "ha",
    "sao": "sào",
    "cong": "công",
}
AREA_UNITS = ("m2", "ha", "sào", "công")


def _validate_farm_date(value, field_label: str):
    if value is None:
        return value
    latest = timezone.localdate() + FUTURE_DATE_ALLOWANCE
    if value < EARLIEST_FARM_DATE or value > latest:
        raise serializers.ValidationError(
            f"{field_label} phải nằm trong khoảng {EARLIEST_FARM_DATE.isoformat()} đến {latest.isoformat()}."
        )
    return value


class FarmLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = FarmLocation
        fields = "__all__"
        read_only_fields = ("id", "user", "created_at", "updated_at")

    def validate(self, attrs):
        attrs = super().validate(attrs)
        instance = self.instance
        lat = attrs.get("latitude")
        lon = attrs.get("longitude")

        if lat is not None and lon is not None:
            if not (-90 <= float(lat) <= 90 and -180 <= float(lon) <= 180):
                raise serializers.ValidationError({"latitude": "Tọa độ không hợp lệ."})
            return attrs
        if (lat is None) != (lon is None):
            # Half a coordinate would otherwise be dropped without a word.
            raise serializers.ValidationError({"latitude": "Cần cả vĩ độ và kinh độ."})

        address = {
            field: attrs.get(field, getattr(instance, field, "") if instance else "") or ""
            for field in ADDRESS_FIELDS
        }

        if instance is not None:
            address_changed = any(
                field in attrs and (attrs[field] or "") != (getattr(instance, field, "") or "")
                for field in ADDRESS_FIELDS
            )
            has_coordinates = instance.latitude is not None and instance.longitude is not None
            if has_coordinates and not address_changed:
                # A partial update that leaves the address alone must keep the GPS
                # we already resolved. Re-geocoding here used to relocate the field
                # to the centre of Vietnam, because a PATCH carries no address at all.
                attrs["latitude"] = instance.latitude
                attrs["longitude"] = instance.longitude
                return attrs

        if not any(value.strip() for value in address.values()):
            raise serializers.ValidationError(
                {
                    "address_text": "Cần ít nhất tỉnh/thành, xã/phường hoặc địa chỉ chi tiết, "
                    "hoặc bấm lấy vị trí hiện tại."
                }
            )

        geocoded = geocode_location_fields(**address)
        if not geocoded:
            raise serializers.ValidationError(
                "Không xác định được tọa độ thật từ địa chỉ. Hãy bấm lấy vị trí hiện tại hoặc nhập địa chỉ rõ hơn."
            )

        attrs["latitude"] = geocoded["latitude"]
        attrs["longitude"] = geocoded["longitude"]
        metadata = dict(attrs.get("metadata") or (instance.metadata if instance else {}) or {})
        metadata["geocoding"] = {
            "source": geocoded["source"],
            "label": geocoded["label"],
        }
        attrs["metadata"] = metadata
        return attrs

    def create(self, validated_data):
        instance = super().create(validated_data)
        self._keep_single_default(instance)
        return instance

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        self._keep_single_default(instance)
        return instance

    @staticmethod
    def _keep_single_default(instance):
        """`is_default` drives which location the weather endpoints pick, so only one may hold it."""
        if not instance.is_default:
            return
        FarmLocation.objects.filter(user_id=instance.user_id, is_default=True).exclude(pk=instance.pk).update(
            is_default=False
        )


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

    def validate_diagnosis(self, diagnosis):
        # DRF accepts any primary key for a writable relation, so without this a
        # grower could staple someone else's diagnosis onto their own log (IDOR).
        request = self.context.get("request")
        if diagnosis and request and diagnosis.user_id != request.user.id:
            raise serializers.ValidationError("Bạn không có quyền dùng kết quả chẩn đoán này.")
        return diagnosis

    def validate_cost_amount(self, value):
        if value is not None and value < Decimal("0"):
            raise serializers.ValidationError("Chi phí không được là số âm.")
        return value

    def validate_materials(self, value):
        if value in (None, ""):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Danh sách vật tư phải là một danh sách.")
        return value

    def validate_activity_date(self, value):
        return _validate_farm_date(value, "Ngày thực hiện")


class PublicCultivationLogSerializer(serializers.ModelSerializer):
    """Care-timeline row for the anonymous QR page.

    Deliberately narrow: cost, materials, private metadata, the owning user and
    the linked diagnosis are the grower's business, not the consumer's. `id`
    stays because the public page needs a stable key for the row it is showing.
    """

    class Meta:
        model = CultivationLog
        fields = ("id", "activity_type", "activity_date", "title", "description", "image_url")
        read_only_fields = fields


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

    def validate_area_value(self, value):
        if value is not None and value < Decimal("0"):
            raise serializers.ValidationError("Diện tích không được là số âm.")
        return value

    def validate_area_unit(self, value):
        unit = (value or "").strip()
        if not unit:
            return "m2"
        canonical = AREA_UNIT_ALIASES.get(fold_text(unit))
        if not canonical:
            raise serializers.ValidationError(f"Đơn vị diện tích phải là một trong: {', '.join(AREA_UNITS)}.")
        return canonical

    def validate_planting_start_date(self, value):
        return _validate_farm_date(value, "Ngày xuống giống")


# What the grower may choose to publish on the QR page. Everything defaults to
# on so records created before these flags existed keep behaving as before.
PUBLIC_DISPLAY_FLAGS = ("show_logs", "show_region", "show_planting_date", "show_growth_stage")


def public_display_settings(raw) -> dict[str, bool]:
    """Normalise stored `public_settings` into the flags the public page may act on."""
    stored = raw if isinstance(raw, dict) else {}
    return {flag: bool(stored.get(flag, True)) for flag in PUBLIC_DISPLAY_FLAGS}


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

    def validate_public_settings(self, value):
        # This dict decides what an anonymous visitor sees, so it may only ever
        # hold the known booleans — not a string, not an arbitrary blob.
        if value in (None, ""):
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("Tùy chọn công khai phải là một đối tượng.")
        unknown = sorted(set(value) - set(PUBLIC_DISPLAY_FLAGS))
        if unknown:
            raise serializers.ValidationError(f"Tùy chọn công khai không hợp lệ: {', '.join(unknown)}.")
        invalid = sorted(key for key, flag in value.items() if not isinstance(flag, bool))
        if invalid:
            raise serializers.ValidationError(f"Tùy chọn công khai phải là true/false: {', '.join(invalid)}.")
        return value


AGRICULTURAL_INPUT_ENGLISH_FIELDS = (
    "name_en",
    "group_en",
    "active_ingredient_en",
    "usage_en",
    "suitable_crops_en",
    "related_diseases_en",
    "safety_notes_en",
    "warning_en",
)

NUTRITION_SYMPTOM_ENGLISH_FIELDS = (
    "nutrient_en",
    "symptom_en",
    "affected_crops_en",
    "recommendation_en",
    "safety_notes_en",
)


class AgriculturalInputSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgriculturalInput
        # "__all__" already carries the Vietnamese fields plus the optional
        # English variants listed in AGRICULTURAL_INPUT_ENGLISH_FIELDS; they may
        # be empty on rows created before the bilingual rollout, and the client
        # falls back to the Vietnamese value in that case.
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")


class NutritionSymptomSerializer(serializers.ModelSerializer):
    class Meta:
        model = NutritionSymptom
        # Same contract as above for NUTRITION_SYMPTOM_ENGLISH_FIELDS.
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")
