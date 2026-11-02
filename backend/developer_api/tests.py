from datetime import timedelta
from io import BytesIO
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APITestCase
from PIL import Image

from .models import ApiLedgerEntry, ApiTopUpOrder, ApiTopUpReconciliation, ApiTopUpTransfer, ApiWallet, DeveloperAPIKey, DeveloperOrganization
from .wallets import ConcurrencyLimit, IdempotencyConflict, InsufficientBalance, credit_wallet, finish, release_stale_reservations, reserve
from .topups import create_topup_order, reconcile_topup


class DeveloperKeyTests(TestCase):
    def setUp(self):
        user = get_user_model().objects.create_user(username="developer", email="developer@example.com", password="test-password")
        self.org = DeveloperOrganization.objects.create(owner=user, name="Example")

    def test_issue_verify_and_revoke(self):
        key, token = DeveloperAPIKey.issue(organization=self.org, name="Production", environment="live")
        self.assertTrue(token.startswith("sk_agm_live_"))
        self.assertNotEqual(key.secret_hash, token)
        self.assertEqual(DeveloperAPIKey.authenticate_token(token), key)
        self.assertIsNone(DeveloperAPIKey.authenticate_token(token + "x"))
        key.revoked_at = timezone.now()
        key.save(update_fields=["revoked_at"])
        self.assertIsNone(DeveloperAPIKey.authenticate_token(token))

    def test_inactive_organization_and_expired_key_are_rejected(self):
        key, token = DeveloperAPIKey.issue(organization=self.org, name="Test", environment="test")
        self.org.active = False
        self.org.save(update_fields=["active"])
        self.assertIsNone(DeveloperAPIKey.authenticate_token(token))
        self.org.active = True
        self.org.save(update_fields=["active"])
        key.expires_at = timezone.now() - timedelta(seconds=1)
        key.save(update_fields=["expires_at"])
        self.assertIsNone(DeveloperAPIKey.authenticate_token(token))

    def test_inactive_owner_cannot_use_key(self):
        key, token = DeveloperAPIKey.issue(organization=self.org, name="Test", environment="test")
        self.org.owner.is_active = False
        self.org.owner.save(update_fields=["is_active"])
        self.assertIsNone(DeveloperAPIKey.authenticate_token(token))
        wallet = ApiWallet.objects.create(organization=self.org, environment="test")
        credit_wallet(wallet.pk, 200, "inactive-owner-credit")
        with self.assertRaises(ValueError):
            reserve(wallet.pk, key, "request", "a" * 64, 200)

    def test_invalid_tokens_and_environments_are_rejected(self):
        for token in (None, "", "abc", "sk_agm_live_x_é", "a" * 257):
            self.assertIsNone(DeveloperAPIKey.authenticate_token(token))
        with self.assertRaises(ValueError):
            DeveloperAPIKey.issue(organization=self.org, name="Bad", environment="other")

    def test_secret_with_underscores(self):
        with patch("developer_api.models.secrets.token_urlsafe", return_value="some_secret_with_underscores"):
            key, token = DeveloperAPIKey.issue(organization=self.org, name="Test", environment="test")
        self.assertEqual(DeveloperAPIKey.authenticate_token(token), key)


