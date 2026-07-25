import os
from datetime import timedelta
from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import TERMS_VERSION, PasswordResetToken

PASSWORD = "StrongPass#2026"
NEW_PASSWORD = "AnotherPass#2026"


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
            reverse("register"),
            {"email": "weak@example.com", "password": "12345678", "accepted_terms": True},
            format="json",
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

    def test_expired_access_token_401s_and_the_refreshed_one_works(self):
        """The contract the browser's retry-on-401 depends on: an expired access
        token must answer 401 (not 403), and the refreshed one must be accepted."""
        access = RefreshToken(self.refresh).access_token
        access.set_exp(from_time=timezone.now() - timedelta(hours=2), lifetime=timedelta(seconds=1))

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(self.client.get(reverse("me")).status_code, status.HTTP_401_UNAUTHORIZED)

        refreshed = self.client.post(reverse("token-refresh"), {"refresh": self.refresh}, format="json")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refreshed.data['access']}")
        self.assertEqual(self.client.get(reverse("me")).status_code, status.HTTP_200_OK)


class EmailUniquenessTests(TestCase):
    """Email is the login identifier, so the database must reject duplicates."""

    def test_duplicate_email_is_rejected_case_insensitively(self):
        get_user_model().objects.create_user(username="first", email="owner@example.com", password=PASSWORD)

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                get_user_model().objects.create_user(
                    username="second", email="OWNER@example.com", password=PASSWORD
                )

    def test_blank_emails_do_not_collide(self):
        # Accounts created without an email must still be allowed side by side.
        get_user_model().objects.create_user(username="noemail1", email="", password=PASSWORD)
        get_user_model().objects.create_user(username="noemail2", email="", password=PASSWORD)

        self.assertEqual(get_user_model().objects.filter(email="").count(), 2)


