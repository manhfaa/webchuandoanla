from rest_framework import generics, permissions

from .models import Diagnosis
from .serializers import DiagnosisSerializer


class DiagnosisListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = DiagnosisSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Diagnosis.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class DiagnosisDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DiagnosisSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Diagnosis.objects.filter(user=self.request.user)
