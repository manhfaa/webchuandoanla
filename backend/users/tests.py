import os
from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase


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
