from django.urls import path

from .views import (
    DiagnosisCnnAPIView,
    DiagnosisCnnMultipartAPIView,
    DiagnosisDetailAPIView,
    DiagnosisListCreateAPIView,
    DiagnosisResearchSymptomsAPIView,
    DiagnosisUsageAPIView,
)

urlpatterns = [
    path("", DiagnosisListCreateAPIView.as_view(), name="diagnosis-list-create"),
    path("cnn/", DiagnosisCnnAPIView.as_view(), name="diagnosis-cnn"),
    # Mobile upload path. `cnn/` stays exactly as it is so the website keeps
    # working; this one takes the file instead of a base64 data URL.
    path("cnn-multipart/", DiagnosisCnnMultipartAPIView.as_view(), name="diagnosis-cnn-multipart"),
    path(
        "research-symptoms/",
        DiagnosisResearchSymptomsAPIView.as_view(),
        name="diagnosis-research-symptoms",
    ),
    path("usage/", DiagnosisUsageAPIView.as_view(), name="diagnosis-usage"),
    path("<int:pk>/", DiagnosisDetailAPIView.as_view(), name="diagnosis-detail"),
]
