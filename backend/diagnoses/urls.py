from django.urls import path

from .views import DiagnosisDetailAPIView, DiagnosisListCreateAPIView

urlpatterns = [
    path("", DiagnosisListCreateAPIView.as_view(), name="diagnosis-list-create"),
    path("<int:pk>/", DiagnosisDetailAPIView.as_view(), name="diagnosis-detail"),
]
