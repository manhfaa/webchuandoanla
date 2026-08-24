from django.conf import settings
from django.db import transaction
from django.utils.functional import cached_property
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from aiproviders import ProviderFailed, ProviderNotConfigured
from payments.entitlements import (
    PLAN_DISPLAY_NAMES,
    PlanLimitExceeded,
    next_plan_slug,
    resolve_entitlements,
)

from . import idempotency
from .models import ClientRequest, Diagnosis
from .quota import enforce_diagnosis_quota, history_cutoff, usage_summary
from .serializers import DiagnosisListSerializer, DiagnosisSerializer
from .services.action_plan import build_action_plan
from .services.cnn_classifier import CnnModelUnavailable, classify_image, image_from_payload
from .services.cnn_labels import translate_result
from .services.cnn_remote import RemoteCnnUnavailable, classify_remote, remote_cnn_enabled
from .services.image_intake import (
    ImageTooLarge,
    UnsupportedImage,
    validate as validate_image,
    validate_data_url,
)
from .services.research import run_symptom_research


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

    def get_serializer_class(self):
        return DiagnosisListSerializer if self.request.method == "GET" else DiagnosisSerializer

    def list(self, request, *args, **kwargs):
        try:
            limit = min(max(int(request.query_params.get("limit", 20)), 1), 50)
            offset = max(int(request.query_params.get("offset", 0)), 0)
        except (TypeError, ValueError):
            return Response(
                {"detail": "limit and offset must be whole numbers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = self.filter_queryset(self.get_queryset())
        count = queryset.count()
        items = queryset[offset : offset + limit]
        serializer = self.get_serializer(items, many=True)
        next_offset = offset + limit if offset + limit < count else None
        return Response(
            {
                "count": count,
                "limit": limit,
                "offset": offset,
                "next_offset": next_offset,
                "results": serializer.data,
            }
        )

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


def classify_and_enrich(*, image_data_url=None, image_file=None, top_k=5):
    """Run the model and attach the action plan.

    Shared by the JSON route the website uses and the multipart route the app
    uses, so the two cannot drift into returning different shapes for the same
    leaf. Exceptions are left to the caller: the two routes translate them into
    slightly different messages.
    """
    if remote_cnn_enabled():
        result = classify_remote(image_data_url=image_data_url, image_file=image_file, top_k=top_k)
    else:
        image = image_from_payload(image_data_url=image_data_url, image_file=image_file)
        result = classify_image(image, top_k=top_k)

    result = translate_result(result)
    result["action_plan"] = build_action_plan(
        crop_name=result.get("plant_name", ""),
        disease_name=result.get("disease_name", ""),
        confidence=float(result.get("confidence") or 0),
        validation_result=True,
        severity=result.get("severity", ""),
    )
    return result


def _parse_top_k(value) -> int:
    try:
        top_k = int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError("top_k must be a number.") from exc
    if not 1 <= top_k <= 5:
        raise ValueError("top_k must be between 1 and 5.")
    return top_k


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
            top_k = _parse_top_k(request.data.get("top_k", 5))
            if image_file is not None:
                image_file.content_type = validate_image(image_file)
            else:
                validate_data_url(image_data_url)
        except ImageTooLarge as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
        except UnsupportedImage as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = classify_and_enrich(
                image_data_url=image_data_url, image_file=image_file, top_k=top_k
            )
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


class DiagnosisCnnMultipartAPIView(APIView):
    """The leaf check as the Android app sends it: the file, not a base64 string.

    Same model, same response schema and same quota pre-check as `/cnn/`; the
    website keeps using that route unchanged. Three things are different, and all
    three exist because the caller is a phone in a field:

    * The image arrives as a file part, so it is ~33% smaller on the wire and the
      app never has to hold a base64 copy of it in memory.
    * The format is verified from the first bytes, because a multipart client can
      claim any `Content-Type` it likes.
    * `client_request_id` is required. A dropped upload that the app retries must
      return the first answer instead of running inference — and later charging
      quota — twice.
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "cnn_inference"
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        try:
            request_id = idempotency.normalize(request.data.get("client_request_id"), required=True)
        except idempotency.InvalidRequestId as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        cached = idempotency.recall(request.user, ClientRequest.SCOPE_CNN, request_id)
        if cached is not None:
            # Answered before the quota check on purpose: a retry of a call that
            # already succeeded is not a second leaf check and must not be
            # refused because the account has since hit its cap.
            return Response(cached)

        enforce_diagnosis_quota(request.user)

        try:
            top_k = _parse_top_k(request.data.get("top_k", 5))
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        image_file = request.FILES.get("image")
        try:
            image_file.content_type = validate_image(image_file)
        except ImageTooLarge as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
        except UnsupportedImage as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)

        try:
            result = classify_and_enrich(image_file=image_file, top_k=top_k)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except (CnnModelUnavailable, RemoteCnnUnavailable) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception:
            return Response(
                {"detail": "Chưa phân tích được ảnh lá. Bạn thử lại sau ít phút giúp mình nhé."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        result["client_request_id"] = request_id
        # Stored whether or not the grower goes on to save the result: the app
        # needs to be able to ask for symptom research against this exact set of
        # predictions without sending them back up, where they could be edited.
        idempotency.remember(request.user, ClientRequest.SCOPE_CNN, request_id, result)
        return Response(result)


def _require_rag(user):
    """Symptom verification is a paid feature; refuse with the plan's own words.

    Seed does not include it. Which plan does is read from the catalogue, same as
    every other cap, so moving the feature between plans stays a data change.
    Reuses `PlanLimitExceeded` (402) so the client has one "cần nâng cấp" path.
    """
    entitlements = resolve_entitlements(user)
    if entitlements["features"]["rag"]:
        return

    upgrade_slug = next_plan_slug(entitlements["plan"])
    raise PlanLimitExceeded(
        {
            "detail": (
                "Đối chiếu triệu chứng với nguồn tham khảo chưa có trong gói "
                f"{entitlements['plan_name']}. Nâng cấp lên gói "
                f"{PLAN_DISPLAY_NAMES.get(upgrade_slug, upgrade_slug)} để mở tính năng này. "
                "Bạn vẫn xem được kết quả nhận diện ảnh lá và các việc nên làm."
            ),
            "code": "plan_feature_locked",
            "plan": entitlements["plan"],
            "feature": "rag",
            "upgrade_to": upgrade_slug,
        }
    )


def _predictions_from_payload(payload):
    """Top-5 and the selected prediction, taken from a payload the server owns."""
    payload = payload if isinstance(payload, dict) else {}
    top = [p for p in (payload.get("top_predictions") or []) if isinstance(p, dict)][:5]
    selected = {
        "class_name": payload.get("class_name"),
        "plant_name": payload.get("plant_name"),
        "disease_name": payload.get("disease_name"),
        "confidence": payload.get("confidence"),
    }
    return (selected if any(selected.values()) else (top[0] if top else None)), top


class DiagnosisResearchSymptomsAPIView(APIView):
    """Verify the grower's description against web sources.

    This is the route that used to be `src/app/api/research-symptoms/route.ts`,
    where the DeepSeek and Tavily keys lived on Vercel. A native app cannot hold
    those keys and must not treat the website as a hidden backend, so the whole
    seven-stage run moved here — behind the same JWT, the same ownership check
    and the same plan gate as everything else.

    The predictions are **never** taken from the request body. The caller names
    either a diagnosis it owns or the `client_request_id` of its own leaf check,
    and the confidences are read from what the server already stored. Accepting
    them from the client would let anyone claim 99% on any disease and get a
    confident write-up back.
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "symptom_research"

    def post(self, request):
        symptoms = str(request.data.get("symptoms") or "").strip()
        if not symptoms:
            # Skipping the description is a normal choice, not an error: the
            # grower keeps the classification and simply gets no verification.
            return Response({"skipped": True, "available": True, "reason": "Không có triệu chứng để kiểm chứng."})
        if len(symptoms) > int(getattr(settings, "MAX_SYMPTOM_CHARS", 2000)):
            return Response(
                {"detail": "Mô tả triệu chứng quá dài."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            request_id = idempotency.normalize(request.data.get("client_request_id"), required=True)
        except idempotency.InvalidRequestId as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        cached = idempotency.recall(request.user, ClientRequest.SCOPE_RESEARCH, request_id)
        if cached is not None:
            return Response(cached)

        _require_rag(request.user)

        diagnosis = None
        diagnosis_id = request.data.get("diagnosis_id")
        cnn_request_id = request.data.get("cnn_request_id")

        if diagnosis_id not in (None, ""):
            diagnosis = Diagnosis.objects.filter(user=request.user, pk=diagnosis_id).first()
            if diagnosis is None:
                # 404, not 403: never confirm that another account's id exists.
                return Response(
                    {"detail": "Không tìm thấy lần kiểm tra này."}, status=status.HTTP_404_NOT_FOUND
                )
            source_payload = diagnosis.cnn_payload
        elif cnn_request_id:
            try:
                cnn_request_id = idempotency.normalize(cnn_request_id, required=True)
            except idempotency.InvalidRequestId as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            source_payload = idempotency.recall(request.user, ClientRequest.SCOPE_CNN, cnn_request_id)
            if source_payload is None:
                return Response(
                    {
                        "detail": "Kết quả phân loại của lần kiểm tra này đã hết hạn. "
                        "Bạn phân tích lại ảnh giúp mình nhé."
                    },
                    status=status.HTTP_409_CONFLICT,
                )
        else:
            return Response(
                {"detail": "Cần diagnosis_id hoặc cnn_request_id để biết đang kiểm chứng kết quả nào."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        selected, top_predictions = _predictions_from_payload(source_payload)
        if not top_predictions and selected is None:
            return Response(
                {"detail": "Lần kiểm tra này chưa có kết quả phân loại để đối chiếu."},
                status=status.HTTP_409_CONFLICT,
            )

        try:
            result = run_symptom_research(
                symptoms=symptoms,
                selected_prediction=selected,
                top_predictions=top_predictions,
            )
        except ProviderNotConfigured as exc:
            return Response(
                {"detail": exc.message, "step": exc.step, "available": False},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except ProviderFailed as exc:
            # 502 with the failing stage named. The app keeps the photo and the
            # description and offers a retry; it must never invent a summary.
            return Response(
                {"detail": exc.message, "step": exc.step, "available": True},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        result["client_request_id"] = request_id
        if diagnosis is not None:
            result["diagnosis_id"] = diagnosis.pk
            diagnosis.symptom_input = symptoms
            diagnosis.rag_summary = result["final_conclusion"]
            diagnosis.rag_payload = result
            diagnosis.save(
                update_fields=["symptom_input", "rag_summary", "rag_payload", "updated_at"]
            )

        idempotency.remember(request.user, ClientRequest.SCOPE_RESEARCH, request_id, result)
        return Response(result)