@override_settings(DEVELOPER_API_ENABLED=True, DEVELOPER_INFERENCE_ENABLED=True)
class DeveloperTestInferenceTests(APITestCase):
    def setUp(self):
        user = get_user_model().objects.create_user(username="inference-owner", password="test-password")
        self.org = DeveloperOrganization.objects.create(owner=user, name="Inference")
        self.key, self.token = DeveloperAPIKey.issue(organization=self.org, name="Test", environment="test")
        self.wallet = ApiWallet.objects.create(organization=self.org, environment="test")
        credit_wallet(self.wallet.pk, 1000, "test-inference-credit")
        self.url = "/api/developer/test/diagnoses/"
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}", HTTP_IDEMPOTENCY_KEY="request-1")

    def image(self, color="green"):
        stream = BytesIO()
        Image.new("RGB", (10, 10), color=color).save(stream, format="PNG")
        return SimpleUploadedFile("leaf.png", stream.getvalue(), content_type="image/png")

    @patch("developer_api.inference.classify_and_enrich", return_value={"plant_name": "Tomato"})
    def test_success_charged_once_and_cached(self, classify):
        first = self.client.post(self.url, {"image": self.image()}, format="multipart")
        second = self.client.post(self.url, {"image": self.image()}, format="multipart")
        self.assertEqual((first.status_code, second.status_code), (200, 200))
        self.assertEqual(first["Cache-Control"], "no-store")
        self.assertEqual(classify.call_count, 1)
        self.wallet.refresh_from_db()
        self.assertEqual((self.wallet.available_vnd, self.wallet.reserved_vnd), (800, 0))
        conflict = self.client.post(self.url, {"image": self.image("red")}, format="multipart")
        self.assertEqual(conflict.status_code, 409)

    @patch("developer_api.inference.classify_and_enrich", side_effect=RuntimeError("model unavailable"))
    def test_failure_releases_test_balance(self, classify):
        response = self.client.post(self.url, {"image": self.image()}, format="multipart")
        self.assertEqual(response.status_code, 503)
        self.wallet.refresh_from_db()
        self.assertEqual((self.wallet.available_vnd, self.wallet.reserved_vnd), (1000, 0))

    def test_live_key_and_invalid_image_cannot_charge(self):
        _, live_token = DeveloperAPIKey.issue(organization=self.org, name="Live", environment="live")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {live_token}", HTTP_IDEMPOTENCY_KEY="req")
        self.assertEqual(self.client.post(self.url, {"image": self.image()}, format="multipart").status_code, 401)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}", HTTP_IDEMPOTENCY_KEY="req")
        invalid = SimpleUploadedFile("bad.png", b"not an image", content_type="image/png")
        self.assertEqual(self.client.post(self.url, {"image": invalid}, format="multipart").status_code, 415)
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_vnd, 1000)

    @patch("developer_api.inference.classify_and_enrich", return_value={"plant_name": "Tomato"})
    def test_live_billing_requires_explicit_enable_and_uses_live_balance(self, classify):
        _, live_token = DeveloperAPIKey.issue(organization=self.org, name="Live", environment="live")
        live_wallet = ApiWallet.objects.create(organization=self.org, environment="live")
        credit_wallet(live_wallet.pk, 200, "live-credit")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {live_token}", HTTP_IDEMPOTENCY_KEY="live-request")
        url = "/api/developer/v1/diagnoses/"
        self.assertEqual(self.client.post(url, {"image": self.image()}, format="multipart").status_code, 503)
        with self.settings(DEVELOPER_LIVE_ENABLED=True):
            self.assertEqual(self.client.post(url, {"image": self.image()}, format="multipart").status_code, 200)
        live_wallet.refresh_from_db()
        self.wallet.refresh_from_db()
        self.assertEqual(live_wallet.available_vnd, 0)
        self.assertEqual(self.wallet.available_vnd, 1000)
        self.assertEqual(classify.call_count, 1)

    @override_settings(DEVELOPER_INFERENCE_ENABLED=False)
    def test_disabled_by_default(self):
        self.assertEqual(self.client.post(self.url, {"image": self.image()}, format="multipart").status_code, 404)

    @override_settings(DEVELOPER_STAFF_ONLY=True)
    def test_preview_rejects_keys_owned_by_non_staff(self):
        self.assertEqual(self.client.post(self.url, {"image": self.image()}, format="multipart").status_code, 401)
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_vnd, 1000)

    @override_settings(DEVELOPER_STAFF_ONLY=True, DEVELOPER_LIVE_ENABLED=True)
    @patch("developer_api.inference.classify_and_enrich", return_value={"plant_name": "Tomato"})
    def test_allowlisted_preview_user_can_only_use_test_key(self, classify):
        with self.settings(DEVELOPER_PREVIEW_USER_IDS=str(self.org.owner_id)):
            self.assertEqual(self.client.post(self.url, {"image": self.image()}, format="multipart").status_code, 200)
            _, live_token = DeveloperAPIKey.issue(organization=self.org, name="Live", environment="live")
            self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {live_token}", HTTP_IDEMPOTENCY_KEY="live-request")
            self.assertEqual(self.client.post("/api/developer/v1/diagnoses/", {"image": self.image()}, format="multipart").status_code, 503)
        self.assertEqual(classify.call_count, 1)


