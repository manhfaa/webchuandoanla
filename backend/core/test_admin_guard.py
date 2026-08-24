"""Trang quản trị phải chặn được dò mật khẩu."""

from django.core.cache import cache
from django.test import TestCase, override_settings

from core.admin_guard import IP_LIMIT, TOTAL_LIMIT


class AdminLoginRateLimitTests(TestCase):
    URL = "/admin/login/"

    def setUp(self):
        cache.clear()

    def _post(self, ip="203.0.113.7"):
        return self.client.post(
            self.URL,
            {"username": "admin", "password": "sai"},
            HTTP_CF_CONNECTING_IP=ip,
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
        """Máy chủ gốc còn hở nên header IP giả được — hạn mức tổng phải chặn."""
        for attempt in range(TOTAL_LIMIT):
            response = self._post(ip=f"198.51.100.{attempt % 254 + 1}")
            self.assertNotEqual(response.status_code, 429, f"bị chặn sớm ở lần {attempt}")

        self.assertEqual(self._post(ip="198.51.100.200").status_code, 429)

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
        for _ in range(IP_LIMIT):
            self.client.post("/quan-tri-bi-mat/login/", {}, HTTP_CF_CONNECTING_IP="203.0.113.11")

        blocked = self.client.post(
            "/quan-tri-bi-mat/login/", {}, HTTP_CF_CONNECTING_IP="203.0.113.11"
        )
        self.assertEqual(blocked.status_code, 429)
