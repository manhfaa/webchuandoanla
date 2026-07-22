import hashlib
import hmac
import json
import time

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from engagement.models import ServicePlan, UserSubscription

from .models import Payment, PaymentOrder

User = get_user_model()


@override_settings(
    SEPAY_WEBHOOK_SECRET="test-webhook-secret",
    SEPAY_API_KEY="",
    SEPAY_BANK_CODE="BIDV",
    SEPAY_BANK_NAME="BIDV",
    SEPAY_ACCOUNT_NUMBER="123456789",
    SEPAY_ACCOUNT_NAME="AGROMIND AI",
    SEPAY_PAYMENT_PREFIX="AGM",
    SEPAY_ORDER_TTL_MINUTES=30,
    SEPAY_SUBSCRIPTION_DAYS=30,
)
class PaymentFlowTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="farmer",
            email="farmer@example.com",
            password="strong-password",
        )
        self.other_user = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="strong-password",
        )
        self.bloom = ServicePlan.objects.update_or_create(
            slug="bloom",
            defaults={
                "name": "Bloom",
                "price_monthly": 39000,
                "currency": "VND",
                "is_active": True,
            },
        )[0]
        ServicePlan.objects.update_or_create(
            slug="grow",
            defaults={
                "name": "Grow",
                "price_monthly": 9000,
                "currency": "VND",
                "is_active": True,
            },
        )
        self.client.force_authenticate(self.user)

    def create_order(self, plan="bloom"):
        response = self.client.post(
            reverse("payment_order_list_create"),
            {"plan": plan},
            format="json",
        )
        self.assertIn(response.status_code, (status.HTTP_200_OK, status.HTTP_201_CREATED))
        return PaymentOrder.objects.get(id=response.data["order"]["id"]), response

    def signed_webhook(self, order, transaction_id, amount, **overrides):
        payload = {
            "id": transaction_id,
            "gateway": "BIDV",
            "transactionDate": "2026-07-22 12:00:00",
            "accountNumber": "123456789",
            "code": order.payment_code,
            "content": order.payment_code,
            "transferType": "in",
            "transferAmount": amount,
            "referenceCode": f"REF{transaction_id}",
        }
        payload.update(overrides)
        raw_body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        timestamp = str(int(time.time()))
        digest = hmac.new(
            b"test-webhook-secret",
            timestamp.encode("ascii") + b"." + raw_body,
            hashlib.sha256,
        ).hexdigest()
        response = self.client.post(
            reverse("sepay_webhook_v2"),
            data=raw_body,
            content_type="application/json",
            HTTP_X_SEPAY_TIMESTAMP=timestamp,
            HTTP_X_SEPAY_SIGNATURE=f"sha256={digest}",
        )
        return response

    def test_create_order_persists_random_payment_code(self):
        order, response = self.create_order()

        self.assertEqual(response.data["order"]["price"], 39000)
        self.assertEqual(response.data["order"]["status"], "pending")
        self.assertTrue(order.payment_code.startswith("AGM"))
        self.assertEqual(len(order.payment_code), 15)
        self.assertNotIn("BLOOM", order.payment_code)
        self.assertNotIn(" ", order.payment_code)
        self.assertIn("vietqr.app/img", response.data["qr_url"])

    def test_valid_webhook_activates_subscription_once(self):
        order, _ = self.create_order()
        response = self.signed_webhook(order, "1001", 39000)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["result"], "paid")
        order.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(order.status, PaymentOrder.Status.PAID)
        self.assertEqual(order.amount_received, 39000)
        self.assertEqual(self.user.current_plan, "bloom")
        self.assertIsNotNone(self.user.plan_expires_at)
        self.assertEqual(UserSubscription.objects.filter(user=self.user, status="active").count(), 1)

        first_expiry = self.user.plan_expires_at
        duplicate = self.signed_webhook(order, "1001", 39000)
        self.assertEqual(duplicate.status_code, status.HTTP_200_OK)
        self.assertEqual(duplicate.data["result"], "duplicate")
        self.user.refresh_from_db()
        self.assertEqual(self.user.plan_expires_at, first_expiry)
        self.assertEqual(Payment.objects.filter(sepay_transaction_id="1001").count(), 1)

    def test_two_underpayments_can_complete_one_order(self):
        order, _ = self.create_order()
        first = self.signed_webhook(order, "2001", 10000)
        self.assertEqual(first.data["result"], "underpaid")
        order.refresh_from_db()
        self.assertEqual(order.status, PaymentOrder.Status.UNDERPAID)
        self.assertEqual(order.amount_received, 10000)

        second = self.signed_webhook(order, "2002", 29000)
        self.assertEqual(second.data["result"], "paid")
        order.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(order.amount_received, 39000)
        self.assertEqual(order.status, PaymentOrder.Status.PAID)
        self.assertEqual(self.user.current_plan, "bloom")

    def test_overpayment_requires_review_and_does_not_upgrade(self):
        order, _ = self.create_order()
        response = self.signed_webhook(order, "3001", 40000)

        self.assertEqual(response.data["result"], "overpaid")
        order.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(order.status, PaymentOrder.Status.OVERPAID)
        self.assertEqual(self.user.current_plan, "seed")
        self.assertFalse(UserSubscription.objects.filter(user=self.user, status="active").exists())

    def test_invalid_signature_is_rejected(self):
        order, _ = self.create_order()
        raw_body = json.dumps(
            {"id": "4001", "transferAmount": 39000, "code": order.payment_code},
            separators=(",", ":"),
        ).encode("utf-8")
        response = self.client.post(
            reverse("sepay_webhook_v2"),
            data=raw_body,
            content_type="application/json",
            HTTP_X_SEPAY_TIMESTAMP=str(int(time.time())),
            HTTP_X_SEPAY_SIGNATURE="sha256=invalid",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(Payment.objects.filter(sepay_transaction_id="4001").exists())

    def test_stale_webhook_is_rejected(self):
        raw_body = b'{"id":"5001","transferAmount":39000}'
        timestamp = str(int(time.time()) - 600)
        digest = hmac.new(
            b"test-webhook-secret",
            timestamp.encode("ascii") + b"." + raw_body,
            hashlib.sha256,
        ).hexdigest()
        response = self.client.post(
            reverse("sepay_webhook_v2"),
            data=raw_body,
            content_type="application/json",
            HTTP_X_SEPAY_TIMESTAMP=timestamp,
            HTTP_X_SEPAY_SIGNATURE=f"sha256={digest}",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_wrong_account_does_not_upgrade(self):
        order, _ = self.create_order()
        response = self.signed_webhook(
            order,
            "6001",
            39000,
            accountNumber="000000000",
        )
        self.assertEqual(response.data["result"], "account_mismatch")
        order.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(order.status, PaymentOrder.Status.PENDING)
        self.assertEqual(self.user.current_plan, "seed")

    def test_same_plan_renewal_extends_existing_subscription(self):
        first_order, _ = self.create_order()
        self.signed_webhook(first_order, "7001", 39000)
        self.user.refresh_from_db()
        first_expiry = self.user.plan_expires_at

        second_order, _ = self.create_order()
        self.assertNotEqual(second_order.id, first_order.id)
        second = self.signed_webhook(second_order, "7002", 39000)
        self.assertEqual(second.data["result"], "paid")

        self.user.refresh_from_db()
        self.assertGreater(self.user.plan_expires_at, first_expiry + timezone.timedelta(days=29))
        self.assertEqual(UserSubscription.objects.filter(user=self.user, status="active").count(), 1)

    def test_expired_plan_is_reset_when_profile_is_loaded(self):
        subscription = UserSubscription.objects.create(
            user=self.user,
            plan=self.bloom,
            status="active",
            starts_at=timezone.now() - timezone.timedelta(days=31),
            ends_at=timezone.now() - timezone.timedelta(minutes=1),
            payment_provider="sepay",
        )
        self.user.current_plan = "bloom"
        self.user.plan_expires_at = subscription.ends_at
        self.user.save(update_fields=["current_plan", "plan_expires_at", "updated_at"])

        access_token = str(RefreshToken.for_user(self.user).access_token)
        self.client.force_authenticate(user=None)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        response = self.client.get(reverse("me"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["current_plan"], "seed")
        subscription.refresh_from_db()
        self.assertEqual(subscription.status, "expired")

    def test_order_status_is_private_to_owner(self):
        order, _ = self.create_order()
        self.client.force_authenticate(self.other_user)
        response = self.client.get(
            reverse("payment_order_detail", kwargs={"order_id": order.id})
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_subscription_api_cannot_be_used_to_self_upgrade(self):
        response = self.client.post(
            reverse("subscription-list-create"),
            {
                "plan_id": self.bloom.id,
                "status": "active",
                "starts_at": "2026-07-22T00:00:00Z",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertFalse(UserSubscription.objects.filter(user=self.user).exists())

    def test_legacy_mock_transfer_endpoint_is_removed(self):
        response = self.client.post(
            "/api/engagement/verify-transfer/",
            {"transfer_code": "PAID"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
