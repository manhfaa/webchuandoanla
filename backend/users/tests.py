import os
from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

PASSWORD = "StrongPass#2026"


class ProvisionAdminCommandTests(TestCase):
    env_names = (
        "DJANGO_SUPERUSER_USERNAME",
        "DJANGO_SUPERUSER_EMAIL",
        "DJANGO_SUPERUSER_PASSWORD",
    )

    def test_skips_when_environment_is_not_configured(self):
        environment = {name: "" for name in self.env_names}
        output = StringIO()

        with patch.dict(os.environ, environment, clear=False):
            call_command("provision_admin", stdout=output)

        self.assertEqual(get_user_model().objects.count(), 0)
        self.assertIn("skipped", output.getvalue())

    def test_creates_and_updates_admin_without_logging_credentials(self):
        environment = {
            "DJANGO_SUPERUSER_USERNAME": "deployment-admin",
            "DJANGO_SUPERUSER_EMAIL": "deployment-admin@example.com",
            "DJANGO_SUPERUSER_PASSWORD": "UnitTest-Only!9427",
        }
        output = StringIO()

        with patch.dict(os.environ, environment, clear=False):
            call_command("provision_admin", stdout=output)
            call_command("provision_admin", stdout=output)

        user = get_user_model().objects.get(username=environment["DJANGO_SUPERUSER_USERNAME"])
        self.assertEqual(get_user_model().objects.count(), 1)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.check_password(environment["DJANGO_SUPERUSER_PASSWORD"]))
        self.assertNotIn(environment["DJANGO_SUPERUSER_PASSWORD"], output.getvalue())

    def test_rejects_partial_environment_configuration(self):
        environment = {
            "DJANGO_SUPERUSER_USERNAME": "deployment-admin",
            "DJANGO_SUPERUSER_EMAIL": "",
            "DJANGO_SUPERUSER_PASSWORD": "",
        }

        with patch.dict(os.environ, environment, clear=False):
            with self.assertRaises(CommandError):
                call_command("provision_admin")


class LoginSecurityTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="active", email="active@example.com", password=PASSWORD
        )

    def test_active_user_can_log_in(self):
        response = self.client.post(
            reverse("login"), {"email": "active@example.com", "password": PASSWORD}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_deactivated_user_cannot_log_in(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

        response = self.client.post(
            reverse("login"), {"email": "active@example.com", "password": PASSWORD}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn("access", response.data)

    def test_weak_password_is_rejected_on_register(self):
        response = self.client.post(
            reverse("register"), {"email": "weak@example.com", "password": "12345678"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(get_user_model().objects.filter(email="weak@example.com").exists())


class TokenRefreshTests(APITestCase):
    """A session must survive past the 30-minute access-token lifetime."""

    def setUp(self):
        get_user_model().objects.create_user(
            username="refresher", email="refresh@example.com", password=PASSWORD
        )
        login = self.client.post(
            reverse("login"), {"email": "refresh@example.com", "password": PASSWORD}, format="json"
        )
        self.refresh = login.data["refresh"]

    def test_refresh_returns_a_new_access_token(self):
        response = self.client.post(reverse("token-refresh"), {"refresh": self.refresh}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_rotated_refresh_token_cannot_be_replayed(self):
        first = self.client.post(reverse("token-refresh"), {"refresh": self.refresh}, format="json")
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertIn("refresh", first.data)

        replay = self.client.post(reverse("token-refresh"), {"refresh": self.refresh}, format="json")
        self.assertEqual(replay.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_garbage_refresh_token_is_rejected(self):
        response = self.client.post(reverse("token-refresh"), {"refresh": "not-a-token"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
