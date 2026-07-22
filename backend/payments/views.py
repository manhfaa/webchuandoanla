import hashlib
import hmac
import json
import logging
import time

from django.conf import settings
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import PaymentOrder
from .serializers import PaymentOrderCreateSerializer, PaymentOrderSerializer
from .services import (
    OPEN_ORDER_STATUSES,
    PaymentConfigurationError,
    PaymentRequestError,
    build_qr_url,
    create_payment_order,
    expire_user_plan,
    process_sepay_payload,
)

logger = logging.getLogger(__name__)


def _mark_expired(order):
    if order.status in OPEN_ORDER_STATUSES and order.expires_at <= timezone.now():
        order.status = PaymentOrder.Status.EXPIRED
        order.save(update_fields=["status", "updated_at"])
    return order


def _order_response(order, created=False):
    payload = PaymentOrderSerializer(order).data
    return {
        **payload,
        "created": created,
        "order": {
            "id": str(order.id),
            "plan": order.plan.slug,
            "price": order.amount_expected,
            "amount_received": order.amount_received,
            "remaining_amount": max(0, order.amount_expected - order.amount_received),
            "status": order.status,
            "transfer_content": order.payment_code,
            "expires_at": order.expires_at.isoformat(),
        },
        "bank": {
            "name": getattr(settings, "SEPAY_BANK_NAME", "") or settings.SEPAY_BANK_CODE,
            "code": settings.SEPAY_BANK_CODE,
            "account_number": settings.SEPAY_ACCOUNT_NUMBER,
            "account_name": settings.SEPAY_ACCOUNT_NAME,
        },
        "qr_url": build_qr_url(order),
    }


class PaymentOrderListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "payment_orders"

    def get(self, request):
        expire_user_plan(request.user)
        orders = (
            PaymentOrder.objects.filter(user=request.user)
            .select_related("plan")
            .order_by("-created_at")[:50]
        )
        for order in orders:
            _mark_expired(order)
        return Response(PaymentOrderSerializer(orders, many=True).data)

    def post(self, request):
        serializer = PaymentOrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            order, created = create_payment_order(request.user, serializer.validated_data["plan"])
            return Response(
                _order_response(order, created=created),
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
            )
        except PaymentRequestError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except PaymentConfigurationError as exc:
            logger.error("Payment configuration error: %s", exc)
            return Response(
                {"error": "Dịch vụ thanh toán đang được cấu hình. Vui lòng thử lại sau."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class PaymentOrderDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "payment_status"

    def get(self, request, order_id):
        expire_user_plan(request.user)
        order = (
            PaymentOrder.objects.filter(id=order_id, user=request.user)
            .select_related("plan")
            .first()
        )
        if not order:
            return Response({"error": "Không tìm thấy đơn thanh toán."}, status=status.HTTP_404_NOT_FOUND)
        _mark_expired(order)
        return Response(
            {
                "order": PaymentOrderSerializer(order).data,
                "current_plan": request.user.current_plan,
                "plan_expires_at": request.user.plan_expires_at,
            }
        )


class SepayWebhookView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def _authenticate(self, request, raw_body):
        webhook_secret = getattr(settings, "SEPAY_WEBHOOK_SECRET", "").strip()
        if webhook_secret:
            signature = request.headers.get("X-SePay-Signature", "").strip()
            timestamp = request.headers.get("X-SePay-Timestamp", "").strip()
            if not signature or not timestamp:
                return False, "Thiếu chữ ký webhook."
            try:
                timestamp_value = int(timestamp)
            except ValueError:
                return False, "Timestamp webhook không hợp lệ."

            max_age = max(30, int(getattr(settings, "SEPAY_WEBHOOK_MAX_AGE_SECONDS", 300)))
            if abs(int(time.time()) - timestamp_value) > max_age:
                return False, "Webhook đã hết thời gian xác thực."

            message = timestamp.encode("ascii") + b"." + raw_body
            expected = "sha256=" + hmac.new(
                webhook_secret.encode("utf-8"),
                message,
                hashlib.sha256,
            ).hexdigest()
            if not hmac.compare_digest(expected, signature):
                return False, "Chữ ký webhook không hợp lệ."
            return True, ""

        api_key = getattr(settings, "SEPAY_API_KEY", "").strip()
        authorization = request.headers.get("Authorization", "")
        if api_key and authorization.startswith("Apikey "):
            received_key = authorization[len("Apikey "):].strip()
            if hmac.compare_digest(api_key, received_key):
                return True, ""
        return False, "Webhook chưa được cấu hình xác thực."

    def post(self, request):
        raw_body = request.body
        if len(raw_body) > 64 * 1024:
            return Response(
                {"success": False, "message": "Payload quá lớn."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        authenticated, error = self._authenticate(request, raw_body)
        if not authenticated:
            logger.warning("Rejected SePay webhook: %s", error)
            return Response(
                {"success": False, "message": error},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            payload = json.loads(raw_body.decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError
        except (UnicodeDecodeError, json.JSONDecodeError, ValueError):
            return Response(
                {"success": False, "message": "Payload JSON không hợp lệ."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = process_sepay_payload(payload)
        except PaymentRequestError as exc:
            logger.warning("Invalid SePay transaction %s: %s", payload.get("id"), exc)
            return Response(
                {"success": False, "message": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        logger.info(
            "Processed SePay transaction id=%s result=%s order=%s",
            payload.get("id"),
            result["result"],
            result["order"].id if result["order"] else None,
        )
        return Response({"success": True, "result": result["result"]})


class CreateOrderView(PaymentOrderListCreateView):
    """Compatibility endpoint for older frontend deployments."""


class CheckPaymentStatusView(APIView):
    """Compatibility endpoint. New clients should poll a specific order UUID."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "payment_status"

    def get(self, request):
        expire_user_plan(request.user)
        order_id = request.query_params.get("order_id")
        orders = PaymentOrder.objects.filter(user=request.user).select_related("plan")
        order = orders.filter(id=order_id).first() if order_id else orders.order_by("-created_at").first()
        if order:
            _mark_expired(order)
        return Response(
            {
                "current_plan": request.user.current_plan,
                "plan_expires_at": request.user.plan_expires_at,
                "order": PaymentOrderSerializer(order).data if order else None,
            }
        )
