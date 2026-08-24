"""Tests for the Google Play entitlement path.

The rules worth protecting here are the ones that cost real money if they break:
a redelivered purchase must not grant twice, a pending payment must not grant at
all, and the plan must come from what Google reported rather than from what the
app claimed.

Google is never called. The fakes return the payload shapes the Play Developer
API actually produces.
"""

import base64
import json
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.utils import timezone
from engagement.models import ServicePlan, UserSubscription
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import PlayPurchase

User = get_user_model()

PRODUCTS = {
    "grow": {"product_id": "agromind.grow.monthly", "base_plan_id": "monthly"},
    "bloom": {"product_id": "agromind.bloom.monthly", "base_plan_id": "monthly"},
}

# Google's own field names and values, kept verbatim.
PURCHASED = {
    "purchaseState": 0,
    "expiryTimeMillis": str(int((timezone.now() + timezone.timedelta(days=30)).timestamp() * 1000)),
    "orderId": "GPA.1234-5678",
}
PENDING = {"purchaseState": 2}


class PlayVerifyTests(APITestCase):
    URL = "/api/payments/google-play/verify/"

    def setUp(self):
        self.user = User.objects.create_user(
            username="grower", email="grower@example.com", password="Vuon-2026"
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.user).access_token}"
        )
        self.settings_patch = self.settings(
            GOOGLE_PLAY_SERVICE_ACCOUNT_FILE="/tmp/fake-sa.json",
            GOOGLE_PLAY_PACKAGE_NAME="vn.agromind.app",
            GOOGLE_PLAY_PRODUCTS=PRODUCTS,
        )
        self.settings_patch.enable()
        self.addCleanup(self.settings_patch.disable)

    def post(self, **body):
        body.setdefault("purchase_token", "token-abc-123")
        body.setdefault("product_id", "agromind.grow.monthly")
        body.setdefault("package_name", "vn.agromind.app")
        body.setdefault("client_request_id", "play-0001")
        return self.client.post(self.URL, body, format="json")

    def test_a_purchased_token_grants_the_plan_google_reported(self):
        with patch("payments.google_play.fetch_purchase", return_value=PURCHASED), patch(
            "payments.google_play.acknowledge", return_value=True
        ):
            response = self.post()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["plan"], "grow")
        self.user.refresh_from_db()
        self.assertEqual(self.user.current_plan, "grow")
        self.assertTrue(UserSubscription.objects.filter(user=self.user, status="active").exists())

    def test_the_plan_is_not_taken_from_the_request_body(self):
        """A client naming a richer plan must still get what it actually bought."""
        with patch("payments.google_play.fetch_purchase", return_value=PURCHASED), patch(
            "payments.google_play.acknowledge", return_value=True
        ):
            self.post(product_id="agromind.grow.monthly", plan="elite")

        self.user.refresh_from_db()
        self.assertEqual(self.user.current_plan, "grow")

    def test_a_redelivered_purchase_does_not_grant_twice(self):
        """Play redelivers on every launch until the purchase is acknowledged."""
        with patch("payments.google_play.fetch_purchase", return_value=PURCHASED) as fetch, patch(
            "payments.google_play.acknowledge", return_value=True
        ):
            self.post()
            self.post()

        self.assertEqual(fetch.call_count, 1)
        self.assertEqual(PlayPurchase.objects.count(), 1)
        self.assertEqual(UserSubscription.objects.filter(user=self.user, status="active").count(), 1)

    def test_a_pending_payment_grants_nothing(self):
        with patch("payments.google_play.fetch_purchase", return_value=PENDING):
            response = self.post()

        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.user.refresh_from_db()
        self.assertEqual(self.user.current_plan, "seed")
        self.assertEqual(PlayPurchase.objects.get().state, PlayPurchase.State.PENDING)

    def test_a_token_from_another_app_is_refused(self):
        with patch("payments.google_play.fetch_purchase") as fetch:
            response = self.post(package_name="com.someone.else")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        fetch.assert_not_called()

    def test_a_product_with_no_mapped_plan_fails_loudly(self):
        with patch("payments.google_play.fetch_purchase", return_value=PURCHASED):
            response = self.post(product_id="agromind.unknown.monthly")

        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.user.refresh_from_db()
        self.assertEqual(self.user.current_plan, "seed")

    def test_without_a_service_account_the_endpoint_is_unavailable(self):
        with self.settings(GOOGLE_PLAY_SERVICE_ACCOUNT_FILE=""):
            response = self.post()

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_acknowledgement_happens_after_the_grant(self):
        """Google refunds anything unacknowledged after three days."""
        order = []
        with patch(
            "payments.google_play.fetch_purchase", side_effect=lambda **_: (order.append("fetch"), PURCHASED)[1]
        ), patch("payments.google_play.acknowledge", side_effect=lambda **_: order.append("ack") or True):
            self.post()

        self.assertEqual(order, ["fetch", "ack"])
        self.user.refresh_from_db()
        self.assertEqual(self.user.current_plan, "grow")


