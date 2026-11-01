"""Opt-in inference with separately gated live billing."""

import hashlib
import logging
import re

from django.conf import settings
from django.db import connection
from django.http import Http404
from rest_framework import permissions, status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from diagnoses.services.image_intake import ImageTooLarge, UnsupportedImage, validate
from diagnoses.views import classify_and_enrich
from .models import ApiUsage, ApiWallet, DeveloperAPIKey
from .wallets import ConcurrencyLimit, IdempotencyConflict, InsufficientBalance, finish, reserve

logger = logging.getLogger(__name__)
PRICE_VND = 200


class InferenceView(APIView):
    test_only = False
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    parser_classes = [MultiPartParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "cnn_inference"

    def initial(self, request, *args, **kwargs):
        if not (getattr(settings, "DEVELOPER_API_ENABLED", False) and
                getattr(settings, "DEVELOPER_INFERENCE_ENABLED", False)):
            raise Http404
        super().initial(request, *args, **kwargs)

    def post(self, request):
        authorization = request.headers.get("Authorization", "")
        scheme, separator, token = authorization.partition(" ")
        key = DeveloperAPIKey.authenticate_token(token) if separator and scheme.lower() == "bearer" else None
        if key is None:
            return Response({"detail": "Invalid API key."}, status=status.HTTP_401_UNAUTHORIZED)
        if self.test_only and key.environment != DeveloperAPIKey.Environment.TEST:
            return Response({"detail": "Invalid test API key."}, status=status.HTTP_401_UNAUTHORIZED)
        if key.environment == DeveloperAPIKey.Environment.LIVE and not getattr(settings, "DEVELOPER_LIVE_ENABLED", False):
            return Response({"detail": "Live API is not available."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        if connection.vendor != "postgresql":
            return Response({"detail": "Inference requires PostgreSQL."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        idem = request.headers.get("Idempotency-Key", "")
        if not re.fullmatch(r"[A-Za-z0-9._:-]{1,128}", idem):
            return Response({"detail": "A valid Idempotency-Key is required."}, status=status.HTTP_400_BAD_REQUEST)
        image = request.FILES.get("image")
        try:
            image_type = validate(image)
        except ImageTooLarge:
            return Response({"detail": "Image too large."}, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
        except UnsupportedImage:
            return Response({"detail": "Invalid image."}, status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)

        digest = hashlib.sha256()
        for chunk in image.chunks():
            digest.update(chunk)
        image.seek(0)
        image.content_type = image_type
        wallet = ApiWallet.objects.filter(organization=key.organization, environment=key.environment).first()
        if wallet is None:
            return Response({"detail": "Wallet is not funded."}, status=status.HTTP_402_PAYMENT_REQUIRED)
        try:
            usage, created = reserve(wallet.pk, key, idem, digest.hexdigest(), PRICE_VND)
        except InsufficientBalance:
            return Response({"detail": "Insufficient balance."}, status=status.HTTP_402_PAYMENT_REQUIRED)
        except ConcurrencyLimit:
            return Response({"detail": "Too many concurrent requests."}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        except IdempotencyConflict:
            return Response({"detail": "Idempotency key already used for another request."}, status=status.HTTP_409_CONFLICT)
        except ValueError:
            return Response({"detail": "API key is inactive."}, status=status.HTTP_401_UNAUTHORIZED)
        if not created:
            if usage.status == ApiUsage.Status.COMPLETED:
                response = Response(usage.result)
            elif usage.status == ApiUsage.Status.RESERVED:
                response = Response({"detail": "Request is still processing."}, status=status.HTTP_202_ACCEPTED)
            else:
                response = Response({"detail": "Request failed; use a new idempotency key."}, status=status.HTTP_409_CONFLICT)
            response["Cache-Control"] = "no-store"
            return response
        try:
            result = classify_and_enrich(image_file=image, top_k=5)
            if not isinstance(result, dict) or not result.get("plant_name"):
                raise ValueError("Model returned an incomplete result")
            finish(usage.pk, success=True, result=result)
        except Exception:
            logger.warning("Developer inference failed (usage %s)", usage.pk)
            finish(usage.pk, success=False)
            return Response({"detail": "Inference unavailable; no credit charged."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        response = Response(result)
        response["Cache-Control"] = "no-store"
        return response


class TestInferenceView(InferenceView):
    test_only = True
