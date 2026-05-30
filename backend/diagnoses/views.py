from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Diagnosis
from .serializers import DiagnosisSerializer
from .services.action_plan import build_action_plan
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
    permission_classes = [permissions.AllowAny]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request):
        image_data_url = request.data.get("image_data_url")
        image_file = request.FILES.get("image")
        try:
            top_k = int(request.data.get("top_k", 5))
        except (TypeError, ValueError):
            return Response({"detail": "top_k must be a number."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if remote_cnn_enabled():
                result = classify_remote(image_data_url=image_data_url, image_file=image_file, top_k=top_k)
            else:
                image = image_from_payload(image_data_url=image_data_url, image_file=image_file)
                result = classify_image(image, top_k=top_k)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except (CnnModelUnavailable, RemoteCnnUnavailable) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception:
            return Response(
                {"detail": "CNN inference failed."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        result["action_plan"] = build_action_plan(
            crop_name=result.get("plant_name", ""),
            disease_name=result.get("disease_name", ""),
            confidence=float(result.get("confidence") or 0),
            validation_result=True,
            severity=result.get("severity", ""),
        )
        return Response(result)
