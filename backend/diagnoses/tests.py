from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import connection
from django.test import SimpleTestCase
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from engagement.models import ServicePlan
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Diagnosis
from .quota import local_day_start, lock_account
from .services.cnn_labels import clean_model_label, translate_prediction

User = get_user_model()


CURRENT_MODEL_PLANTS = {
    "Apple": "Táo",
    "Black Pepper": "Hồ tiêu",
    "Cashew": "Điều",
    "Cassava": "Sắn",
    "Cherry": "Anh đào",
    "Coffee": "Cà phê",
    "Cucumber": "Dưa chuột",
    "Grape": "Nho",
    "Maize": "Ngô (bắp)",
    "Mango": "Xoài",
    "Orange": "Cam",
    "Peach": "Đào",
    "Pepper": "Ớt chuông",
    "Potato": "Khoai tây",
    "Raspberry": "Mâm xôi",
    "Soybean": "Đậu tương",
    "Squash": "Bí",
    "Strawberry": "Dâu tây",
    "Sugarcane": "Mía",
    "Tea": "Chè",
    "Tomato": "Cà chua",
}

CURRENT_MODEL_DISEASES = {
    "Anthracnose",
    "Bacterial Canker",
    "Bacterial Wilt",
    "Bacterial spot",
    "Banded Chlorosis",
    "Bell pepper leaf spot",
    "Black rot",
    "Brown Rust",
    "Brown Spot",
    "Cedar-Apple Rust",
    "Cercospora",
    "Cercospora leaf spot Gray leaf spot",
    "Cutting Weevil",
    "Die Back",
    "Downy Mildew",
    "Dried Leaves",
    "Early blight",
    "Esca (Black Measles)",
    "Gall Midge",
    "Grassy shoot",
    "Gummy Stem Blight",
    "Huanglongbing (Citrus greening)",
    "Late blight",
    "Leaf Mold",
    "Leaf blight",
    "Leaf blight (Isariopsis Leaf Spot)",
    "Leaf scorch",
    "Maize Lethal Necrosis",
    "Maize Streak Virus",
    "Miner",
    "Mites",
    "Mosaic virus",
    "Northern Leaf Blight",
    "Phoma",
    "Pokkah Boeng",
    "Powdery Mildew",
    "Red leaf spot",
    "Red scab",
    "Rust",
    "Scab",
    "Septoria leaf spot",
    "Sett Rot",
    "Smut",
    "Sooty Mould",
    "Target Spot",
    "Two-spotted spider mites",
    "Verticillium wilt",
    "Yellow Leaf",
    "Yellow Leaf Curl Virus",
    "bacterial blight",
    "brown spot",
    "green mite",
    "healthy",
    "leaf blight",
    "leaf miner",
    "mosaic virus",
    "red rust",
    "yellow mottle virus",
}


class CnnLabelTranslationTests(SimpleTestCase):
    def test_all_current_model_plants_have_vietnamese_names(self):
        for source_name, expected_name in CURRENT_MODEL_PLANTS.items():
            with self.subTest(plant=source_name):
                translated = translate_prediction(
                    {"class_name": f"{source_name}___healthy"}
                )
                self.assertEqual(translated["plant_name"], expected_name)

    def test_all_current_model_diseases_are_translated(self):
        for disease_name in CURRENT_MODEL_DISEASES:
            with self.subTest(disease=disease_name):
                translated = translate_prediction(
                    {"class_name": f"Tomato___{disease_name}"}
                )
                self.assertNotEqual(
                    translated["disease_name"].casefold(),
                    clean_model_label(disease_name).casefold(),
                )


FAKE_CNN_RESULT = {
    "class_name": "Tomato___Early blight",
    "confidence": 0.91,
    "top_predictions": [{"class_name": "Tomato___Early blight", "confidence": 0.91}],
}