class WalletTests(TestCase):
    def setUp(self):
        user = get_user_model().objects.create_user(username="owner", password="test-password")
        self.org = DeveloperOrganization.objects.create(owner=user, name="Example")
        self.key, _ = DeveloperAPIKey.issue(organization=self.org, name="Live", environment="live")
        self.wallet = ApiWallet.objects.create(organization=self.org, environment="live")

    def test_topup_and_charge_are_idempotent(self):
        credit_wallet(self.wallet.pk, 1000, "transaction-1")
        credit_wallet(self.wallet.pk, 1000, "transaction-1")
        usage, created = reserve(self.wallet.pk, self.key, "req-1", "a" * 64, 300)
        self.assertTrue(created)
        same, created = reserve(self.wallet.pk, self.key, "req-1", "a" * 64, 300)
        self.assertFalse(created)
        self.assertEqual(usage.pk, same.pk)
        finish(usage.pk, success=True, result={"ok": True})
        finish(usage.pk, success=True, result={"ok": True})
        self.wallet.refresh_from_db()
        self.assertEqual((self.wallet.available_vnd, self.wallet.reserved_vnd), (700, 0))
        self.assertEqual(ApiLedgerEntry.objects.count(), 3)
        with self.assertRaises(IdempotencyConflict):
            reserve(self.wallet.pk, self.key, "req-1", "b" * 64, 300)
        with self.assertRaises(IdempotencyConflict):
            finish(usage.pk, success=False)

    def test_failure_releases_reservation(self):
        credit_wallet(self.wallet.pk, 500, "transaction-2")
        usage, _ = reserve(self.wallet.pk, self.key, "req-2", "a" * 64, 500)
        with self.assertRaises(InsufficientBalance):
            reserve(self.wallet.pk, self.key, "req-3", "b" * 64, 1)
        finish(usage.pk, success=False)
        self.wallet.refresh_from_db()
        self.assertEqual((self.wallet.available_vnd, self.wallet.reserved_vnd), (500, 0))

    def test_concurrent_reservations_are_bounded_per_wallet(self):
        credit_wallet(self.wallet.pk, 2000, "concurrent-limit")
        for index in range(5):
            reserve(self.wallet.pk, self.key, f"request-{index}", "a" * 64, 200)
        with self.assertRaises(ConcurrencyLimit):
            reserve(self.wallet.pk, self.key, "extra", "b" * 64, 200)
        existing, created = reserve(self.wallet.pk, self.key, "request-0", "a" * 64, 200)
        self.assertFalse(created)
        finish(existing.pk, success=False)
        self.assertTrue(reserve(self.wallet.pk, self.key, "extra", "b" * 64, 200)[1])

    def test_recovery_releases_only_stale_reservations(self):
        from .models import ApiUsage

        credit_wallet(self.wallet.pk, 600, "recovery-credit")
        stale, _ = reserve(self.wallet.pk, self.key, "old", "a" * 64, 200)
        current, _ = reserve(self.wallet.pk, self.key, "new", "b" * 64, 200)
        ApiUsage.objects.filter(pk=stale.pk).update(created_at=timezone.now() - timedelta(minutes=11))
        self.assertEqual(release_stale_reservations(), 1)
        self.assertEqual(release_stale_reservations(), 0)
        self.wallet.refresh_from_db()
        self.assertEqual((self.wallet.available_vnd, self.wallet.reserved_vnd), (400, 200))
        current.refresh_from_db()
        self.assertEqual(current.status, ApiUsage.Status.RESERVED)
        with self.assertRaises(IdempotencyConflict):
            finish(stale.pk, success=True, result={"plant_name": "Tomato"})

    def test_key_cannot_spend_other_environment(self):
        wallet = ApiWallet.objects.create(organization=self.org, environment="test")
        with self.assertRaises(ValueError):
            reserve(wallet.pk, self.key, "req", "a" * 64, 1)

    def test_topup_minimum_and_arbitrary_integer_amount(self):
        for amount in (0, 1999, -1, 2000.0, True, "2000", 100_000_001):
            with self.assertRaises(ValueError):
                create_topup_order(self.wallet.pk, amount)
        for amount in (2000, 2345, 100000, 100_000_000):
            order = create_topup_order(self.wallet.pk, amount)
            self.assertEqual(order.amount_expected_vnd, amount)
            self.assertTrue(order.payment_code.startswith("AGAPI"))
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_vnd, 0)

    def test_test_wallet_cannot_accept_real_topup(self):
        wallet = ApiWallet.objects.create(organization=self.org, environment="test")
        with self.assertRaises(ValueError):
            create_topup_order(wallet.pk, 2000)

    def test_revoked_key_cannot_reserve_even_if_caller_has_stale_object(self):
        credit_wallet(self.wallet.pk, 500, "transaction-3")
        DeveloperAPIKey.objects.filter(pk=self.key.pk).update(revoked_at=timezone.now())
        with self.assertRaises(ValueError):
            reserve(self.wallet.pk, self.key, "req", "a" * 64, 100)
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_vnd, 500)


