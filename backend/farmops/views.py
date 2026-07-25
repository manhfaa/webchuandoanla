from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    AgriculturalInput,
    CultivationLog,
    FarmLocation,
    FarmPlot,
    NutritionSymptom,
    TraceabilityRecord,
)
from .serializers import (
    AgriculturalInputSerializer,
    CultivationLogSerializer,
    FarmLocationSerializer,
    FarmPlotSerializer,
    NutritionSymptomSerializer,
    PublicCultivationLogSerializer,
    TraceabilityRecordSerializer,
    public_display_settings,
)
from .services import (
    WeatherDataUnavailable,
    build_farm_advisory,
    build_pest_alerts,
    build_weather,
    contains_term,
    fold_text,
)

# Below this a crop/disease term matches too much to be useful ("a" used to
# return the whole catalogue).
MIN_TERM_LENGTH = 2


def _as_id(value, field_name: str, message: str) -> int:
    """Query-param ids reach the ORM directly, where a non-numeric value is a 500."""
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ValidationError({field_name: message})


class FarmLocationListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = FarmLocationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FarmLocation.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class FarmLocationDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FarmLocationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FarmLocation.objects.filter(user=self.request.user)


class WeatherAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_location(self, request):
        location_id = request.query_params.get("location_id")
        if location_id:
            location_id = _as_id(location_id, "location_id", "Mã vị trí canh tác không hợp lệ.")
            return FarmLocation.objects.filter(user=request.user, id=location_id).first()
        return FarmLocation.objects.filter(user=request.user).first()

    def get(self, request):
        location = self.get_location(request)
        if not location:
            return Response({"detail": "Chưa có vị trí canh tác."}, status=status.HTTP_404_NOT_FOUND)
        try:
            return Response(build_weather(location, request.query_params.get("crop", "")))
        except WeatherDataUnavailable as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


class PestAlertAPIView(WeatherAPIView):
    def get(self, request):
        location = self.get_location(request)
        if not location:
            return Response({"detail": "Chưa có vị trí canh tác."}, status=status.HTTP_404_NOT_FOUND)
        try:
            return Response(build_pest_alerts(location, request.query_params.get("crop", "")))
        except WeatherDataUnavailable as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


class FarmAdvisoryAPIView(WeatherAPIView):
    def get(self, request):
        location = self.get_location(request)
        if not location:
            return Response({"detail": "Chưa có vị trí canh tác."}, status=status.HTTP_404_NOT_FOUND)
        try:
            return Response(build_farm_advisory(location, request.query_params.get("crop", "")))
        except WeatherDataUnavailable as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


class FarmPlotListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = FarmPlotSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FarmPlot.objects.filter(user=self.request.user).select_related("location").prefetch_related("logs")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class FarmPlotDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FarmPlotSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FarmPlot.objects.filter(user=self.request.user).select_related("location").prefetch_related("logs")


class CultivationLogListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = CultivationLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = CultivationLog.objects.filter(user=self.request.user).select_related("plot", "diagnosis")
        plot_id = self.request.query_params.get("plot_id")
        activity_type = self.request.query_params.get("activity_type")
        if plot_id:
            qs = qs.filter(plot_id=_as_id(plot_id, "plot_id", "Mã lô vườn không hợp lệ."))
        if activity_type:
            if activity_type not in CultivationLog.ActivityType.values:
                raise ValidationError({"activity_type": "Loại hoạt động không hợp lệ."})
            qs = qs.filter(activity_type=activity_type)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CultivationLogDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CultivationLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CultivationLog.objects.filter(user=self.request.user)


class TraceabilityRecordListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = TraceabilityRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return TraceabilityRecord.objects.filter(user=self.request.user).select_related("plot")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TraceabilityRecordDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TraceabilityRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return TraceabilityRecord.objects.filter(user=self.request.user).select_related("plot")


class PublicTraceabilityAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        record = (
            TraceabilityRecord.objects.filter(public_token=token, is_public=True)
            .select_related("plot", "plot__location")
            .prefetch_related("plot__logs")
            .first()
        )
        if not record:
            return Response({"detail": "Không tìm thấy QR truy xuất."}, status=status.HTTP_404_NOT_FOUND)

        # Everything below is served to anonymous visitors, so it is built field
        # by field from what the grower chose to publish — never by reusing the
        # owner-facing serializers, which carry cost, materials and internal ids.
        display = public_display_settings(record.public_settings)
        logs = record.plot.logs.all()[:20] if display["show_logs"] else []
        region = record.plot.address_text or getattr(record.plot.location, "address_text", "")
        return Response(
            {
                "product_name": record.product_name,
                "plot_name": record.plot.name,
                "crop_type": record.plot.crop_type,
                "region": region if display["show_region"] else "",
                "planting_start_date": record.plot.planting_start_date if display["show_planting_date"] else None,
                "growth_stage": record.plot.growth_stage if display["show_growth_stage"] else "",
                "created_at": record.created_at,
                "logs": PublicCultivationLogSerializer(logs, many=True).data,
                "public_settings": display,
                "disclaimer": "Thông tin truy xuất do chủ vườn công khai, chỉ dùng để tham khảo.",
            }
        )


