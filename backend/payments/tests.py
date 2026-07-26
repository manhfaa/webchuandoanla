import hashlib
import hmac
import json
import re
import time
import unittest
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.cache import cache
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from engagement.models import ServicePlan, UserSubscription

from .admin import PaymentOrderAdmin
from .entitlements import enforce_limit, PlanLimitExceeded, resolve_entitlements
from .models import Payment, PaymentOrder
from .services import (
    PaymentRequestError,
    build_qr_url,
    reconcile_order,
    settle_order_from_bank_statement,
)

FRONTEND_PLAN_CATALOGUE = Path(__file__).resolve().parents[2] / "src" / "data" / "mock" / "plans.ts"

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
        # Order creation is throttled at 30/hour and the counter lives in a
        # cache that survives between tests, so without this the suite fails
        # or passes depending on how many orders the tests before it made.
        cache.clear()
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

    def signed_webhook(self, order, transaction_id, amount, age_seconds=0, **overrides):
        """`age_seconds` backdates the signature, to stand in for a SePay retry
        that reaches us long after the delivery it is retrying."""
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
        timestamp = str(int(time.time()) - age_seconds)
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

    def test_retry_signed_long_after_the_original_still_activates(self):
        """SePay abandons a delivery after 30s and queues a retry, while a
        sleeping free-tier instance needs ~35s just to wake. The delivery that
        lands is often that retry; rejecting it loses a real payment."""
        order, _ = self.create_order()
        response = self.signed_webhook(order, "7101", 39000, age_seconds=50 * 60)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["result"], "paid")
        order.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(order.status, PaymentOrder.Status.PAID)
        self.assertEqual(self.user.current_plan, "bloom")

    def test_a_replay_inside_the_window_never_activates_twice(self):
        """The window is not what stops replay — the transaction id is. That is
        the property that makes a wide window safe, so it is asserted here."""
        order, _ = self.create_order()
        self.assertEqual(self.signed_webhook(order, "7102", 39000).data["result"], "paid")
        self.user.refresh_from_db()
        expiry_after_payment = self.user.plan_expires_at

        replay = self.signed_webhook(order, "7102", 39000, age_seconds=45 * 60)

        self.assertEqual(replay.status_code, status.HTTP_200_OK)
        self.assertEqual(replay.data["result"], "duplicate")
        self.user.refresh_from_db()
        self.assertEqual(self.user.plan_expires_at, expiry_after_payment)
        self.assertEqual(Payment.objects.filter(sepay_transaction_id="7102").count(), 1)

    def test_stale_webhook_is_rejected(self):
        """Derived from the configured window rather than a fixed number, so
        widening the window cannot quietly turn this into a no-op."""
        raw_body = b'{"id":"5001","transferAmount":39000}'
        beyond_window = int(settings.SEPAY_WEBHOOK_MAX_AGE_SECONDS) + 60
        timestamp = str(int(time.time()) - beyond_window)
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

    def test_payment_status_rejects_a_non_uuid_order_id(self):
        response = self.client.get(reverse("payment_status"), {"order_id": "not-a-uuid"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_subscription_summary_exposes_expiry_and_entitlements(self):
        order, _ = self.create_order()
        self.signed_webhook(order, "8001", 39000)
        self.user.refresh_from_db()

        response = self.client.get(reverse("payment_subscription"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["current_plan"], "bloom")
        self.assertEqual(response.data["plan_expires_at"], self.user.plan_expires_at)
        self.assertEqual(response.data["days_remaining"], 29)
        self.assertEqual(response.data["subscription"]["plan"], "bloom")
        self.assertEqual(response.data["subscription"]["status"], "active")
        self.assertEqual(response.data["entitlements"]["plan"], "bloom")

    def test_order_detail_carries_bank_details_so_a_reload_can_resume(self):
        order, created = self.create_order()
        response = self.client.get(reverse("payment_order_detail", kwargs={"order_id": order.id}))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["bank"]["account_number"], "123456789")
        self.assertEqual(response.data["qr_url"], created.data["qr_url"])
        self.assertEqual(response.data["order"]["payment_code"], order.payment_code)
        self.assertFalse(response.data["order"]["needs_reconciliation"])

    def test_entitlements_follow_the_catalogue_and_lapse_with_the_plan(self):
        grow = ServicePlan.objects.get(slug="grow")
        self.user.current_plan = "grow"
        self.user.plan_expires_at = timezone.now() + timezone.timedelta(days=5)
        self.user.save(update_fields=["current_plan", "plan_expires_at", "updated_at"])

        entitlements = resolve_entitlements(self.user)
        self.assertEqual(entitlements["plan"], "grow")
        self.assertEqual(entitlements["limits"]["daily_diagnoses"], grow.metadata["daily_diagnoses"])
        self.assertEqual(entitlements["limits"]["history_days"], grow.metadata["history_days"])
        self.assertEqual(entitlements["limits"]["crop_plans"], 2)

        # A lapsed expiry must not keep granting the paid limits, even before
        # the lazy reset writes "seed" back onto the row.
        self.user.plan_expires_at = timezone.now() - timezone.timedelta(minutes=1)
        self.user.save(update_fields=["plan_expires_at", "updated_at"])
        self.assertEqual(resolve_entitlements(self.user)["plan"], "seed")

    def test_enforce_limit_raises_payment_required_with_an_upgrade_hint(self):
        self.user.current_plan = "grow"
        self.user.plan_expires_at = timezone.now() + timezone.timedelta(days=5)
        self.user.save(update_fields=["current_plan", "plan_expires_at", "updated_at"])

        self.assertEqual(enforce_limit(self.user, "crop_plans", used=1), 2)
        with self.assertRaises(PlanLimitExceeded) as raised:
            enforce_limit(self.user, "crop_plans", used=2)
        self.assertEqual(raised.exception.status_code, 402)
        self.assertEqual(raised.exception.detail["upgrade_to"], "bloom")
        self.assertEqual(raised.exception.detail["limit"], 2)

        # Bloom and Elite sell "unlimited", which the catalogue stores as 0.
        self.user.current_plan = "elite"
        self.user.save(update_fields=["current_plan", "updated_at"])
        self.assertIsNone(enforce_limit(self.user, "daily_diagnoses", used=10_000))

    def test_overpaid_order_is_reused_instead_of_minting_a_second_code(self):
        order, _ = self.create_order()
        self.signed_webhook(order, "9001", 50000)
        order.refresh_from_db()
        self.assertEqual(order.status, PaymentOrder.Status.OVERPAID)

        again = self.client.post(reverse("payment_order_list_create"), {"plan": "bloom"}, format="json")
        self.assertEqual(again.status_code, status.HTTP_200_OK)
        self.assertFalse(again.data["created"])
        self.assertEqual(again.data["order"]["transfer_content"], order.payment_code)
        self.assertEqual(PaymentOrder.objects.filter(user=self.user, plan=self.bloom).count(), 1)
        self.assertTrue(again.data["needs_reconciliation"])

    def test_owner_can_request_reconciliation_and_staff_can_activate(self):
        order, _ = self.create_order()
        self.signed_webhook(order, "9101", 50000)
        order.refresh_from_db()

        url = reverse("payment_order_reconcile", kwargs={"order_id": order.id})
        response = self.client.post(url, {"note": "Chuyển dư 11.000đ"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data["order"]["reconciliation"]["requested_at"])
        order.refresh_from_db()
        self.assertEqual(order.metadata["reconciliation"]["user_note"], "Chuyển dư 11.000đ")

        # Another account must not be able to touch it.
        self.client.force_authenticate(self.other_user)
        self.assertEqual(self.client.post(url, {}, format="json").status_code, status.HTTP_404_NOT_FOUND)
        self.client.force_authenticate(self.user)

        reconcile_order(order, actor=self.other_user, note="Đã đối soát")
        order.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(order.status, PaymentOrder.Status.PAID)
        self.assertEqual(self.user.current_plan, "bloom")
        self.assertIsNotNone(self.user.plan_expires_at)
        self.assertEqual(order.metadata["reconciliation"]["action"], "activated")
        self.assertEqual(order.metadata["reconciliation"]["amount_difference"], 11000)
        self.assertEqual(UserSubscription.objects.filter(user=self.user, status="active").count(), 1)
        self.assertIn("reconcile_and_activate", PaymentOrderAdmin.actions)

    def test_reconciliation_is_not_offered_for_orders_without_money(self):
        order, _ = self.create_order()
        url = reverse("payment_order_reconcile", kwargs={"order_id": order.id})
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_downgrade_is_refused_with_a_readable_vietnamese_message(self):
        self.user.current_plan = "elite"
        self.user.plan_expires_at = timezone.now() + timezone.timedelta(days=10)
        self.user.save(update_fields=["current_plan", "plan_expires_at", "updated_at"])

        response = self.client.post(reverse("payment_order_list_create"), {"plan": "grow"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        message = response.data["error"]
        self.assertIn("Seed", message)
        # The old copy was unaccented ASCII, which reads as broken Vietnamese.
        self.assertTrue(any(character in message for character in "ạảãáàăâđêôơư"))

    @unittest.skipUnless(FRONTEND_PLAN_CATALOGUE.exists(), "frontend catalogue not present in this deployment")
    def test_frontend_fallback_catalogue_matches_the_service_plans(self):
        """The pricing screen falls back to a checked-in catalogue when the API
        is unreachable, so a price edited on only one side has to fail here."""
        source = FRONTEND_PLAN_CATALOGUE.read_text(encoding="utf-8")
        entries = re.findall(r'id:\s*"([a-z]+)".*?price:\s*"([^"]+)"', source, re.DOTALL)
        self.assertTrue(entries, "no plans parsed from the frontend catalogue")

        for slug, price_label in entries:
            with self.subTest(plan=slug):
                digits = re.sub(r"[^0-9]", "", price_label)
                expected = Decimal(digits or 0)
                plan = ServicePlan.objects.filter(slug=slug).first()
                self.assertIsNotNone(plan, f"plan {slug} is sold in the UI but missing from the catalogue")
                self.assertEqual(
                    plan.price_monthly,
                    expected,
                    f"{slug}: frontend shows {price_label} but the catalogue charges {plan.price_monthly}",
                )


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
class BankStatementSettlementTests(APITestCase):
    """When the gateway loses a transaction entirely, amount_received stays 0
    and reconcile_order refuses — so a customer who really paid has no way
    through, not even an admin one. This is that way through."""

    def setUp(self):
        # Order creation is throttled at 30/hour and the counter lives in a
        # cache that survives between tests, so without this the suite fails
        # or passes depending on how many orders the tests before it made.
        cache.clear()
        self.user = User.objects.create_user(
            username="paid", email="paid@example.com", password="strong-password"
        )
        self.admin = User.objects.create_user(
            username="operator", email="operator@example.com", password="strong-password"
        )
        self.plan = ServicePlan.objects.update_or_create(
            slug="grow",
            defaults={"name": "Grow", "price_monthly": 9000, "currency": "VND", "is_active": True},
        )[0]
        self.client.force_authenticate(self.user)
        response = self.client.post(reverse("payment_order_list_create"), {"plan": "grow"}, format="json")
        self.order = PaymentOrder.objects.get(id=response.data["order"]["id"])

    def test_reconcile_alone_cannot_rescue_an_order_the_webhook_never_saw(self):
        """The gap this exists to close, asserted so it cannot silently return."""
        with self.assertRaises(PaymentRequestError):
            reconcile_order(self.order, actor=self.admin)

    def test_settling_from_the_statement_activates_the_plan(self):
        settle_order_from_bank_statement(
            self.order, self.order.amount_expected, actor=self.admin, note="Sao kê BIDV 26/07."
        )

        self.order.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(self.order.status, PaymentOrder.Status.PAID)
        self.assertEqual(self.order.amount_received, 9000)
        self.assertEqual(self.user.current_plan, "grow")
        self.assertIsNotNone(self.user.plan_expires_at)
        self.assertEqual(UserSubscription.objects.filter(user=self.user, status="active").count(), 1)

    def test_the_record_is_marked_manual_not_gateway_confirmed(self):
        """A person vouching for a statement is not the gateway confirming a
        transfer, and an audit has to be able to tell them apart."""
        settle_order_from_bank_statement(
            self.order, self.order.amount_expected, actor=self.admin, note="Sao kê BIDV."
        )

        payment = Payment.objects.get(sepay_transaction_id=f"manual-{self.order.payment_code}")
        self.assertEqual(payment.gateway, "manual")
        self.assertEqual(payment.raw_payload["source"], "bank_statement")
        self.assertEqual(payment.raw_payload["recorded_by"], self.admin.email)
        self.order.refresh_from_db()
        self.assertEqual(
            self.order.metadata["reconciliation"]["action"], "activated_from_bank_statement"
        )
        self.assertEqual(self.order.metadata["reconciliation"]["resolved_by"], self.admin.email)

    def test_running_it_twice_does_not_pay_the_plan_twice(self):
        settle_order_from_bank_statement(self.order, self.order.amount_expected, actor=self.admin)
        self.user.refresh_from_db()
        first_expiry = self.user.plan_expires_at

        with self.assertRaises(PaymentRequestError):
            settle_order_from_bank_statement(self.order, self.order.amount_expected, actor=self.admin)

        self.user.refresh_from_db()
        self.assertEqual(self.user.plan_expires_at, first_expiry)
        self.assertEqual(Payment.objects.filter(order=self.order).count(), 1)

    def test_it_refuses_to_undercharge(self):
        with self.assertRaises(PaymentRequestError):
            settle_order_from_bank_statement(self.order, 5000, actor=self.admin)

        self.order.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(self.order.status, PaymentOrder.Status.PENDING)
        self.assertEqual(self.user.current_plan, "seed")

    def test_it_defers_to_the_gateway_when_the_gateway_did_report(self):
        """An order the webhook already touched must go through the normal
        reconcile path, so the two never both write the received amount."""
        self.order.amount_received = 9000
        self.order.save(update_fields=["amount_received"])

        with self.assertRaises(PaymentRequestError):
            settle_order_from_bank_statement(self.order, 9000, actor=self.admin)


@override_settings(
    SEPAY_WEBHOOK_SECRET="test-webhook-secret",
    SEPAY_API_KEY="",
    SEPAY_BANK_CODE="BIDV",
    SEPAY_BANK_NAME="BIDV",
    SEPAY_ACCOUNT_NUMBER="8807986170",
    SEPAY_VIRTUAL_ACCOUNT="96247DCJZK",
    SEPAY_ACCOUNT_NAME="PHAM DUC MANH",
    SEPAY_PAYMENT_PREFIX="AGM",
    SEPAY_ORDER_TTL_MINUTES=30,
    SEPAY_SUBSCRIPTION_DAYS=30,
)
class VirtualAccountTests(APITestCase):
    """BIDV only reports a transfer to SePay when it arrives through a virtual
    account — SePay's own QR builder states it — so quoting the master account
    produced transfers that reached the bank and were never seen by the gateway.
    The payer must be given the virtual account, while the webhook still reports
    the master one, so validation has to accept either."""

    def setUp(self):
        # Order creation is throttled at 30/hour and the counter lives in a
        # cache that survives between tests, so without this the suite fails
        # or passes depending on how many orders the tests before it made.
        cache.clear()
        self.user = User.objects.create_user(
            username="va", email="va@example.com", password="strong-password"
        )
        ServicePlan.objects.update_or_create(
            slug="grow",
            defaults={"name": "Grow", "price_monthly": 9000, "currency": "VND", "is_active": True},
        )
        self.client.force_authenticate(self.user)
        response = self.client.post(
            reverse("payment_order_list_create"), {"plan": "grow"}, format="json"
        )
        self.response = response
        self.order = PaymentOrder.objects.get(id=response.data["order"]["id"])

    def webhook(self, transaction_id, **overrides):
        payload = {
            "id": transaction_id,
            "gateway": "BIDV",
            "accountNumber": "8807986170",
            "code": self.order.payment_code,
            "content": self.order.payment_code,
            "transferType": "in",
            "transferAmount": 9000,
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
        return self.client.post(
            reverse("sepay_webhook_v2"),
            data=raw_body,
            content_type="application/json",
            HTTP_X_SEPAY_TIMESTAMP=timestamp,
            HTTP_X_SEPAY_SIGNATURE=f"sha256={digest}",
        )

    def test_the_payer_is_given_the_virtual_account(self):
        self.assertEqual(self.response.data["bank"]["account_number"], "96247DCJZK")
        self.assertIn("acc=96247DCJZK", build_qr_url(self.order))
        # Quoting the master account is what silently lost the payment.
        self.assertNotIn("8807986170", self.response.data["bank"]["account_number"])

    def test_webhook_reporting_the_master_account_is_accepted(self):
        """The shape SePay actually sends: master account in accountNumber."""
        self.assertEqual(self.webhook("8101").data["result"], "paid")
        self.user.refresh_from_db()
        self.assertEqual(self.user.current_plan, "grow")

    def test_webhook_reporting_the_virtual_account_is_accepted(self):
        self.assertEqual(self.webhook("8102", accountNumber="96247DCJZK").data["result"], "paid")

    def test_webhook_carrying_the_virtual_account_in_sub_account_is_accepted(self):
        response = self.webhook("8103", accountNumber="8807986170", subAccount="96247DCJZK")
        self.assertEqual(response.data["result"], "paid")

    def test_a_transfer_into_somebody_elses_account_is_still_refused(self):
        """Accepting either of our own numbers must not accept a third one."""
        response = self.webhook("8104", accountNumber="999999999", subAccount="999999999")

        self.assertEqual(response.data["result"], "account_mismatch")
        self.user.refresh_from_db()
        self.assertEqual(self.user.current_plan, "seed")

    @override_settings(SEPAY_VIRTUAL_ACCOUNT="")
    def test_without_a_virtual_account_the_master_account_is_quoted(self):
        """Banks that accept transfers on the master account keep working."""
        response = self.client.post(
            reverse("payment_order_list_create"), {"plan": "grow"}, format="json"
        )
        order = PaymentOrder.objects.get(id=response.data["order"]["id"])
        self.assertEqual(response.data["bank"]["account_number"], "8807986170")
        self.assertIn("acc=8807986170", build_qr_url(order))


@override_settings(
    SEPAY_WEBHOOK_SECRET="test-webhook-secret",
    SEPAY_API_KEY="",
    SEPAY_BANK_CODE="BIDV",
    SEPAY_BANK_NAME="BIDV",
    SEPAY_ACCOUNT_NUMBER="8807986170",
    SEPAY_ACCOUNT_NAME="PHAM DUC MANH",
    SEPAY_PAYMENT_PREFIX="AGM",
    SEPAY_ORDER_TTL_MINUTES=30,
    SEPAY_SUBSCRIPTION_DAYS=30,
)
class WebhookPingTests(APITestCase):
    """SePay's test-send button posts a correctly signed payload with no
    transaction in it. Answering 400 made every test send look like a failure
    and counted towards the incident total that can suspend a webhook — for a
    request that had just proved the signature was right."""

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username="ping", email="ping@example.com", password="strong-password"
        )
        ServicePlan.objects.update_or_create(
            slug="grow",
            defaults={"name": "Grow", "price_monthly": 9000, "currency": "VND", "is_active": True},
        )

    def post_signed(self, payload):
        raw_body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        timestamp = str(int(time.time()))
        digest = hmac.new(
            b"test-webhook-secret",
            timestamp.encode("ascii") + b"." + raw_body,
            hashlib.sha256,
        ).hexdigest()
        return self.client.post(
            reverse("sepay_webhook_v2"),
            data=raw_body,
            content_type="application/json",
            HTTP_X_SEPAY_TIMESTAMP=timestamp,
            HTTP_X_SEPAY_SIGNATURE=f"sha256={digest}",
        )

    def test_a_payload_with_no_transaction_id_is_acknowledged(self):
        response = self.post_signed({"gateway": "BIDV", "transferAmount": 9000})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["result"], "no_transaction")
        self.assertEqual(response.data["reason"], "no_transaction_id")
        # Acknowledging must not look like processing.
        self.assertFalse(Payment.objects.exists())

    def test_a_payload_with_no_amount_is_acknowledged(self):
        response = self.post_signed({"id": 1, "gateway": "BIDV", "transferAmount": 0})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["reason"], "no_transfer_amount")
        self.assertFalse(Payment.objects.exists())

    def test_a_payload_naming_an_order_is_never_treated_as_a_ping(self):
        """The narrow bit that matters: quietly acknowledging a real transfer we
        failed to parse would lose someone's money, so anything referencing an
        order stays a 400 and stays visible."""
        self.client.force_authenticate(self.user)
        created = self.client.post(
            reverse("payment_order_list_create"), {"plan": "grow"}, format="json"
        )
        payment_code = created.data["order"]["transfer_content"]

        response = self.post_signed(
            {"id": 1, "gateway": "BIDV", "content": payment_code, "transferAmount": 0}
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])

    def test_an_unsigned_ping_is_still_rejected(self):
        """Relaxing the body must not relax the signature."""
        response = self.client.post(
            reverse("sepay_webhook_v2"),
            data=b'{"gateway":"BIDV"}',
            content_type="application/json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
