from django.urls import path

from .views import (
    DiagnosisCnnAPIView,
    DiagnosisDetailAPIView,
    DiagnosisListCreateAPIView,
    DiagnosisUsageAPIView,
)

urlpatterns = [
    path("", DiagnosisListCreateAPIView.as_view(), name="diagnosis-list-create"),
    path("cnn/", DiagnosisCnnAPIView.as_view(), name="diagnosis-cnn"),
    path("usage/", DiagnosisUsageAPIView.as_view(), name="diagnosis-usage"),
    path("<int:pk>/", DiagnosisDetailAPIView.as_view(), name="diagnosis-detail"),
]
