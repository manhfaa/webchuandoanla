from django.urls import path

from .views import DiagnosisCnnAPIView, DiagnosisDetailAPIView, DiagnosisListCreateAPIView

urlpatterns = [
    path("", DiagnosisListCreateAPIView.as_view(), name="diagnosis-list-create"),
    path("cnn/", DiagnosisCnnAPIView.as_view(), name="diagnosis-cnn"),
    path("<int:pk>/", DiagnosisDetailAPIView.as_view(), name="diagnosis-detail"),
]