@override_settings(DEVELOPER_API_ENABLED=True)
class DeveloperManagementTests(APITestCase):
    def setUp(self):
        self.owner = get_user_model().objects.create_user(username="owner", password="test-password")
        self.other = get_user_model().objects.create_user(username="other", password="test-password")
        self.org = DeveloperOrganization.objects.create(owner=self.owner, name="Owner")
        self.url = f"/api/developer/organizations/{self.org.pk}/keys/"

    def test_create_list_and_revoke_without_exposing_secret_again(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(self.url, {"name": "Local"}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["environment"], "test")
        self.assertEqual(response["Cache-Control"], "no-store")
        secret = response.data["secret"]
        key_id = response.data["id"]
        listing = self.client.get(self.url)
        self.assertNotIn(secret, str(listing.data))
        self.assertNotIn("secret_hash", str(listing.data))
        response = self.client.post(f"{self.url}{key_id}/revoke/")
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(DeveloperAPIKey.authenticate_token(secret))

    def test_live_key_is_disabled_unless_explicitly_enabled(self):
        self.client.force_authenticate(user=self.owner)
        body = {"name": "Live", "environment": "live"}
        self.assertEqual(self.client.post(self.url, body, format="json").status_code, 503)
        with self.settings(DEVELOPER_LIVE_ENABLED=True):
            response = self.client.post(self.url, body, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["secret"].startswith("sk_agm_live_"))

    @override_settings(DEVELOPER_STAFF_ONLY=True)
    def test_staff_preview_is_private_and_only_seeds_test_wallet(self):
        self.client.force_authenticate(user=self.owner)
        self.assertEqual(self.client.get("/api/developer/organizations/").status_code, 404)
        self.assertEqual(self.client.get("/api/developer/config/").status_code, 404)
        self.owner.is_staff = True
        self.owner.save(update_fields=["is_staff"])
        config = self.client.get("/api/developer/config/")
        self.assertTrue(config.data["staff_preview"])
        self.assertFalse(config.data["live_enabled"])
        self.assertFalse(config.data["topup_enabled"])
        self.assertEqual(config["Cache-Control"], "no-store")
        response = self.client.post("/api/developer/organizations/", {"name": "Preview"}, format="json")
        self.assertEqual(response.status_code, 201)
        wallet = ApiWallet.objects.get(organization_id=response.data["id"])
        self.assertEqual((wallet.environment, wallet.available_vnd), ("test", 1000))
        self.assertFalse(ApiWallet.objects.filter(organization_id=response.data["id"], environment="live").exists())

    @override_settings(DEVELOPER_STAFF_ONLY=True, DEVELOPER_INFERENCE_ENABLED=True, DEVELOPER_LIVE_ENABLED=True, DEVELOPER_TOPUP_ENABLED=True)
    def test_allowlisted_nonstaff_has_preview_but_not_live_access(self):
        self.client.force_authenticate(user=self.owner)
        with self.settings(DEVELOPER_PREVIEW_USER_IDS=str(self.owner.pk)):
            config = self.client.get("/api/developer/config/")
            self.assertEqual(config.status_code, 200)
            self.assertFalse(config.data["live_enabled"])
            self.assertFalse(config.data["topup_enabled"])
            created = self.client.post("/api/developer/organizations/", {"name": "Preview"}, format="json")
            self.assertEqual(created.status_code, 201)
            self.assertEqual(ApiWallet.objects.get(organization_id=created.data["id"]).available_vnd, 1000)
            self.assertEqual(self.client.post(self.url, {"name": "Live", "environment": "live"}, format="json").status_code, 503)
            topups = f"/api/developer/organizations/{self.org.pk}/topups/"
            self.assertEqual(self.client.post(topups, {"amount_vnd": 2000}, format="json").status_code, 503)

    def test_another_user_cannot_list_create_or_revoke(self):
        key, _ = DeveloperAPIKey.issue(organization=self.org, name="test", environment="test")
        self.client.force_authenticate(user=self.other)
        self.assertEqual(self.client.get(self.url).status_code, 404)
        self.assertEqual(self.client.post(self.url, {"name": "bad"}, format="json").status_code, 404)
        self.assertEqual(self.client.post(f"{self.url}{key.pk}/revoke/").status_code, 404)

    def test_wallet_balance_and_ledger_are_private_and_paginated(self):
        wallet = ApiWallet.objects.create(organization=self.org, environment="live")
        for index in range(52):
            credit_wallet(wallet.pk, 1, f"test-{index}")
        url = f"/api/developer/organizations/{self.org.pk}/wallets/live/"
        self.client.force_authenticate(user=self.other)
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(self.client.get(f"{url}ledger/").status_code, 404)
        self.client.force_authenticate(user=self.owner)
        balance = self.client.get(url)
        self.assertEqual(balance.data["available_vnd"], 52)
        self.assertEqual(balance["Cache-Control"], "no-store")
        first = self.client.get(f"{url}ledger/")
        self.assertEqual(len(first.data["results"]), 50)
        self.assertEqual(first["Cache-Control"], "no-store")
        self.assertNotIn("reference", first.data["results"][0])
        second = self.client.get(f"{url}ledger/", {"before": first.data["next_before"]})
        self.assertEqual(len(second.data["results"]), 2)
        self.assertIsNone(second.data["next_before"])
        self.assertEqual(self.client.get(f"{url}ledger/", {"before": "-1"}).status_code, 400)
        self.assertEqual(self.client.get(url.replace("live", "unknown")).status_code, 404)

    def test_wallet_get_does_not_create_a_wallet(self):
        self.client.force_authenticate(user=self.owner)
        url = f"/api/developer/organizations/{self.org.pk}/wallets/test/"
        self.assertEqual(self.client.get(url).data["available_vnd"], 0)
        self.assertEqual(self.client.get(f"{url}ledger/").data["results"], [])
        self.assertFalse(ApiWallet.objects.filter(organization=self.org).exists())

    @override_settings(DEVELOPER_API_ENABLED=False)
    def test_feature_disabled(self):
        self.client.force_authenticate(user=self.owner)
        self.assertEqual(self.client.get(self.url).status_code, 404)


@override_settings(SEPAY_WEBHOOK_SECRET="", SEPAY_API_KEY="test-webhook-key", SEPAY_ACCOUNT_NUMBER="123456", SEPAY_VIRTUAL_ACCOUNT="")
class TopUpWebhookTests(APITestCase):
    def setUp(self):
        user = get_user_model().objects.create_user(username="buyer", password="test-password")
        org = DeveloperOrganization.objects.create(owner=user, name="Buyer")
        self.wallet = ApiWallet.objects.create(organization=org, environment="live")
        self.order = create_topup_order(self.wallet.pk, 2000)
        self.url = "/api/payments/webhooks/sepay/"

    def send_transfer(self, transaction_id, amount=2000, account="123456", auth="Apikey test-webhook-key"):
        return self.client.post(self.url, {"id": transaction_id, "accountNumber": account,
                                "transferType": "in", "transferAmount": amount,
                                "content": f"PAY {self.order.payment_code}"}, format="json", HTTP_AUTHORIZATION=auth)

    def test_exact_transfer_and_retry_credit_only_once(self):
        self.assertEqual(self.send_transfer(100).data["result"], "api_topup_paid")
        self.assertEqual(self.send_transfer(100).data["result"], "duplicate")
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_vnd, 2000)
        self.assertEqual(ApiTopUpTransfer.objects.count(), 1)
        self.assertEqual(ApiLedgerEntry.objects.filter(kind="topup").count(), 1)
        self.assertEqual(self.send_transfer(101).data["result"], "api_topup_already_paid")
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_vnd, 2000)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, ApiTopUpOrder.Status.REVIEW)

    def test_repeated_extra_transfers_reconcile_only_uncredited_amounts(self):
        self.assertEqual(self.send_transfer(110).data["result"], "api_topup_paid")
        self.assertEqual(self.send_transfer(111, amount=500).data["result"], "api_topup_already_paid")
        admin = get_user_model().objects.create_superuser(username="extra-admin", email="extra@example.com", password="test-password")
        reconcile_topup(order_id=self.order.pk, actor=admin, amount_vnd=2500, note="Verified first extra")
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_vnd, 2500)
        self.assertEqual(self.send_transfer(112, amount=300).data["result"], "api_topup_already_paid")
        reconcile_topup(order_id=self.order.pk, actor=admin, amount_vnd=2800, note="Verified second extra")
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_vnd, 2800)
        self.assertEqual(list(self.order.reconciliations.order_by("id").values_list("amount_vnd", flat=True)), [500, 300])

    def test_wrong_secret_and_account_do_not_credit(self):
        self.assertEqual(self.send_transfer(102, auth="Apikey wrong").status_code, 401)
        self.assertEqual(self.send_transfer(103, account="wrong").data["result"], "account_mismatch")
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_vnd, 0)

    def test_short_over_and_expired_require_review(self):
        self.assertEqual(self.send_transfer(104, amount=1999).data["result"], "api_topup_underpaid")
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, ApiTopUpOrder.Status.REVIEW)
        self.assertEqual(self.send_transfer(105, amount=1).data["result"], "api_topup_review")
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_vnd, 0)
        self.order = create_topup_order(self.wallet.pk, 2000)
        self.assertEqual(self.send_transfer(106, amount=2001).data["result"], "api_topup_overpaid")
        self.order = create_topup_order(self.wallet.pk, 2000)
        self.order.expires_at = timezone.now() - timedelta(seconds=1)
        self.order.save(update_fields=["expires_at"])
        self.assertEqual(self.send_transfer(107).data["result"], "api_topup_review")
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_vnd, 0)

    def test_review_requires_superuser_and_credits_recorded_amount_once(self):
        self.assertEqual(self.send_transfer(108, amount=2500).data["result"], "api_topup_overpaid")
        ordinary = get_user_model().objects.create_user(username="ordinary", password="test-password")
        admin = get_user_model().objects.create_superuser(username="administrator", email="admin@example.com", password="test-password")
        with self.assertRaises(PermissionError):
            reconcile_topup(order_id=self.order.pk, actor=ordinary, amount_vnd=2500, note="verified")
        with self.assertRaises(ValueError):
            reconcile_topup(order_id=self.order.pk, actor=admin, amount_vnd=2000, note="verified")
        with self.assertRaises(ValueError):
            reconcile_topup(order_id=self.order.pk, actor=admin, amount_vnd=2500, note=" ")
        reconcile_topup(order_id=self.order.pk, actor=admin, amount_vnd=2500, note="Verified in bank statement")
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_vnd, 2500)
        self.assertEqual(ApiTopUpReconciliation.objects.get(order=self.order).actor, admin)
        with self.assertRaises(ValueError):
            reconcile_topup(order_id=self.order.pk, actor=admin, amount_vnd=2500, note="verified again")

    def test_management_command_requires_matching_confirmation(self):
        from io import StringIO
        from uuid import uuid4
        from django.core.management import call_command, CommandError

        self.assertEqual(self.send_transfer(109, amount=2500).data["result"], "api_topup_overpaid")
        admin = get_user_model().objects.create_superuser(username="auditor", email="audit@example.com", password="test-password")
        kwargs = {"order": str(self.order.pk), "actor_id": admin.pk, "amount_vnd": 2500, "note": "Verified", "stdout": StringIO()}
        with self.assertRaises(CommandError):
            call_command("reconcile_api_topup", confirm_order=str(uuid4()), **kwargs)
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_vnd, 0)
        call_command("reconcile_api_topup", confirm_order=str(self.order.pk), **kwargs)
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_vnd, 2500)


