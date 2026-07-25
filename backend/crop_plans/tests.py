from datetime import date, timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from crop_plans.models import CompletionLog, Crop, CropLocation, CropPlan, CropPlanStep
from crop_plans.services import nasa_power
from crop_plans.services.planner import (
    CONFIDENCE_CLIMATOLOGY,
    CONFIDENCE_OBSERVED,
    CONFIDENCE_UNAVAILABLE,
    build_context_from_request,
    create_plan_from_payload,
    delay_step,
    mark_step_complete,
    regenerate_plan,
    reopen_step,
)


def _row(day: date, **overrides) -> dict:
    row = {
        "date": day.isoformat(),
        "observed": True,
        "t2m": 26.0,
        "t2m_max": 30.0,
        "t2m_min": 22.0,
        "rh2m": 70.0,
        "precipitation": 2.0,
        "solar_radiation": 18.0,
        "wind_speed": 1.5,
    }
    row.update(overrides)
    return row


class DeriveMetricsTests(TestCase):
    def test_sentinel_days_are_not_averaged(self):
        start = date(2026, 1, 1)
        rows = [_row(start + timedelta(days=index)) for index in range(10)]
        clean = nasa_power.derive_metrics(rows)

        # The parser drops -999 to None; those days must not drag the mean down.
        gapped = [
            _row(start + timedelta(days=index), t2m=None, precipitation=None) if index >= 5 else rows[index]
            for index in range(10)
        ]
        gapped_metrics = nasa_power.derive_metrics(gapped)

        self.assertEqual(clean["avg_temp_7d"], 26.0)
        self.assertEqual(gapped_metrics["avg_temp_7d"], 26.0)
        self.assertEqual(gapped_metrics["sample_days_14d"], 5)

    def test_window_without_enough_samples_reports_unknown(self):
        rows = [_row(date(2026, 1, 1)), _row(date(2026, 1, 2))]
        metrics = nasa_power.derive_metrics(rows)
        self.assertIsNone(metrics["avg_temp_14d"])
        self.assertIsNone(metrics["rain_sum_14d"])
        self.assertIsNone(metrics["seasonality_label"])

    def test_fill_value_is_stripped_when_parsing(self):
        parameters = {
            "T2M": {"20260101": 26.0, "20260102": -999.0, "20260103": -999.0},
            "PRECTOTCORR": {"20260101": 3.0, "20260102": 4.0, "20260103": -999.0},
        }
        rows = nasa_power._parse_daily_payload(parameters)
        # The third day is all sentinel, so it is dropped entirely.
        self.assertEqual([row["date"] for row in rows], ["2026-01-01", "2026-01-02"])
        self.assertEqual(rows[0]["t2m"], 26.0)
        self.assertIsNone(rows[1]["t2m"])
        self.assertEqual(rows[1]["precipitation"], 4.0)


