import hashlib
import hmac
import json
import logging
import time
import uuid

from django.conf import settings
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .entitlements import active_subscription, resolve_entitlements
from .models import PaymentOrder
from .serializers import (
    PaymentOrderCreateSerializer,
    PaymentOrderSerializer,
    ReconciliationRequestSerializer,
)
from .services import (
    OPEN_ORDER_STATUSES,
    PaymentConfigurationError,
    PaymentRequestError,
    build_qr_url,
    create_payment_order,
    expire_user_plan,
    payer_account_number,
    ping_reason,
    process_sepay_payload,
    request_order_reconciliation,
)

logger = logging.getLogger(__name__)


def _mark_expired(order):
    if order.status in OPEN_ORDER_STATUSES and order.expires_at <= timezone.now():
        order.status = PaymentOrder.Status.EXPIRED
        order.save(update_fields=["status", "updated_at"])
    return order


def _bank_details():
    return {
        "name": getattr(settings, "SEPAY_BANK_NAME", "") or settings.SEPAY_BANK_CODE,
        "code": settings.SEPAY_BANK_CODE,
        # The virtual account when there is one: it is the only number a payer
        # can use and still have the gateway see the transfer.
        "account_number": payer_account_number(),
        "account_name": settings.SEPAY_ACCOUNT_NAME,
    }


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
        "bank": _bank_details(),
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
        payload = {
            "order": PaymentOrderSerializer(order).data,
            "current_plan": request.user.current_plan,
            "plan_expires_at": request.user.plan_expires_at,
        }
        try:
            # Bank details and the QR let the checkout screen rebuild itself
            # after a reload instead of dropping the grower back on "create
            # order" with a transfer already in flight.
            payload["bank"] = _bank_details()
            payload["qr_url"] = build_qr_url(order)
        except PaymentConfigurationError as exc:
            logger.error("Payment configuration error: %s", exc)
        return Response(payload)


class PaymentOrderReconcileView(APIView):
    """Let the owner of a stuck order ask for it to be reviewed.

    Overpaid, late and partially paid orders never activate on their own, so
    without this the grower has paid and has no move left to make. The request
    only flags the order; a staff member still activates or refunds it.
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "payment_orders"

    def post(self, request, order_id):
        order = (
            PaymentOrder.objects.filter(id=order_id, user=request.user)
            .select_related("plan")
            .first()
        )
        if not order:
            return Response({"error": "Không tìm thấy đơn thanh toán."}, status=status.HTTP_404_NOT_FOUND)

        serializer = ReconciliationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            order = request_order_reconciliation(order, note=serializer.validated_data.get("note", ""))
        except PaymentRequestError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        logger.info("Reconciliation requested for order %s by user %s", order.payment_code, request.user.pk)
        return Response(
            {
                "order": PaymentOrderSerializer(order).data,
                "message": "Đã ghi nhận yêu cầu đối soát. Chúng tôi sẽ kiểm tra giao dịch và kích hoạt gói cho bạn.",
            }
        )


class SubscriptionSummaryView(APIView):
    """Everything the account needs to explain its own plan: what is active,
    when it ends, and the limits that come with it."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "payment_status"

    def get(self, request):
        expire_user_plan(request.user)
        now = timezone.now()
        subscription = active_subscription(request.user, now=now)
        expires_at = request.user.plan_expires_at
        days_remaining = None
        if expires_at and expires_at > now:
            days_remaining = max(0, (expires_at - now).days)

        return Response(
            {
                "current_plan": request.user.current_plan,
                "plan_expires_at": expires_at,
                "days_remaining": days_remaining,
                "entitlements": resolve_entitlements(request.user, now=now),
                "subscription": (
                    {
                        "id": subscription.id,
                        "plan": subscription.plan.slug,
                        "plan_name": subscription.plan.name,
                        "status": subscription.status,
                        "starts_at": subscription.starts_at,
                        "ends_at": subscription.ends_at,
                        "auto_renew": subscription.auto_renew,
                        "payment_provider": subscription.payment_provider,
                    }
                    if subscription
                    else None
                ),
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

        # SePay's "Gửi thử" button posts a correctly signed payload carrying no
        # transaction. Answering 400 made every test send look like a failure and
        # counted towards the incident total that can suspend a webhook — for a
        # request that had just proved the signature was right. Acknowledge it
        # without acting on it, and name the reason in the body so a ping is never
        # mistaken for a processed payment.
        ping = ping_reason(payload)
        if ping:
            logger.info("Acknowledged SePay ping (%s): %s", ping, payload)
            return Response({"success": True, "result": "no_transaction", "reason": ping})

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
        # The raw query param used to reach the ORM untouched, so any non-UUID
        # value raised a ValidationError and returned a 500.
        if order_id:
            try:
                order_uuid = uuid.UUID(str(order_id))
            except (ValueError, AttributeError, TypeError):
                return Response(
                    {"error": "Mã đơn thanh toán không hợp lệ."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            order = orders.filter(id=order_uuid).first()
        else:
            order = orders.order_by("-created_at").first()
        if order:
            _mark_expired(order)
        return Response(
            {
                "current_plan": request.user.current_plan,
                "plan_expires_at": request.user.plan_expires_at,
                "order": PaymentOrderSerializer(order).data if order else None,
            }
        )