class DiagnosisPlanTestCase(APITestCase):
    """Shared fixtures for the quota and retention tests.

    The caps are read from the engagement catalogue seeded by migration, so these
    tests fail if what is sold and what is enforced ever drift apart.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username="grower", email="grower@example.com", password="QuotaTest#2026"
        )
        self.authenticate(self.user)
        self.seed_plan = ServicePlan.objects.get(slug="seed")
        self.daily_cap = self.seed_plan.metadata["daily_diagnoses"]

    def authenticate(self, user):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}"
        )

    def make_diagnosis(self, user=None, created_at=None, **fields):
        """A saved leaf check, optionally backdated (created_at is auto_now_add)."""
        row = Diagnosis.objects.create(user=user or self.user, **fields)
        if created_at is not None:
            Diagnosis.objects.filter(pk=row.pk).update(created_at=created_at)
            row.refresh_from_db()
        return row

    def fill_daily_quota(self, count=None):
        for _ in range(self.daily_cap if count is None else count):
            self.make_diagnosis()


class DiagnosisQuotaTests(DiagnosisPlanTestCase):
    def test_inference_is_refused_once_the_daily_cap_is_full(self):
        self.fill_daily_quota()

        with patch("diagnoses.views.remote_cnn_enabled", return_value=True) as remote_enabled:
            with patch("diagnoses.views.classify_remote") as classify:
                response = self.client.post(
                    "/api/diagnoses/cnn/",
                    {"image_data_url": "data:image/png;base64,x"},
                    format="json",
                )

        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        # The reason the check runs before inference: no model call is paid for.
        classify.assert_not_called()
        remote_enabled.assert_not_called()

        detail = response.data
        self.assertEqual(detail["limit"], self.daily_cap)
        self.assertEqual(detail["used"], self.daily_cap)
        self.assertEqual(detail["plan"], "seed")
        self.assertEqual(detail["upgrade_to"], "grow")
        # The message has to say what the cap is and which plan lifts it.
        self.assertIn(str(self.daily_cap), detail["detail"])
        self.assertIn("Grow", detail["detail"])

    def test_one_leaf_check_spends_exactly_one_quota_unit(self):
        self.fill_daily_quota(self.daily_cap - 1)

        with patch("diagnoses.views.remote_cnn_enabled", return_value=True):
            with patch("diagnoses.views.classify_remote", return_value=dict(FAKE_CNN_RESULT)):
                inference = self.client.post(
                    "/api/diagnoses/cnn/",
                    {"image_data_url": "data:image/png;base64,x"},
                    format="json",
                )
                self.assertEqual(inference.status_code, status.HTTP_200_OK)

                created = self.client.post(
                    "/api/diagnoses/", {"title": "Cà chua lô 1"}, format="json"
                )
                self.assertEqual(created.status_code, status.HTTP_201_CREATED)

                # That pair is one leaf check, so it may not cost two units: the
                # cap lands exactly here, not one check earlier.
                blocked = self.client.post(
                    "/api/diagnoses/cnn/",
                    {"image_data_url": "data:image/png;base64,x"},
                    format="json",
                )

        self.assertEqual(blocked.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertEqual(Diagnosis.objects.filter(user=self.user).count(), self.daily_cap)

    def test_create_is_refused_once_the_daily_cap_is_full(self):
        self.fill_daily_quota()

        response = self.client.post("/api/diagnoses/", {"title": "Lượt thứ sáu"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertEqual(Diagnosis.objects.filter(user=self.user).count(), self.daily_cap)

    def test_quota_resets_on_the_local_calendar_day(self):
        """Yesterday's checks must not count: UTC midnight is 07:00 in Vietnam."""
        yesterday_evening = local_day_start() - timedelta(minutes=5)
        for _ in range(self.daily_cap):
            self.make_diagnosis(created_at=yesterday_evening)

        allowed = self.client.post("/api/diagnoses/", {"title": "Sáng nay"}, format="json")
        self.assertEqual(allowed.status_code, status.HTTP_201_CREATED)

        # ...while a check made just after local midnight belongs to today.
        just_after_midnight = local_day_start() + timedelta(minutes=5)
        Diagnosis.objects.filter(pk=allowed.data["id"]).update(created_at=just_after_midnight)
        for _ in range(self.daily_cap - 1):
            self.make_diagnosis(created_at=just_after_midnight)

        blocked = self.client.post("/api/diagnoses/", {"title": "Quá hạn mức"}, format="json")
        self.assertEqual(blocked.status_code, status.HTTP_402_PAYMENT_REQUIRED)

    def test_monthly_cap_blocks_even_when_the_day_still_has_room(self):
        ServicePlan.objects.filter(slug="seed").update(
            max_diagnoses_per_month=2,
            metadata={**self.seed_plan.metadata, "daily_diagnoses": 50},
        )
        self.make_diagnosis()
        self.make_diagnosis()

        response = self.client.post("/api/diagnoses/", {"title": "Lượt thứ ba"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertEqual(response.data["limit"], 2)
        self.assertIn("tháng", response.data["detail"])

    def test_unlimited_plan_is_never_blocked(self):
        self.user.current_plan = "bloom"
        self.user.plan_expires_at = timezone.now() + timedelta(days=30)
        self.user.save(update_fields=["current_plan", "plan_expires_at"])
        self.fill_daily_quota(self.daily_cap * 4)

        response = self.client.post("/api/diagnoses/", {"title": "Không giới hạn"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_usage_endpoint_reports_the_caps_and_what_is_left(self):
        self.fill_daily_quota(2)

        response = self.client.get("/api/diagnoses/usage/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["plan"], "seed")
        self.assertEqual(response.data["upgrade_to"], "grow")
        self.assertEqual(response.data["daily_diagnoses"]["limit"], self.daily_cap)
        self.assertEqual(response.data["daily_diagnoses"]["used"], 2)
        self.assertEqual(response.data["daily_diagnoses"]["remaining"], self.daily_cap - 2)
        self.assertEqual(
            response.data["monthly_diagnoses"]["limit"], self.seed_plan.max_diagnoses_per_month
        )


class DiagnosisQuotaConcurrencyTests(DiagnosisPlanTestCase):
    """The cap has to survive requests that arrive together, not just in turn."""

    def test_create_locks_the_account_before_it_counts_usage(self):
        # Counting and then inserting is only one decision if the account is
        # locked first; otherwise two parallel uploads both read the same "used"
        # and both save, and the cap becomes advisory.
        order = []

        def record_lock(user):
            order.append("lock")
            return user

        def record_count(user, now=None):
            order.append("count")
            return 0

        with patch("diagnoses.quota.lock_account", side_effect=record_lock) as lock:
            with patch("diagnoses.quota.diagnoses_used_today", side_effect=record_count):
                response = self.client.post(
                    "/api/diagnoses/", {"title": "Cùng lúc"}, format="json"
                )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        lock.assert_called_once()
        self.assertEqual(order, ["lock", "count"])

    def test_lock_account_reads_the_account_row(self):
        with CaptureQueriesContext(connection) as queries:
            locked = lock_account(self.user)

        self.assertEqual(locked.pk, self.user.pk)
        self.assertTrue(
            any("user" in entry["sql"].lower() for entry in queries.captured_queries),
            queries.captured_queries,
        )

    def test_inference_precheck_does_not_serialise_the_account(self):
        # /cnn/ saves nothing, so making parallel uploads queue behind each other
        # would cost latency and buy no accuracy.
        with patch("diagnoses.quota.lock_account") as lock:
            with patch("diagnoses.views.remote_cnn_enabled", return_value=True):
                with patch(
                    "diagnoses.views.classify_remote", return_value=dict(FAKE_CNN_RESULT)
                ):
                    response = self.client.post(
                        "/api/diagnoses/cnn/",
                        {"image_data_url": "data:image/png;base64,x"},
                        format="json",
                    )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        lock.assert_not_called()

    def test_a_client_supplied_created_at_cannot_dodge_the_daily_cap(self):
        # created_at is auto_now_add and read-only; backdating the payload must
        # not move the row out of today's count.
        self.fill_daily_quota()

        response = self.client.post(
            "/api/diagnoses/",
            {"title": "Lùi ngày", "created_at": "2020-01-01T00:00:00Z"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertEqual(Diagnosis.objects.filter(user=self.user).count(), self.daily_cap)

    def test_a_full_quota_never_blocks_reading_or_editing_what_is_already_saved(self):
        # The cap is on creating something new. Everything the grower already has
        # must stay reachable and editable.
        rows = [self.make_diagnosis() for _ in range(self.daily_cap)]

        self.assertEqual(self.client.get("/api/diagnoses/").status_code, status.HTTP_200_OK)
        self.assertEqual(
            self.client.get(f"/api/diagnoses/{rows[0].pk}/").status_code, status.HTTP_200_OK
        )
        self.assertEqual(
            self.client.patch(
                f"/api/diagnoses/{rows[0].pk}/", {"note": "Ghi chú"}, format="json"
            ).status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            self.client.get("/api/diagnoses/usage/").status_code, status.HTTP_200_OK
        )


class DiagnosisHistoryRetentionTests(DiagnosisPlanTestCase):
    def setUp(self):
        super().setUp()
        self.retention_days = self.seed_plan.metadata["history_days"]
        self.recent = self.make_diagnosis(title="Kết quả tuần này")
        self.old = self.make_diagnosis(
            title="Kết quả tháng trước",
            created_at=local_day_start() - timedelta(days=self.retention_days + 3),
        )

    def test_list_shows_only_the_retention_window_and_deletes_nothing(self):
        response = self.client.get("/api/diagnoses/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in response.data], [self.recent.pk])
        # The row is kept out of the list, never removed from the database.
        self.assertTrue(Diagnosis.objects.filter(pk=self.old.pk).exists())

    def test_record_outside_the_window_still_opens_by_id(self):
        response = self.client.get(f"/api/diagnoses/{self.old.pk}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Kết quả tháng trước")
        self.assertTrue(response.data["beyond_retention"])

        inside = self.client.get(f"/api/diagnoses/{self.recent.pk}/")
        self.assertFalse(inside.data["beyond_retention"])

    def test_record_outside_the_window_can_still_be_edited(self):
        response = self.client.patch(
            f"/api/diagnoses/{self.old.pk}/", {"note": "Ghi chú bổ sung"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.old.refresh_from_db()
        self.assertEqual(self.old.note, "Ghi chú bổ sung")

    def test_usage_endpoint_says_how_many_results_are_being_held_back(self):
        response = self.client.get("/api/diagnoses/usage/")

        history = response.data["history"]
        self.assertEqual(history["retention_days"], self.retention_days)
        self.assertEqual(history["total"], 2)
        self.assertEqual(history["visible"], 1)
        self.assertEqual(history["hidden"], 1)
        # The wording must not let the user think the older result was deleted.
        self.assertIn("không bị xóa", history["notice"])
        self.assertIn("Grow", history["notice"])

    def test_upgrading_brings_the_whole_history_back(self):
        self.user.current_plan = "bloom"
        self.user.plan_expires_at = timezone.now() + timedelta(days=30)
        self.user.save(update_fields=["current_plan", "plan_expires_at"])

        listed = self.client.get("/api/diagnoses/")
        usage = self.client.get("/api/diagnoses/usage/")

        self.assertEqual(
            sorted(item["id"] for item in listed.data), sorted([self.recent.pk, self.old.pk])
        )
        self.assertIsNone(usage.data["history"]["retention_days"])
        self.assertEqual(usage.data["history"]["hidden"], 0)

    def test_history_of_another_account_is_never_returned(self):
        neighbour = User.objects.create_user(
            username="neighbour", email="neighbour@example.com", password="QuotaTest#2026"
        )
        theirs = self.make_diagnosis(user=neighbour, title="Của người khác")

        self.assertEqual(
            self.client.get(f"/api/diagnoses/{theirs.pk}/").status_code,
            status.HTTP_404_NOT_FOUND,
        )