class PlannerTestCase(TestCase):
    """Shared fixtures; NASA POWER is stubbed so tests never hit the network."""

    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            username="planner-tests", email="planner@example.test", password="PlannerTest#2026"
        )
        cls.tomato = Crop.objects.create(
            slug="test-tomato",
            name="Cà chua thử",
            name_en="Test tomato",
            climate_profile={"optimal_temp_c": [22, 30], "optimal_humidity_pct": [55, 80], "rain_14d_high_mm": 80, "sunlight_hours_min": 6},
            growth_profile={
                "germination_days": [5, 10],
                "seedling_days": [1, 20],
                "vegetative_days": [20, 40],
                "harvest_days": [60, 90],
                "needs_support": True,
                "propagation": "seed",
            },
            care_rules={"fertilizing_start_day": 20, "fertilizing_end_day": 35, "fertilizing_interval_days": 5},
        )
        cls.berry = Crop.objects.create(
            slug="test-berry",
            name="Dâu thử",
            name_en="Test berry",
            climate_profile={"optimal_temp_c": [16, 26], "optimal_humidity_pct": [50, 75], "rain_14d_high_mm": 65, "sunlight_hours_min": 5},
            growth_profile={"harvest_days": [75, 110], "propagation": "seedling", "needs_support": False},
            care_rules={"watering_reason": "Dâu thử cần đất thoáng."},
        )
        cls.location = CropLocation.objects.create(user=cls.user, name="Vườn thử", lat=11.9, lon=108.4)

    def setUp(self):
        patcher = mock.patch(
            "crop_plans.services.planner.fetch_nasa_power",
            side_effect=self._weather,
        )
        self.fetch_weather = patcher.start()
        self.addCleanup(patcher.stop)

    def _weather(self, lat, lon, start_date, end_date):
        rows = [_row(start_date + timedelta(days=index)) for index in range((end_date - start_date).days + 1)]
        return {
            "source": nasa_power.SOURCE_OBSERVED,
            "raw_payload": {"provider": "stub"},
            "daily_series": rows,
            "derived_metrics": nasa_power.derive_metrics(rows),
            "coverage": {"requested_days": len(rows), "observed_days": len(rows), "climatology_days": 0},
        }

    def _context(self, crop, **overrides):
        payload = {
            "planting_mode": "ground",
            "area_value": 10,
            "area_unit": "m2",
            "plant_count": 8,
            "start_date": timezone.localdate() + timedelta(days=3),
            "experience_level": "beginner",
            "plan_goal": "home",
            "timezone": "Asia/Ho_Chi_Minh",
        }
        payload.update(overrides)
        return build_context_from_request(crop, self.location, payload)

    def _auth(self):
        return {"HTTP_AUTHORIZATION": "Bearer " + str(RefreshToken.for_user(self.user).access_token)}


class PerCropScheduleTests(PlannerTestCase):
    def test_schedules_differ_per_crop(self):
        tomato_plan = create_plan_from_payload(self.user, self._context(self.tomato))
        berry_plan = create_plan_from_payload(self.user, self._context(self.berry))

        tomato_titles = list(tomato_plan.steps.values_list("title", flat=True))
        berry_titles = list(berry_plan.steps.values_list("title", flat=True))

        self.assertIn("Cắm cọc và buộc thân", tomato_titles)
        self.assertNotIn("Cắm cọc và buộc thân", berry_titles)
        self.assertIn("Trồng cây giống vào giá thể", berry_titles)
        self.assertNotIn("Trồng cây giống vào giá thể", tomato_titles)

        berry_watering = berry_plan.steps.get(title="Tưới nước định kỳ")
        self.assertEqual(berry_watering.why_this_step_matters, "Dâu thử cần đất thoáng.")
        self.assertNotIn("Cà chua", berry_watering.why_this_step_matters)

    def test_harvest_window_follows_the_crop_profile(self):
        berry_plan = create_plan_from_payload(self.user, self._context(self.berry))
        harvest = berry_plan.steps.get(phase_key="harvest")
        self.assertEqual(harvest.repeat_rule["until_offset_days"], 110)


class SuitabilityTests(PlannerTestCase):
    def test_no_climate_data_means_no_score(self):
        self.fetch_weather.side_effect = lambda *args, **kwargs: {
            "source": nasa_power.SOURCE_UNAVAILABLE,
            "raw_payload": {},
            "daily_series": [],
            "derived_metrics": {},
            "coverage": {},
        }
        plan = create_plan_from_payload(self.user, self._context(self.tomato))
        self.assertIsNone(plan.suitability_score)
        self.assertEqual(plan.metadata["climate_confidence"], CONFIDENCE_UNAVAILABLE)
        self.assertTrue(plan.steps.exists())

    def test_climatology_is_flagged_in_the_plan(self):
        original = self._weather

        def climatology(lat, lon, start_date, end_date):
            payload = original(lat, lon, start_date, end_date)
            payload["source"] = nasa_power.SOURCE_CLIMATOLOGY
            return payload

        self.fetch_weather.side_effect = climatology
        plan = create_plan_from_payload(self.user, self._context(self.tomato))
        self.assertEqual(plan.metadata["climate_confidence"], CONFIDENCE_CLIMATOLOGY)
        self.assertIsNotNone(plan.suitability_score)

    def test_observed_data_is_flagged_as_observed(self):
        plan = create_plan_from_payload(self.user, self._context(self.tomato))
        self.assertEqual(plan.metadata["climate_confidence"], CONFIDENCE_OBSERVED)


