from django.db import transaction
from django.utils.functional import cached_property
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import Diagnosis
from .quota import enforce_diagnosis_quota, history_cutoff, usage_summary
from .serializers import DiagnosisSerializer
from .services.action_plan import build_action_plan
from .services.cnn_classifier import CnnModelUnavailable, classify_image, image_from_payload
from .services.cnn_labels import translate_result
from .services.cnn_remote import RemoteCnnUnavailable, classify_remote, remote_cnn_enabled


class DiagnosisListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = DiagnosisSerializer
    permission_classes = [permissions.IsAuthenticated]

    @cached_property
    def retention_cutoff(self):
        return history_cutoff(self.request.user)

    def get_queryset(self):
        queryset = Diagnosis.objects.filter(user=self.request.user)
        # Retention trims what the list shows and nothing else: the rows stay in
        # the database, DiagnosisDetailAPIView still opens them by id, and
        # /api/diagnoses/usage/ reports how many are being held back so the user
        # is never left thinking older results were deleted.
        cutoff = self.retention_cutoff
        return queryset.filter(created_at__gte=cutoff) if cutoff else queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["history_cutoff"] = self.retention_cutoff
        return context

    # One transaction so the usage count and the row it authorises cannot be
    # interleaved with another request from the same account: the count is taken
    # under the account lock (see quota.lock_account) and the insert commits with
    # it, so a burst of parallel uploads still saves exactly what the plan sells.
    @transaction.atomic
    def perform_create(self, serializer):
        # The saved row is the quota unit. DiagnosisCnnAPIView pre-checks this
        # same counter before spending inference, so one leaf check costs exactly
        # one unit; enforcing here as well keeps the cap true for a direct API
        # call that never went through the model.
        enforce_diagnosis_quota(self.request.user, lock=True)
        serializer.save(user=self.request.user)


class DiagnosisDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DiagnosisSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Deliberately NOT trimmed by the retention window. A record opened by id
        # (bookmark, link from a farm log, older result the user still remembers)
        # must keep loading after a plan lapses; answering 404 would tell a
        # paying-then-lapsed grower their data was destroyed, which retention
        # never does. The serializer flags it as beyond_retention instead.
        return Diagnosis.objects.filter(user=self.request.user)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["history_cutoff"] = history_cutoff(self.request.user)
        return context


class DiagnosisUsageAPIView(APIView):
    """What the plan allows and what the account has already used.

    The dashboard renders these numbers directly so no cap is ever re-typed in
    the frontend, and the retention block carries the Vietnamese wording that
    explains why the history list is shorter than the number of saved results.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(usage_summary(request.user))


class DiagnosisCnnAPIView(APIView):
    # Inference is the most expensive thing this service does and it runs on a
    # free inference Space, so it must not be reachable anonymously. Every
    # caller is inside the authenticated dashboard and already sends a token.
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "cnn_inference"
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request):
        # Checked before the model runs, against the same saved-row counter the
        # create route enforces: the user is stopped with an actionable 402
        # instead of being handed a result they are no longer allowed to keep,
        # and the plan cap is never paid for with a wasted inference call. No
        # account lock here — this route saves nothing, so the authoritative
        # decision stays at write time and parallel uploads need not queue.
        enforce_diagnosis_quota(request.user)

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

        result = translate_result(result)
        result["action_plan"] = build_action_plan(
            crop_name=result.get("plant_name", ""),
            disease_name=result.get("disease_name", ""),
            confidence=float(result.get("confidence") or 0),
            validation_result=True,
            severity=result.get("severity", ""),
        )
        return Response(result)
