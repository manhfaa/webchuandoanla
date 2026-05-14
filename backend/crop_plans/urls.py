from django.urls import path

from .views import (
    CropListAPIView,
    CropLocationDetailAPIView,
    CropLocationListCreateAPIView,
    CropPlanDetailAPIView,
    CropPlanListCreateAPIView,
    CropPlanPreviewAPIView,
    CropPlanRegenerateAPIView,
    CropPlanStepCompleteAPIView,
    CropPlanStepDelayAPIView,
    CropPlanStepNoteAPIView,
    CropPlanWeatherRefreshAPIView,
    ReminderListAPIView,
    ReminderReadAPIView,
)

urlpatterns = [
    path("crops/", CropListAPIView.as_view(), name="crop-list"),
    path("locations/", CropLocationListCreateAPIView.as_view(), name="crop-location-list-create"),
    path("locations/<int:pk>/", CropLocationDetailAPIView.as_view(), name="crop-location-detail"),
    path("plans/preview/", CropPlanPreviewAPIView.as_view(), name="crop-plan-preview"),
    path("plans/", CropPlanListCreateAPIView.as_view(), name="crop-plan-list-create"),
    path("plans/<int:pk>/", CropPlanDetailAPIView.as_view(), name="crop-plan-detail"),
    path("plans/<int:pk>/regenerate/", CropPlanRegenerateAPIView.as_view(), name="crop-plan-regenerate"),
    path("plans/<int:pk>/weather-refresh/", CropPlanWeatherRefreshAPIView.as_view(), name="crop-plan-weather-refresh"),
    path("steps/<int:pk>/complete/", CropPlanStepCompleteAPIView.as_view(), name="crop-plan-step-complete"),
    path("steps/<int:pk>/delay/", CropPlanStepDelayAPIView.as_view(), name="crop-plan-step-delay"),
    path("steps/<int:pk>/notes/", CropPlanStepNoteAPIView.as_view(), name="crop-plan-step-notes"),
    path("reminders/", ReminderListAPIView.as_view(), name="reminder-list"),
    path("reminders/<int:pk>/read/", ReminderReadAPIView.as_view(), name="reminder-read"),
]

