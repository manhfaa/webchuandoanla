from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from farmops.models import FarmPlot
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Diagnosis, RecoveryCase, RecoveryCheckIn


class RecoveryAPITests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.owner = user_model.objects.create_user(username="recovery-owner", password="test-password")
        self.other = user_model.objects.create_user(username="recovery-other", password="test-password")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.owner).access_token}")
        self.baseline = self.diagnosis(self.owner)
        self.plot = FarmPlot.objects.create(user=self.owner, name="Plot 1", crop_type="Tomato")

    def diagnosis(self, user, **fields):
        return Diagnosis.objects.create(
            user=user, status="completed", is_leaf=True, plant_name="Tomato",
            disease_name="Early blight", image_data_url="data:image/png;base64,PRIVATE",
            thumbnail_url="data:image/jpeg;base64,THUMB", **fields,
        )

    def create_case(self, **fields):
        payload = {"baseline_diagnosis_id": self.baseline.id, "plot_id": self.plot.id, **fields}
        return self.client.post("/api/diagnoses/recovery/", payload, format="json")

    def test_create_and_read_only_returns_thumbnail(self):
        response = self.create_case()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["baseline_diagnosis"]["thumbnail_url"], "data:image/jpeg;base64,THUMB")
        self.assertNotIn("PRIVATE", str(response.data))
        self.assertEqual(response.data["plot_name"], "Plot 1")
        self.assertEqual(self.client.get("/api/diagnoses/recovery/").data["count"], 1)
        self.assertIn("no-cache", self.client.get("/api/diagnoses/recovery/")["Cache-Control"])
        self.assertEqual(self.client.get(f"/api/diagnoses/recovery/{response.data['id']}/").status_code, 200)

    def test_anonymous_and_other_user_cannot_read_or_write_case(self):
        case_id = self.create_case().data["id"]
        self.client.credentials()
        self.assertEqual(self.client.get("/api/diagnoses/recovery/").status_code, 401)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.other).access_token}")
        self.assertEqual(self.client.get(f"/api/diagnoses/recovery/{case_id}/").status_code, 404)
        self.assertEqual(self.client.patch(f"/api/diagnoses/recovery/{case_id}/", {"title": "hijack"}, format="json").status_code, 404)
        self.assertEqual(self.client.post(f"/api/diagnoses/recovery/{case_id}/check-ins/", {"diagnosis_id": self.diagnosis(self.other).id, "condition": "improving", "same_subject_confirmed": True}, format="json").status_code, 404)

    def test_foreign_diagnosis_and_plot_are_rejected_without_disclosure(self):
        foreign_diagnosis = self.diagnosis(self.other)
        foreign_plot = FarmPlot.objects.create(user=self.other, name="Private", crop_type="Tomato")
        self.assertEqual(self.create_case(baseline_diagnosis_id=foreign_diagnosis.id).status_code, 400)
        self.assertEqual(self.create_case(plot_id=foreign_plot.id).status_code, 400)
        self.assertEqual(RecoveryCase.objects.count(), 0)

    def test_checkin_rejects_reused_foreign_and_older_diagnoses(self):
        case_id = self.create_case().data["id"]
        url = f"/api/diagnoses/recovery/{case_id}/check-ins/"
        self.assertEqual(self.client.post(url, {"diagnosis_id": self.baseline.id, "condition": "improving", "same_subject_confirmed": True}, format="json").status_code, 400)
        foreign = self.diagnosis(self.other)
        self.assertEqual(self.client.post(url, {"diagnosis_id": foreign.id, "condition": "improving", "same_subject_confirmed": True}, format="json").status_code, 400)
        older = self.diagnosis(self.owner)
        Diagnosis.objects.filter(pk=older.pk).update(created_at=self.baseline.created_at - timedelta(days=1))
        self.assertEqual(self.client.post(url, {"diagnosis_id": older.id, "condition": "improving", "same_subject_confirmed": True}, format="json").status_code, 400)
        self.assertEqual(RecoveryCheckIn.objects.count(), 0)

    def test_followup_must_match_baseline_crop(self):
        case_id = self.create_case().data["id"]
        pepper = self.diagnosis(self.owner)
        pepper.plant_name = "Pepper"
        pepper.save(update_fields=["plant_name"])
        response = self.client.post(f"/api/diagnoses/recovery/{case_id}/check-ins/", {"diagnosis_id": pepper.id, "condition": "uncertain", "same_subject_confirmed": True}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_followup_requires_same_subject_confirmation(self):
        case_id = self.create_case().data["id"]
        new_photo = self.diagnosis(self.owner)
        response = self.client.post(f"/api/diagnoses/recovery/{case_id}/check-ins/", {"diagnosis_id": new_photo.id, "condition": "uncertain", "same_subject_confirmed": False}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(RecoveryCheckIn.objects.count(), 0)

    def test_case_baseline_and_plot_cannot_be_changed_by_patch(self):
        case_id = self.create_case().data["id"]
        other_photo = self.diagnosis(self.owner)
        response = self.client.patch(f"/api/diagnoses/recovery/{case_id}/", {"title": "Updated", "baseline_diagnosis": other_photo.id, "plot": None}, format="json")
        self.assertEqual(response.status_code, 200)
        case = RecoveryCase.objects.get(pk=case_id)
        self.assertEqual(case.title, "Updated")
        self.assertEqual(case.baseline_diagnosis_id, self.baseline.id)
        self.assertEqual(case.plot_id, self.plot.id)

    def test_checkin_links_existing_diagnosis_without_spending_quota(self):
        case_id = self.create_case().data["id"]
        new_photo = self.diagnosis(self.owner)
        before = Diagnosis.objects.count()
        url = f"/api/diagnoses/recovery/{case_id}/check-ins/"
        payload = {"diagnosis_id": new_photo.id, "condition": "uncertain", "same_subject_confirmed": True, "affected_leaves": 4, "note": "Still spotting"}
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Diagnosis.objects.count(), before)
        self.assertEqual(response.data["diagnosis"]["id"], new_photo.id)
        self.assertNotIn("PRIVATE", str(response.data))
        self.assertEqual(self.client.post(url, payload, format="json").status_code, 400)
        detail = self.client.get(f"/api/diagnoses/recovery/{case_id}/").data
        self.assertEqual(detail["check_in_count"], 1)
        self.assertEqual(len(detail["check_ins"]), 1)
        self.assertNotIn("check_ins", self.client.get("/api/diagnoses/recovery/").data["results"][0])

    def test_closed_case_and_invalid_dates_are_rejected(self):
        yesterday = timezone.localdate() - timedelta(days=1)
        self.assertEqual(self.create_case(next_check_date=yesterday.isoformat()).status_code, 400)
        case_id = self.create_case().data["id"]
        self.assertEqual(self.client.patch(f"/api/diagnoses/recovery/{case_id}/", {"is_closed": True}, format="json").status_code, 200)
        response = self.client.post(f"/api/diagnoses/recovery/{case_id}/check-ins/", {"diagnosis_id": self.diagnosis(self.owner).id, "condition": "improving", "same_subject_confirmed": True}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_bounded_list_and_open_case_limit(self):
        self.assertEqual(self.client.get("/api/diagnoses/recovery/?limit=abc").status_code, 400)
        self.assertEqual(self.client.get("/api/diagnoses/recovery/?limit=999").data["count"], 0)
        for _ in range(20):
            diagnosis = self.diagnosis(self.owner)
            self.assertEqual(self.create_case(baseline_diagnosis_id=diagnosis.id).status_code, 201)
        self.assertEqual(self.create_case().status_code, 400)
