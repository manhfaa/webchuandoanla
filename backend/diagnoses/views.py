from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Diagnosis
from .serializers import DiagnosisSerializer
from .services.cnn_classifier import CnnModelUnavailable, classify_image, image_from_payload
from .services.cnn_remote import RemoteCnnUnavailable, classify_remote, remote_cnn_enabled


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


class DiagnosisCnnAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request):
        image_data_url = request.data.get("image_data_url")
        image_file = request.FILES.get("image")

        try:
            if remote_cnn_enabled():
                result = classify_remote(image_data_url=image_data_url, image_file=image_file)
            else:
                image = image_from_payload(image_data_url=image_data_url, image_file=image_file)
                result = classify_image(image)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except (CnnModelUnavailable, RemoteCnnUnavailable) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception:
            return Response(
                {"detail": "CNN inference failed."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(result)