class PlayRtdnTests(APITestCase):
    URL = "/api/payments/google-play/rtdn/"

    def setUp(self):
        self.user = User.objects.create_user(
            username="grower", email="grower@example.com", password="Vuon-2026"
        )
        self.plan = ServicePlan.objects.get(slug="grow")
        self.purchase = PlayPurchase.objects.create(
            user=self.user,
            purchase_token="token-abc-123",
            product_id="agromind.grow.monthly",
            plan="grow",
            state=PlayPurchase.State.GRANTED,
        )
        self.user.current_plan = "grow"
        self.user.plan_expires_at = timezone.now() + timezone.timedelta(days=30)
        self.user.save(update_fields=["current_plan", "plan_expires_at"])

    def push(self, notification, token="rtdn-secret"):
        encoded = base64.b64encode(json.dumps(notification).encode()).decode()
        return self.client.post(
            self.URL,
            {"message": {"data": encoded, "messageId": "1"}},
            format="json",
            HTTP_X_PLAY_RTDN_TOKEN=token,
        )

    def test_it_refuses_everyone_when_no_token_is_configured(self):
        with self.settings(GOOGLE_PLAY_RTDN_TOKEN=""):
            response = self.push({"subscriptionNotification": {"notificationType": 13, "purchaseToken": "x"}})

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_a_wrong_token_is_rejected(self):
        with self.settings(GOOGLE_PLAY_RTDN_TOKEN="rtdn-secret"):
            response = self.push(
                {"subscriptionNotification": {"notificationType": 13, "purchaseToken": "token-abc-123"}},
                token="not-the-secret",
            )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.user.refresh_from_db()
        self.assertEqual(self.user.current_plan, "grow")

    def test_an_expiry_notification_drops_the_plan(self):
        with self.settings(GOOGLE_PLAY_RTDN_TOKEN="rtdn-secret"):
            response = self.push(
                {"subscriptionNotification": {"notificationType": 13, "purchaseToken": "token-abc-123"}}
            )

        self.assertEqual(response.data["result"], "revoked")
        self.user.refresh_from_db()
        self.assertEqual(self.user.current_plan, "seed")

    def test_an_unknown_token_is_ignored_rather_than_granted(self):
        with self.settings(GOOGLE_PLAY_RTDN_TOKEN="rtdn-secret"):
            response = self.push(
                {"subscriptionNotification": {"notificationType": 4, "purchaseToken": "never-seen"}}
            )

        self.assertEqual(response.data["result"], "unknown")

    def test_an_unreadable_message_is_acknowledged_not_retried_forever(self):
        with self.settings(GOOGLE_PLAY_RTDN_TOKEN="rtdn-secret"):
            response = self.client.post(
                self.URL,
                {"message": {"data": "!!not-base64!!", "messageId": "2"}},
                format="json",
                HTTP_X_PLAY_RTDN_TOKEN="rtdn-secret",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["result"], "unreadable")