class RegistrationConsentTests(APITestCase):
    """Consent used to be a browser-only checkbox with no server-side record."""

    def test_registration_requires_and_records_consent(self):
        response = self.client.post(
            reverse("register"),
            {"email": "consented@example.com", "password": PASSWORD, "accepted_terms": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = get_user_model().objects.get(email="consented@example.com")
        self.assertIsNotNone(user.terms_accepted_at)
        self.assertEqual(user.terms_version, TERMS_VERSION)

    def test_registration_without_consent_is_rejected(self):
        for payload in (
            {"email": "nope@example.com", "password": PASSWORD, "accepted_terms": False},
            {"email": "nope@example.com", "password": PASSWORD},
        ):
            response = self.client.post(reverse("register"), payload, format="json")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("accepted_terms", response.data)

        self.assertFalse(get_user_model().objects.filter(email="nope@example.com").exists())

    def test_registration_returns_tokens_so_sign_in_is_not_a_second_call(self):
        response = self.client.post(
            reverse("register"),
            {"email": "atomic@example.com", "password": PASSWORD, "accepted_terms": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)


class GoogleConsentTests(APITestCase):
    """The Google button used to skip the consent checkbox entirely."""

    @override_settings(GOOGLE_CLIENT_ID="test-client-id")
    @patch("users.serializers.id_token.verify_oauth2_token")
    def test_first_google_sign_in_requires_and_records_consent(self, verify):
        verify.return_value = {
            "email": "google-new@example.com",
            "email_verified": True,
            "name": "Google User",
        }

        refused = self.client.post(reverse("google-login"), {"credential": "x"}, format="json")
        self.assertEqual(refused.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("accepted_terms", refused.data)
        self.assertFalse(get_user_model().objects.filter(email="google-new@example.com").exists())

        accepted = self.client.post(
            reverse("google-login"), {"credential": "x", "accepted_terms": True}, format="json"
        )
        self.assertEqual(accepted.status_code, status.HTTP_200_OK)
        user = get_user_model().objects.get(email="google-new@example.com")
        self.assertIsNotNone(user.terms_accepted_at)
        self.assertEqual(user.terms_version, TERMS_VERSION)

    @override_settings(GOOGLE_CLIENT_ID="")
    def test_readiness_probe_reports_an_unconfigured_server(self):
        response = self.client.get(reverse("google-login"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["configured"])

    @override_settings(GOOGLE_CLIENT_ID="test-client-id")
    def test_readiness_probe_reports_a_configured_server(self):
        self.assertTrue(self.client.get(reverse("google-login")).data["configured"])

    @override_settings(GOOGLE_CLIENT_ID="test-client-id")
    @patch("users.serializers.id_token.verify_oauth2_token")
    def test_existing_account_signs_in_without_re_consenting(self, verify):
        get_user_model().objects.create_user(
            username="googler", email="google-old@example.com", password=PASSWORD
        )
        verify.return_value = {
            "email": "google-old@example.com",
            "email_verified": True,
            "name": "Google User",
        }

        response = self.client.post(reverse("google-login"), {"credential": "x"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class LogoutTests(APITestCase):
    def setUp(self):
        cache.clear()
        get_user_model().objects.create_user(
            username="leaver", email="leaver@example.com", password=PASSWORD
        )
        login = self.client.post(
            reverse("login"), {"email": "leaver@example.com", "password": PASSWORD}, format="json"
        )
        self.refresh = login.data["refresh"]

    def test_logout_blacklists_the_refresh_token(self):
        response = self.client.post(reverse("logout"), {"refresh": self.refresh}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        replay = self.client.post(reverse("token-refresh"), {"refresh": self.refresh}, format="json")
        self.assertEqual(replay.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_rejects_a_garbage_token(self):
        response = self.client.post(reverse("logout"), {"refresh": "not-a-token"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend", EMAIL_HOST="mail.test")
class PasswordResetTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = get_user_model().objects.create_user(
            username="forgetful", email="forgetful@example.com", password=PASSWORD
        )

    def request_reset(self, email="forgetful@example.com"):
        return self.client.post(reverse("password-reset"), {"email": email}, format="json")

    def token_from_last_email(self):
        return mail.outbox[-1].body.split("reset-password?token=")[1].split()[0]

    def test_request_emails_a_working_token(self):
        response = self.request_reset()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)

        confirm = self.client.post(
            reverse("password-reset-confirm"),
            {"token": self.token_from_last_email(), "new_password": NEW_PASSWORD},
            format="json",
        )
        self.assertEqual(confirm.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEW_PASSWORD))

    def test_unknown_address_gets_the_same_answer_and_no_email(self):
        known = self.request_reset()
        unknown = self.request_reset("stranger@example.com")

        self.assertEqual(known.status_code, unknown.status_code)
        self.assertEqual(known.data["detail"], unknown.data["detail"])
        self.assertEqual(len(mail.outbox), 1)

    def test_token_cannot_be_reused(self):
        self.request_reset()
        token = self.token_from_last_email()
        payload = {"token": token, "new_password": NEW_PASSWORD}

        self.assertEqual(
            self.client.post(reverse("password-reset-confirm"), payload, format="json").status_code,
            status.HTTP_200_OK,
        )
        replay = self.client.post(reverse("password-reset-confirm"), payload, format="json")
        self.assertEqual(replay.status_code, status.HTTP_400_BAD_REQUEST)

    def test_expired_token_is_rejected(self):
        self.request_reset()
        token_row = PasswordResetToken.objects.get(user=self.user)
        token_row.expires_at = timezone.now() - timedelta(minutes=1)
        token_row.save(update_fields=["expires_at"])

        response = self.client.post(
            reverse("password-reset-confirm"),
            {"token": self.token_from_last_email(), "new_password": NEW_PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(PASSWORD))

    def test_requesting_again_invalidates_the_previous_link(self):
        self.request_reset()
        first_token = self.token_from_last_email()
        self.request_reset()

        response = self.client.post(
            reverse("password-reset-confirm"),
            {"token": first_token, "new_password": NEW_PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_raw_token_is_never_stored(self):
        self.request_reset()
        token = self.token_from_last_email()
        self.assertFalse(PasswordResetToken.objects.filter(token_hash=token).exists())
        self.assertTrue(
            PasswordResetToken.objects.filter(token_hash=PasswordResetToken.hash_token(token)).exists()
        )

    def test_reset_ends_sessions_opened_with_the_old_password(self):
        stolen = self.client.post(
            reverse("login"), {"email": "forgetful@example.com", "password": PASSWORD}, format="json"
        ).data["refresh"]

        self.request_reset()
        self.client.post(
            reverse("password-reset-confirm"),
            {"token": self.token_from_last_email(), "new_password": NEW_PASSWORD},
            format="json",
        )

        replay = self.client.post(reverse("token-refresh"), {"refresh": stolen}, format="json")
        self.assertEqual(replay.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_weak_new_password_is_rejected(self):
        self.request_reset()
        response = self.client.post(
            reverse("password-reset-confirm"),
            {"token": self.token_from_last_email(), "new_password": "12345678"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class PasswordResetWithoutSmtpTests(APITestCase):
    """No SMTP provider is configured yet, and Django's default EMAIL_HOST of
    'localhost' would raise ConnectionRefusedError. The request must still
    succeed (the link goes to the server console) instead of returning a 500."""

    def setUp(self):
        cache.clear()
        get_user_model().objects.create_user(
            username="offline", email="offline@example.com", password=PASSWORD
        )

    def test_request_succeeds_and_still_issues_a_token(self):
        response = self.client.post(
            reverse("password-reset"), {"email": "offline@example.com"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(PasswordResetToken.objects.filter(used_at__isnull=True).count(), 1)


class PasswordChangeTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = get_user_model().objects.create_user(
            username="changer", email="changer@example.com", password=PASSWORD
        )
        self.client.force_authenticate(self.user)

    def test_correct_current_password_changes_it(self):
        response = self.client.post(
            reverse("change-password"),
            {"current_password": PASSWORD, "new_password": NEW_PASSWORD},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEW_PASSWORD))

    def test_wrong_current_password_is_rejected(self):
        response = self.client.post(
            reverse("change-password"),
            {"current_password": "wrong-one", "new_password": NEW_PASSWORD},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(PASSWORD))

    def test_google_only_account_can_set_a_first_password(self):
        google_user = get_user_model().objects.create(username="googler", email="googler@example.com")
        google_user.set_unusable_password()
        google_user.save()
        self.client.force_authenticate(google_user)

        response = self.client.post(
            reverse("change-password"), {"new_password": NEW_PASSWORD}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        google_user.refresh_from_db()
        self.assertTrue(google_user.check_password(NEW_PASSWORD))

    def test_anonymous_caller_is_refused(self):
        self.client.force_authenticate(None)
        response = self.client.post(
            reverse("change-password"),
            {"current_password": PASSWORD, "new_password": NEW_PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AccountDeletionTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = get_user_model().objects.create_user(
            username="quitter", email="quitter@example.com", password=PASSWORD
        )
        self.client.force_authenticate(self.user)

    def test_deletion_needs_the_password_and_the_confirm_phrase(self):
        for payload in (
            {"password": PASSWORD, "confirm_text": "xoa"},
            {"password": "wrong-one", "confirm_text": "XÓA TÀI KHOẢN"},
            {"confirm_text": "XÓA TÀI KHOẢN"},
        ):
            response = self.client.delete(reverse("me"), payload, format="json")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.assertTrue(get_user_model().objects.filter(pk=self.user.pk).exists())

    def test_confirmed_deletion_removes_the_account(self):
        response = self.client.delete(
            reverse("me"), {"password": PASSWORD, "confirm_text": "XÓA TÀI KHOẢN"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(get_user_model().objects.filter(pk=self.user.pk).exists())

    def test_preview_lists_what_would_be_destroyed(self):
        response = self.client.get(reverse("account-deletion-preview"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["diagnoses"], 0)
        self.assertIn("farm_plots", response.data)
        self.assertIn("crop_plans", response.data)


class ProfileFieldTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = get_user_model().objects.create_user(
            username="farmer", email="farmer@example.com", password=PASSWORD
        )
        self.client.force_authenticate(self.user)

    def test_me_exposes_plan_expiry_and_consent(self):
        self.user.plan_expires_at = timezone.now() + timedelta(days=30)
        self.user.record_terms_consent()
        self.user.save()

        response = self.client.get(reverse("me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data["plan_expires_at"])
        self.assertEqual(response.data["terms_version"], TERMS_VERSION)
        self.assertTrue(response.data["has_usable_password"])

    def test_every_editable_field_round_trips(self):
        payload = {
            "full_name": "Nông dân A",
            "phone": "0900111222",
            "company_name": "HTX A",
            "farm_name": "Vườn A",
            "location": "Đà Lạt",
            "avatar_url": "https://example.com/a.png",
        }
        response = self.client.patch(reverse("me"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key, value in payload.items():
            self.assertEqual(response.data[key], value)

    def test_avatar_can_be_cleared(self):
        self.user.avatar_url = "https://example.com/a.png"
        self.user.save(update_fields=["avatar_url"])

        response = self.client.patch(reverse("me"), {"avatar_url": ""}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["avatar_url"], "")

    def test_email_is_normalised_and_cannot_be_blanked_or_stolen(self):
        get_user_model().objects.create_user(
            username="other", email="other@example.com", password=PASSWORD
        )

        self.assertEqual(
            self.client.patch(reverse("me"), {"email": ""}, format="json").status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            self.client.patch(reverse("me"), {"email": "OTHER@example.com"}, format="json").status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        mixed_case = self.client.patch(reverse("me"), {"email": "Farmer@Example.com"}, format="json")
        self.assertEqual(mixed_case.status_code, status.HTTP_200_OK)
        self.assertEqual(mixed_case.data["email"], "farmer@example.com")


class UserSettingTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = get_user_model().objects.create_user(
            username="settler", email="settler@example.com", password=PASSWORD
        )
        self.client.force_authenticate(self.user)

    def test_settings_are_created_on_first_read_and_can_be_patched(self):
        first = self.client.get(reverse("settings"))
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertTrue(first.data["email_notifications"])

        patched = self.client.patch(
            reverse("settings"),
            {"email_notifications": False, "timezone": "Asia/Bangkok", "language": "en"},
            format="json",
        )

        self.assertEqual(patched.status_code, status.HTTP_200_OK)
        self.assertFalse(patched.data["email_notifications"])
        self.assertEqual(patched.data["timezone"], "Asia/Bangkok")
        self.assertEqual(patched.data["language"], "en")


class LoginThrottleTests(APITestCase):
    """A shared IP must not lock unrelated growers out of their own accounts."""

    def setUp(self):
        cache.clear()
        for name in ("victim", "bystander"):
            get_user_model().objects.create_user(
                username=name, email=f"{name}@example.com", password=PASSWORD
            )

    def test_hammering_one_account_does_not_lock_out_another(self):
        for _ in range(12):
            self.client.post(
                reverse("login"), {"email": "victim@example.com", "password": "wrong"}, format="json"
            )

        blocked = self.client.post(
            reverse("login"), {"email": "victim@example.com", "password": PASSWORD}, format="json"
        )
        self.assertEqual(blocked.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

        allowed = self.client.post(
            reverse("login"), {"email": "bystander@example.com", "password": PASSWORD}, format="json"
        )
        self.assertEqual(allowed.status_code, status.HTTP_200_OK)
