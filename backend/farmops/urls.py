from django.urls import path

from .views import (
    CultivationLogDetailAPIView,
    CultivationLogListCreateAPIView,
    FarmAdvisoryAPIView,
    FarmLocationDetailAPIView,
    FarmLocationListCreateAPIView,
    FarmPlotDetailAPIView,
    FarmPlotListCreateAPIView,
    InputLibraryAPIView,
    NutritionSymptomListAPIView,
    PestAlertAPIView,
    PublicTraceabilityAPIView,
    TraceabilityRecordDetailAPIView,
    TraceabilityRecordListCreateAPIView,
    WeatherAPIView,
)

urlpatterns = [
    path("farm-locations/", FarmLocationListCreateAPIView.as_view(), name="farm-location-list-create"),
    path("farm-locations/<int:pk>/", FarmLocationDetailAPIView.as_view(), name="farm-location-detail"),
    path("weather/", WeatherAPIView.as_view(), name="weather"),
    path("pest-alerts/", PestAlertAPIView.as_view(), name="pest-alerts"),
    path("farm-advisory/", FarmAdvisoryAPIView.as_view(), name="farm-advisory"),
    path("farm-plots/", FarmPlotListCreateAPIView.as_view(), name="farm-plot-list-create"),
    path("farm-plots/<int:pk>/", FarmPlotDetailAPIView.as_view(), name="farm-plot-detail"),
    path("cultivation-logs/", CultivationLogListCreateAPIView.as_view(), name="cultivation-log-list-create"),
    path("cultivation-logs/<int:pk>/", CultivationLogDetailAPIView.as_view(), name="cultivation-log-detail"),
    path("traceability/", TraceabilityRecordListCreateAPIView.as_view(), name="traceability-list-create"),
    path("traceability/<int:pk>/", TraceabilityRecordDetailAPIView.as_view(), name="traceability-detail"),
    path("traceability/public/<slug:token>/", PublicTraceabilityAPIView.as_view(), name="traceability-public"),
    path("input-library/", InputLibraryAPIView.as_view(), name="input-library"),
    path("nutrition-symptoms/", NutritionSymptomListAPIView.as_view(), name="nutrition-symptoms"),
]
