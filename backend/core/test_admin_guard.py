"""Trang quản trị phải chặn được dò mật khẩu."""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.db import DatabaseError
from django.test import Client, RequestFactory, TestCase, override_settings

from core.admin_guard import ACCOUNT_LIMIT, IP_LIMIT, AdminLoginRateLimitMiddleware
from users.models import AdminLoginAttempt


class AdminLoginRateLimitTests(TestCase):
    URL = "/admin/login/"

    def _post(self, ip="203.0.113.7", username="admin", password="sai"):
        return self.client.post(
            self.URL,
            {"username": username, "password": password},
            REMOTE_ADDR=ip,
        )

    def test_a_single_wrong_password_is_not_blocked(self):
        self.assertNotEqual(self._post().status_code, 429)

    def test_one_ip_is_cut_off_after_the_limit(self):
        for _ in range(IP_LIMIT):
            self.assertNotEqual(self._post().status_code, 429)

        blocked = self._post()
        self.assertEqual(blocked.status_code, 429)
        self.assertIn("Quá nhiều lần đăng nhập", blocked.content.decode())

    def test_changing_the_forwarded_ip_does_not_buy_unlimited_tries(self):
        """Client-supplied Cloudflare headers cannot reset the per-peer limit."""
        for attempt in range(IP_LIMIT):
            response = self.client.post(
                self.URL,
                {"username": "admin", "password": "sai"},
                REMOTE_ADDR="203.0.113.7",
                HTTP_CF_CONNECTING_IP=f"198.51.100.{attempt % 254 + 1}",
            )
            self.assertNotEqual(response.status_code, 429, f"blocked early on attempt {attempt}")

        self.assertEqual(self._post().status_code, 429)

    def test_distributed_attack_on_one_account_is_blocked(self):
        for attempt in range(ACCOUNT_LIMIT):
            self.assertNotEqual(self._post(ip=f"198.51.{attempt // 250}.{attempt % 250 + 1}").status_code, 429)
        blocked = self._post(ip="192.0.2.1")
        self.assertEqual(blocked.status_code, 429)
        self.assertEqual(blocked["Retry-After"], "900")

    def test_other_accounts_are_not_locked_by_distributed_attack(self):
        for attempt in range(ACCOUNT_LIMIT):
            self._post(ip=f"198.51.{attempt // 250}.{attempt % 250 + 1}")
        self.assertNotEqual(self._post(ip="192.0.2.2", username="different-admin").status_code, 429)

    def test_successful_login_does_not_consume_an_attempt(self):
        get_user_model().objects.create_superuser(username="owner", email="owner@example.com", password="SafeAdminPassword123!")
        response = self._post(username="owner", password="SafeAdminPassword123!")
        self.assertEqual(response.status_code, 302)
        self.assertEqual(AdminLoginAttempt.objects.count(), 0)

    def test_database_outage_fails_closed(self):
        with patch("core.admin_guard._reserve_attempt", side_effect=DatabaseError("unavailable")):
            self.assertEqual(self._post().status_code, 503)

    def test_invalid_csrf_does_not_lock_an_account(self):
        csrf_client = Client(enforce_csrf_checks=True)
        for attempt in range(ACCOUNT_LIMIT + 1):
            response = csrf_client.post(
                self.URL,
                {"username": "admin", "password": "sai"},
                REMOTE_ADDR=f"198.51.100.{attempt + 1}",
            )
            self.assertEqual(response.status_code, 403)
        self.assertFalse(AdminLoginAttempt.objects.exists())

    def test_staff_with_user_change_permission_cannot_promote_themselves(self):
        User = get_user_model()
        staff = User.objects.create_user(username="staff", password="SafeStaffPassword123!", is_staff=True)
        staff.user_permissions.add(Permission.objects.get(codename="change_user", content_type__app_label="users"))
        self.client.force_login(staff)
        response = self.client.post(
            f"/admin/users/user/{staff.pk}/change/",
            {"username": "staff", "is_superuser": "on", "is_staff": "on"},
        )
        staff.refresh_from_db()
        self.assertEqual(response.status_code, 403)
        self.assertFalse(staff.is_superuser)

    def test_reading_the_login_page_is_never_blocked(self):
        for _ in range(IP_LIMIT + 5):
            self.assertNotEqual(self.client.get(self.URL).status_code, 429)

    def test_the_rest_api_login_is_left_to_its_own_throttle(self):
        """Chỉ canh trang quản trị; /api/auth/ đã có throttle riêng của DRF."""
        for _ in range(IP_LIMIT + 5):
            response = self.client.post("/api/auth/login/", {}, HTTP_CF_CONNECTING_IP="203.0.113.9")
            self.assertNotEqual(response.status_code, 429, "middleware đã lấn sang API")

    @override_settings(DJANGO_ADMIN_PATH="quan-tri-bi-mat/")
    def test_the_guard_follows_a_renamed_admin_path(self):
        middleware = AdminLoginRateLimitMiddleware(lambda request: None)
        factory = RequestFactory()
        for _ in range(IP_LIMIT):
            request = factory.post("/quan-tri-bi-mat/login/", {"username": "admin"}, REMOTE_ADDR="203.0.113.11")
            self.assertIsNone(middleware.process_view(request, None, (), {}))

        request = factory.post("/quan-tri-bi-mat/login/", {"username": "admin"}, REMOTE_ADDR="203.0.113.11")
        blocked = middleware.process_view(request, None, (), {})
        self.assertEqual(blocked.status_code, 429)