@override_settings(DEVELOPER_API_ENABLED=True, DEVELOPER_TOPUP_ENABLED=True, DEVELOPER_LIVE_ENABLED=True, DEVELOPER_INFERENCE_ENABLED=True,
                   SEPAY_WEBHOOK_SECRET="", SEPAY_API_KEY="test-webhook-key",
                   SEPAY_ACCOUNT_NUMBER="123456", SEPAY_VIRTUAL_ACCOUNT="",
                   SEPAY_ACCOUNT_NAME="Test", SEPAY_BANK_CODE="TEST")
class TopUpCheckoutTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="checkout", password="test-password")
        self.other = get_user_model().objects.create_user(username="stranger", password="test-password")
        self.org = DeveloperOrganization.objects.create(owner=self.user, name="Checkout")
        self.url = f"/api/developer/organizations/{self.org.pk}/topups/"

    def test_checkout_minimum_owner_and_status(self):
        from django.db import connection
        if connection.vendor != "postgresql":
            self.skipTest("Checkout requires PostgreSQL")
        self.client.force_authenticate(user=self.user)
        self.assertEqual(self.client.post(self.url, {"amount_vnd": 1999}, format="json").status_code, 400)
        response = self.client.post(self.url, {"amount_vnd": 2345}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["amount_vnd"], 2345)
        self.assertIn(response.data["payment_code"], response.data["qr_url"])
        self.assertEqual(response["Cache-Control"], "no-store")
        detail = f"{self.url}{response.data['id']}/"
        self.assertEqual(self.client.get(detail).status_code, 200)
        listing = self.client.get(self.url)
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(str(listing.data[0]["id"]), str(response.data["id"]))
        self.assertIn("qr_url", listing.data[0])
        self.assertEqual(listing["Cache-Control"], "no-store")
        self.client.force_authenticate(user=self.other)
        self.assertEqual(self.client.get(detail).status_code, 404)
        self.assertEqual(self.client.get(self.url).status_code, 404)
        self.assertEqual(self.client.post(self.url, {"amount_vnd": 2000}, format="json").status_code, 404)

    def test_checkout_to_webhook_to_balance(self):
        from django.db import connection
        if connection.vendor != "postgresql":
            self.skipTest("Checkout requires PostgreSQL")
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url, {"amount_vnd": 2500}, format="json")
        self.assertEqual(response.status_code, 201)
        code, order_id = response.data["payment_code"], response.data["id"]
        self.client.force_authenticate(user=None)
        payload = {"id": 8080, "accountNumber": "123456", "transferType": "in", "transferAmount": 2500, "content": code}
        paid = self.client.post("/api/payments/webhooks/sepay/", payload, format="json", HTTP_AUTHORIZATION="Apikey test-webhook-key")
        self.assertEqual(paid.data["result"], "api_topup_paid")
        self.client.force_authenticate(user=self.user)
        detail = self.client.get(f"{self.url}{order_id}/")
        self.assertEqual(detail.data["status"], "paid")
        self.assertEqual(ApiWallet.objects.get(organization=self.org, environment="live").available_vnd, 2500)

    @override_settings(DEVELOPER_TOPUP_ENABLED=False)
    def test_checkout_disabled_by_default(self):
        self.client.force_authenticate(user=self.user)
        self.assertEqual(self.client.post(self.url, {"amount_vnd": 2000}, format="json").status_code, 404)
