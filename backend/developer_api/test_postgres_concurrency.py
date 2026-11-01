from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier
from unittest import skipUnless

from django.contrib.auth import get_user_model
from django.db import close_old_connections, connection
from django.test import TransactionTestCase, override_settings
from django.utils import timezone

from .models import ApiLedgerEntry, ApiUsage, ApiWallet, DeveloperAPIKey, DeveloperOrganization
from .wallets import ConcurrencyLimit, IdempotencyConflict, InsufficientBalance, credit_wallet, finish, release_stale_reservations, reserve
from .topups import create_topup_order
from payments.services import process_sepay_payload


@skipUnless(connection.vendor == "postgresql", "Requires PostgreSQL row locking")
class WalletConcurrencyTests(TransactionTestCase):
    def setUp(self):
        owner = get_user_model().objects.create_user(username="concurrency", password="test-password")
        org = DeveloperOrganization.objects.create(owner=owner, name="Concurrency")
        self.key, _ = DeveloperAPIKey.issue(organization=org, name="key", environment="live")
        self.wallet = ApiWallet.objects.create(organization=org, environment="live")
        credit_wallet(self.wallet.pk, 500, "concurrency-funding")

    def test_parallel_requests_cannot_overspend(self):
        barrier = Barrier(10)

        def attempt(index):
            close_old_connections()
            try:
                key = DeveloperAPIKey.objects.get(pk=self.key.pk)
                barrier.wait(timeout=20)
                try:
                    usage, _ = reserve(self.wallet.pk, key, f"request-{index}", "a" * 64, 100)
                except (InsufficientBalance, ConcurrencyLimit):
                    return False
                finish(usage.pk, success=True, result={"ok": True})
                return True
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=10) as executor:
            results = list(executor.map(attempt, range(10)))
        self.wallet.refresh_from_db()
        self.assertGreater(sum(results), 0)
        self.assertLessEqual(sum(results), 5)
        self.assertEqual((self.wallet.available_vnd, self.wallet.reserved_vnd), (500 - sum(results) * 100, 0))
        self.assertEqual(ApiLedgerEntry.objects.filter(kind=ApiLedgerEntry.Kind.CHARGE).count(), sum(results))

    def test_recovery_racing_inference_finalizes_only_once(self):
        usage, _ = reserve(self.wallet.pk, self.key, "old-request", "a" * 64, 200)
        ApiUsage.objects.filter(pk=usage.pk).update(created_at=timezone.now() - timedelta(minutes=11))
        barrier = Barrier(2)

        def attempt(recover):
            close_old_connections()
            try:
                barrier.wait(timeout=20)
                if recover:
                    release_stale_reservations()
                else:
                    try:
                        finish(usage.pk, success=True, result={"plant_name": "Tomato"})
                    except IdempotencyConflict:
                        pass
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as executor:
            list(executor.map(attempt, [True, False]))
        self.wallet.refresh_from_db()
        usage.refresh_from_db()
        self.assertEqual(self.wallet.reserved_vnd, 0)
        self.assertIn((usage.status, self.wallet.available_vnd), [(ApiUsage.Status.COMPLETED, 300), (ApiUsage.Status.FAILED, 500)])
        self.assertEqual(ApiLedgerEntry.objects.filter(usage=usage, kind__in=[ApiLedgerEntry.Kind.CHARGE, ApiLedgerEntry.Kind.RELEASE]).count(), 1)

    @override_settings(SEPAY_ACCOUNT_NUMBER="123456", SEPAY_VIRTUAL_ACCOUNT="")
    def test_parallel_webhook_redelivery_credits_once(self):
        order = create_topup_order(self.wallet.pk, 2000)
        barrier = Barrier(2)

        def deliver(_):
            close_old_connections()
            try:
                barrier.wait(timeout=20)
                return process_sepay_payload({"id": "bank-100", "accountNumber": "123456", "transferType": "in", "transferAmount": 2000, "content": order.payment_code})["result"]
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(deliver, range(2)))
        self.wallet.refresh_from_db()
        self.assertCountEqual(results, ["api_topup_paid", "duplicate"])
        self.assertEqual(self.wallet.available_vnd, 2500)
        self.assertEqual(ApiLedgerEntry.objects.filter(reference="topup:sepay:bank-100").count(), 1)
