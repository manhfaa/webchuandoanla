from django.db.models import Q
from rest_framework import generics, permissions, status
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
    TraceabilityRecordSerializer,
)
from .services import WeatherDataUnavailable, build_farm_advisory, build_pest_alerts, build_weather


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
            qs = qs.filter(plot_id=plot_id)
        if activity_type:
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

        logs = record.plot.logs.all()[:20]
        return Response(
            {
                "product_name": record.product_name,
                "plot_name": record.plot.name,
                "crop_type": record.plot.crop_type,
                "region": record.plot.address_text or getattr(record.plot.location, "address_text", ""),
                "planting_start_date": record.plot.planting_start_date,
                "growth_stage": record.plot.growth_stage,
                "created_at": record.created_at,
                "logs": CultivationLogSerializer(logs, many=True).data,
                "public_settings": record.public_settings,
                "disclaimer": "Thông tin truy xuất do chủ vườn công khai, chỉ dùng để tham khảo.",
            }
        )


class InputLibraryAPIView(generics.ListAPIView):
    serializer_class = AgriculturalInputSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = AgriculturalInput.objects.filter(is_active=True)
        category = self.request.query_params.get("category")
        query = self.request.query_params.get("q", "").strip()
        crop = self.request.query_params.get("crop", "").strip()
        disease = self.request.query_params.get("disease", "").strip()
        if category:
            qs = qs.filter(category=category)
        if query:
            qs = qs.filter(Q(name__icontains=query) | Q(group__icontains=query) | Q(active_ingredient__icontains=query))
        if crop:
            qs = qs.filter(suitable_crops__icontains=crop)
        if disease:
            qs = qs.filter(related_diseases__icontains=disease)
        return qs


class NutritionSymptomListAPIView(generics.ListAPIView):
    serializer_class = NutritionSymptomSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = NutritionSymptom.objects.all()
        query = self.request.query_params.get("q", "").strip()
        if query:
            qs = qs.filter(Q(nutrient__icontains=query) | Q(symptom__icontains=query))
        return qs