class StepLifecycleTests(PlannerTestCase):
    def setUp(self):
        super().setUp()
        self.plan = create_plan_from_payload(self.user, self._context(self.tomato))
        self.step = self.plan.steps.order_by("step_number").first()

    def test_completing_twice_logs_once(self):
        mark_step_complete(self.step, "xong")
        mark_step_complete(self.step, "xong")
        self.assertEqual(CompletionLog.objects.filter(step=self.step, action="completed").count(), 1)

    def test_delay_does_not_uncomplete_a_finished_step(self):
        mark_step_complete(self.step)
        delay_step(self.step, 2, "mưa")
        self.step.refresh_from_db()
        self.assertEqual(self.step.status, CropPlanStep.Status.COMPLETED)

    def test_reopen_makes_the_step_current_again(self):
        mark_step_complete(self.step)
        reopen_step(self.step)
        self.step.refresh_from_db()
        self.assertEqual(self.step.status, CropPlanStep.Status.CURRENT)
        self.assertIsNone(self.step.completed_at)

    def test_delay_endpoint_rejects_a_completed_step(self):
        mark_step_complete(self.step)
        response = self.client.post(
            f"/api/crop-plans/steps/{self.step.id}/delay/",
            data={"delay_days": 2},
            content_type="application/json",
            **self._auth(),
        )
        self.assertEqual(response.status_code, 400)

    def test_an_empty_note_clears_the_note(self):
        self.step.user_notes = "cũ"
        self.step.save(update_fields=["user_notes"])
        response = self.client.post(
            f"/api/crop-plans/steps/{self.step.id}/notes/",
            data={"note": ""},
            content_type="application/json",
            **self._auth(),
        )
        self.step.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.step.user_notes, "")


class RegenerateTests(PlannerTestCase):
    def test_regenerate_keeps_the_plan_id_and_the_history(self):
        plan = create_plan_from_payload(self.user, self._context(self.tomato))
        step = plan.steps.order_by("step_number").first()
        mark_step_complete(step, "đã làm")

        refreshed = regenerate_plan(plan)

        self.assertEqual(refreshed.id, plan.id)
        self.assertEqual(refreshed.plan_version, 2)
        self.assertTrue(CropPlan.objects.filter(pk=plan.id).exists())
        self.assertFalse(refreshed.steps.filter(status=CropPlanStep.Status.COMPLETED).exists())

        log = CompletionLog.objects.get(crop_plan=refreshed, action="completed")
        self.assertIsNone(log.step_id)
        self.assertEqual(log.step_title, step.title)

    def test_regenerate_endpoint_returns_the_same_id(self):
        plan = create_plan_from_payload(self.user, self._context(self.tomato))
        response = self.client.post(
            f"/api/crop-plans/plans/{plan.id}/regenerate/",
            data={},
            content_type="application/json",
            **self._auth(),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], plan.id)
        self.assertEqual(
            self.client.get(f"/api/crop-plans/plans/{plan.id}/", **self._auth()).status_code,
            200,
        )


