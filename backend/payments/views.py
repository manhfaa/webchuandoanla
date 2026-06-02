import json
import logging
import re

from django.conf import settings
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import User

from .models import Payment

logger = logging.getLogger(__name__)

PLAN_PRICES = {
    "grow": 9000,
    "bloom": 39000,
    "elite": 99000,
}

PLAN_ORDER = ["seed", "grow", "bloom", "elite"]


class SepayWebhookView(APIView):
    """
    POST /api/payments/sepay-webhook/
    Nhận IPN từ SePay. Auth bằng API key trong header, không dùng JWT.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        logger.info("[SePay] Webhook: %s", json.dumps(request.data, ensure_ascii=False))

        # Xác thực API key
        auth_header = request.headers.get("Authorization", "")
        received_key = auth_header.replace("Apikey ", "").replace("Bearer ", "").strip()
        expected_key = getattr(settings, "SEPAY_API_KEY", "")

        if not expected_key or received_key != expected_key:
            logger.warning("[SePay] Unauthorized: key=%s...", received_key[:15])
            return Response({"success": False}, status=401)

        data = request.data
        transaction_id = data.get("id")
        gateway = data.get("gateway", "")
        amount = int(data.get("transferAmount", 0))
        content = data.get("content", "")
        transfer_type = data.get("transferType", "")
        reference_code = data.get("referenceCode", "")

        if transfer_type != "in":
            return Response({"success": True})

        # Chống trùng giao dịch
        if transaction_id and Payment.objects.filter(sepay_transaction_id=str(transaction_id)).exists():
            logger.info("[SePay] Duplicate: transaction_id=%s", transaction_id)
            return Response({"success": True, "message": "Already processed"})

        # Parse nội dung CK: LFQ GROW 42
        content_upper = content.upper().strip()
        match = re.search(r"LFQ[\s\-_]*(GROW|BLOOM|ELITE)[\s\-_]*(\d+)", content_upper)

        if not match:
            logger.warning("[SePay] Cannot parse content: '%s'", content)
            return Response({"success": True, "message": "Content not matched"})

        plan = match.group(1).lower()
        user_id = int(match.group(2))

        expected_price = PLAN_PRICES.get(plan, 0)
        tx_id = str(transaction_id) if transaction_id else f"manual-{timezone.now().timestamp()}"

        if amount < expected_price:
            logger.warning(
                "[SePay] Underpaid: got %d, need %d for %s user=%d",
                amount, expected_price, plan, user_id,
            )
            try:
                user = User.objects.get(id=user_id)
                Payment.objects.create(
                    user=user,
                    sepay_transaction_id=tx_id,
                    amount=amount,
                    plan_requested=plan,
                    old_plan=user.current_plan,
                    content=content,
                    status="underpaid",
                    gateway=gateway,
                    reference_number=reference_code,
                )
            except User.DoesNotExist:
                pass
            return Response({"success": True, "message": "Underpaid"})

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            logger.error("[SePay] User not found: id=%d", user_id)
            return Response({"success": True, "message": "User not found"})

        old_plan = user.current_plan
        user.current_plan = plan
        user.plan_expires_at = timezone.now() + timezone.timedelta(days=30)
        user.save(update_fields=["current_plan", "plan_expires_at", "updated_at"])

        Payment.objects.create(
            user=user,
            sepay_transaction_id=tx_id,
            amount=amount,
            plan_requested=plan,
            old_plan=old_plan,
            content=content,
            status="success",
            gateway=gateway,
            reference_number=reference_code,
        )

        logger.info(
            "[SePay] Upgraded %s: %s → %s. Amount: %d. TX: %s",
            user.email, old_plan, plan, amount, transaction_id,
        )
        return Response({"success": True})


class CheckPaymentStatusView(APIView):
    """
    GET /api/payments/status/
    Frontend poll sau khi user chuyển khoản.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        latest = user.payments.first()
        return Response(
            {
                "current_plan": user.current_plan,
                "plan_expires_at": user.plan_expires_at,
                "latest_payment": (
                    {
                        "id": latest.id,
                        "amount": latest.amount,
                        "plan_requested": latest.plan_requested,
                        "status": latest.status,
                        "created_at": latest.created_at.isoformat(),
                    }
                    if latest
                    else None
                ),
            }
        )


class CreateOrderView(APIView):
    """
    POST /api/payments/create-order/
    Body: { "plan": "grow" }
    Trả về thông tin QR + bank để frontend hiển thị.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        plan = request.data.get("plan", "").lower()

        if plan not in PLAN_PRICES:
            return Response(
                {"error": f"Gói không hợp lệ: {plan}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        current_index = PLAN_ORDER.index(user.current_plan) if user.current_plan in PLAN_ORDER else 0
        target_index = PLAN_ORDER.index(plan)

        if target_index <= current_index:
            return Response(
                {"error": f"Bạn đang dùng gói {user.current_plan}, không thể mua gói {plan}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        price = PLAN_PRICES[plan]
        transfer_content = f"LFQ {plan.upper()} {user.id}"

        qr_url = (
            f"https://qr.sepay.vn/img"
            f"?bank={settings.SEPAY_BANK_CODE}"
            f"&acc={settings.SEPAY_ACCOUNT_NUMBER}"
            f"&amount={price}"
            f"&des={transfer_content}"
            f"&template=compact"
        )

        return Response(
            {
                "order": {
                    "plan": plan,
                    "price": price,
                    "transfer_content": transfer_content,
                },
                "bank": {
                    "name": "BIDV",
                    "account_number": settings.SEPAY_ACCOUNT_NUMBER,
                    "account_name": settings.SEPAY_ACCOUNT_NAME,
                },
                "qr_url": qr_url,
            }
        )