def _free_text_hit(row, fields, needle_folded: str) -> bool:
    """Loose substring match, so "dam" still finds "đạm"."""
    for field in fields:
        value = getattr(row, field, None)
        haystack = " ".join(str(part) for part in value) if isinstance(value, list) else str(value or "")
        if needle_folded in fold_text(haystack):
            return True
    return False


def _list_hit(row, fields, needle_folded: str) -> bool:
    """Membership match against list columns, in either language and either direction."""
    for field in fields:
        for entry in getattr(row, field, None) or []:
            if contains_term(entry, needle_folded) or contains_term(needle_folded, fold_text(entry)):
                return True
    return False


def _matching_pks(rows, predicate) -> list[int]:
    return [row.pk for row in rows if predicate(row)]


class InputLibraryAPIView(generics.ListAPIView):
    serializer_class = AgriculturalInputSerializer
    permission_classes = [permissions.AllowAny]

    # Vietnamese and English columns are searched together: the UI can be in
    # either language while the catalogue rows are Vietnamese-first.
    TEXT_FIELDS = (
        "name",
        "name_en",
        "group",
        "group_en",
        "active_ingredient",
        "active_ingredient_en",
        "usage",
        "usage_en",
        "suitable_crops",
        "suitable_crops_en",
        "related_diseases",
        "related_diseases_en",
    )
    CROP_FIELDS = ("suitable_crops", "suitable_crops_en")
    DISEASE_FIELDS = ("related_diseases", "related_diseases_en")

    def get_queryset(self):
        qs = AgriculturalInput.objects.filter(is_active=True)
        category = (self.request.query_params.get("category") or "").strip()
        query = fold_text(self.request.query_params.get("q", "").strip())
        crop = fold_text(self.request.query_params.get("crop", "").strip())
        disease = fold_text(self.request.query_params.get("disease", "").strip())

        if category:
            if category not in AgriculturalInput.Category.values:
                raise ValidationError(
                    {"category": f"Nhóm vật tư phải là một trong: {', '.join(AgriculturalInput.Category.values)}."}
                )
            qs = qs.filter(category=category)

        # The catalogue is a small curated table, so matching in Python buys
        # diacritic- and language-insensitive search that a LIKE over a
        # serialised JSON column cannot give on either SQLite or Postgres.
        if query:
            qs = qs.filter(pk__in=_matching_pks(qs, lambda row: _free_text_hit(row, self.TEXT_FIELDS, query)))
        if len(crop) >= MIN_TERM_LENGTH:
            qs = qs.filter(pk__in=_matching_pks(qs, lambda row: _list_hit(row, self.CROP_FIELDS, crop)))
        if len(disease) >= MIN_TERM_LENGTH:
            qs = qs.filter(pk__in=_matching_pks(qs, lambda row: _list_hit(row, self.DISEASE_FIELDS, disease)))
        return qs


class NutritionSymptomListAPIView(generics.ListAPIView):
    serializer_class = NutritionSymptomSerializer
    permission_classes = [permissions.AllowAny]

    TEXT_FIELDS = (
        "nutrient",
        "nutrient_en",
        "symptom",
        "symptom_en",
        "recommendation",
        "recommendation_en",
        "affected_crops",
        "affected_crops_en",
    )
    CROP_FIELDS = ("affected_crops", "affected_crops_en")
    # A deficiency has no disease column; the visible symptom text ("vàng lá")
    # is what a grower searching by disease is actually describing.
    SYMPTOM_FIELDS = ("nutrient", "nutrient_en", "symptom", "symptom_en", "recommendation", "recommendation_en")

    def get_queryset(self):
        qs = NutritionSymptom.objects.all()
        query = fold_text(self.request.query_params.get("q", "").strip())
        crop = fold_text(self.request.query_params.get("crop", "").strip())
        disease = fold_text(self.request.query_params.get("disease", "").strip())

        if query:
            qs = qs.filter(pk__in=_matching_pks(qs, lambda row: _free_text_hit(row, self.TEXT_FIELDS, query)))
        if len(crop) >= MIN_TERM_LENGTH:
            qs = qs.filter(pk__in=_matching_pks(qs, lambda row: _list_hit(row, self.CROP_FIELDS, crop)))
        if len(disease) >= MIN_TERM_LENGTH:
            qs = qs.filter(pk__in=_matching_pks(qs, lambda row: _free_text_hit(row, self.SYMPTOM_FIELDS, disease)))
        return qs