class ApiShapeTests(PlannerTestCase):
    def test_plan_list_is_paginated_and_slim(self):
        create_plan_from_payload(self.user, self._context(self.tomato))
        body = self.client.get("/api/crop-plans/plans/", **self._auth()).json()
        self.assertIn("results", body)
        self.assertNotIn("reminders", body["results"][0])
        self.assertNotIn("steps", body["results"][0])
        self.assertIn("current_step", body["results"][0])

    def test_plan_detail_drops_reminders(self):
        plan = create_plan_from_payload(self.user, self._context(self.tomato))
        body = self.client.get(f"/api/crop-plans/plans/{plan.id}/", **self._auth()).json()
        self.assertNotIn("reminders", body)
        self.assertGreater(body["reminder_count"], 0)

    def test_computed_fields_are_read_only(self):
        plan = create_plan_from_payload(self.user, self._context(self.tomato))
        before = plan.suitability_score
        self.client.patch(
            f"/api/crop-plans/plans/{plan.id}/",
            data={"suitability_score": 999, "status": "archived"},
            content_type="application/json",
            **self._auth(),
        )
        plan.refresh_from_db()
        self.assertEqual(plan.suitability_score, before)
        self.assertEqual(plan.status, CropPlan.Status.ARCHIVED)

    def test_archived_plans_are_hidden_by_default(self):
        plan = create_plan_from_payload(self.user, self._context(self.tomato))
        CropPlan.objects.filter(pk=plan.id).update(status=CropPlan.Status.ARCHIVED)
        self.assertEqual(self.client.get("/api/crop-plans/plans/", **self._auth()).json()["count"], 0)
        self.assertEqual(
            self.client.get("/api/crop-plans/plans/?include_archived=1", **self._auth()).json()["count"], 1
        )

    def test_deleting_a_location_in_use_returns_409(self):
        create_plan_from_payload(self.user, self._context(self.tomato))
        response = self.client.delete(f"/api/crop-plans/locations/{self.location.id}/", **self._auth())
        self.assertEqual(response.status_code, 409)
        self.assertTrue(CropLocation.objects.filter(pk=self.location.id).exists())

    def test_out_of_range_coordinates_are_rejected(self):
        response = self.client.post(
            "/api/crop-plans/plans/preview/",
            data={
                "crop_type": self.tomato.slug,
                "lat": 999,
                "lon": 0,
                "planting_mode": "pot",
                "start_date": (timezone.localdate() + timedelta(days=3)).isoformat(),
                "plant_count": 2,
            },
            content_type="application/json",
            **self._auth(),
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("lat", response.json())


class WeatherRefreshTests(PlannerTestCase):
    def _wet_weather(self, lat, lon, start_date, end_date):
        rows = [
            _row(start_date + timedelta(days=index), precipitation=12.0, rh2m=90.0)
            for index in range((end_date - start_date).days + 1)
        ]
        return {
            "source": nasa_power.SOURCE_OBSERVED,
            "raw_payload": {},
            "daily_series": rows,
            "derived_metrics": nasa_power.derive_metrics(rows),
            "coverage": {},
        }

    def test_refresh_flags_and_then_clears_needs_review(self):
        plan = create_plan_from_payload(self.user, self._context(self.tomato))

        with mock.patch("crop_plans.services.planner.fetch_nasa_power", side_effect=self._wet_weather):
            wet = self.client.post(
                f"/api/crop-plans/plans/{plan.id}/weather-refresh/",
                data={},
                content_type="application/json",
                **self._auth(),
            ).json()
        plan.refresh_from_db()
        self.assertTrue(wet["warnings"])
        self.assertEqual(plan.status, CropPlan.Status.NEEDS_REVIEW)
        self.assertIn("weather_refresh", plan.metadata)

        dry = self.client.post(
            f"/api/crop-plans/plans/{plan.id}/weather-refresh/",
            data={},
            content_type="application/json",
            **self._auth(),
        ).json()
        plan.refresh_from_db()
        self.assertEqual(dry["warnings"], [])
        self.assertEqual(plan.status, CropPlan.Status.ACTIVE)

    def test_reminder_filters_are_paginated(self):
        plan = create_plan_from_payload(self.user, self._context(self.tomato))
        body = self.client.get(
            f"/api/crop-plans/reminders/?plan={plan.id}&filter=upcoming&page_size=5", **self._auth()
        ).json()
        self.assertLessEqual(len(body["results"]), 5)
        self.assertGreater(body["count"], 5)
        self.assertIsNotNone(body["next"])


class DefaultLocationTests(PlannerTestCase):
    def test_only_one_location_stays_default(self):
        first = CropLocation.objects.create(user=self.user, name="A", lat=11.0, lon=108.0, is_default=True)
        second = CropLocation.objects.create(user=self.user, name="B", lat=11.1, lon=108.1, is_default=True)
        first.refresh_from_db()
        self.assertFalse(first.is_default)
        self.assertTrue(second.is_default)
