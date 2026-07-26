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
from payments.entitlements import limit_for


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


class CropPlanQuotaTests(PlannerTestCase):
    """The published cap: Seed none, Grow 2, Bloom 10, Elite unlimited.

    The numbers are asserted against the billing catalogue, not retyped, so a
    catalogue change moves the test with the product instead of breaking it.
    """

    def _limit(self):
        return limit_for(self.user, "crop_plans")

    def _set_plan(self, slug):
        self.user.current_plan = slug
        self.user.plan_expires_at = None if slug == "seed" else timezone.now() + timedelta(days=30)
        self.user.save(update_fields=["current_plan", "plan_expires_at", "updated_at"])

    def _seed_plans(self, count, status=CropPlan.Status.ACTIVE):
        """Cheap fixtures: the cap counts rows, so no schedule is needed."""
        return [
            CropPlan.objects.create(
                user=self.user,
                crop=self.tomato,
                location=self.location,
                title=f"Kế hoạch cũ {index}",
                planned_start_date=timezone.localdate(),
                status=status,
            )
            for index in range(count)
        ]

    def _post_plan(self, **overrides):
        payload = {
            "crop_type": self.tomato.slug,
            "location_id": self.location.id,
            "planting_mode": "pot",
            "plant_count": 3,
            "start_date": (timezone.localdate() + timedelta(days=3)).isoformat(),
        }
        payload.update(overrides)
        return self.client.post(
            "/api/crop-plans/plans/",
            # A None override drops the key, so "no saved area" sends a real
            # payload the serializer would accept rather than a null field.
            data={key: value for key, value in payload.items() if value is not None},
            content_type="application/json",
            **self._auth(),
        )

    def test_seed_cannot_create_a_plan_and_is_told_which_plan_lifts_it(self):
        self.assertEqual(self._limit(), 0)
        response = self._post_plan()

        self.assertEqual(response.status_code, 402)
        body = response.json()
        self.assertEqual(body["upgrade_to"], "grow")
        self.assertEqual(body["limit"], 0)
        self.assertIn("Grow", body["detail"])
        self.assertIn("kế hoạch", body["detail"])
        self.assertFalse(CropPlan.objects.filter(user=self.user).exists())

    def test_plans_created_before_the_cap_stay_fully_usable(self):
        # The user is on Seed (cap 0) yet already owns a plan, exactly like the
        # accounts that existed before the cap was introduced.
        plan = create_plan_from_payload(self.user, self._context(self.tomato))
        step = plan.steps.order_by("step_number").first()

        listed = self.client.get("/api/crop-plans/plans/", **self._auth()).json()
        detail = self.client.get(f"/api/crop-plans/plans/{plan.id}/", **self._auth())
        completed = self.client.post(
            f"/api/crop-plans/steps/{step.id}/complete/",
            data={"note": "xong"},
            content_type="application/json",
            **self._auth(),
        )
        reminders = self.client.get(f"/api/crop-plans/reminders/?plan={plan.id}", **self._auth()).json()

        self.assertEqual(listed["count"], 1)
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(completed.status_code, 200)
        self.assertGreater(reminders["count"], 0)
        # Only creating another one is refused, and the copy says the old plan stays.
        refused = self._post_plan()
        self.assertEqual(refused.status_code, 402)
        self.assertIn("giữ nguyên", refused.json()["detail"])
        self.assertTrue(CropPlan.objects.filter(pk=plan.id).exists())

    def test_grow_allows_the_catalogue_count_and_refuses_the_next_one(self):
        self._set_plan("grow")
        limit = self._limit()
        self.assertEqual(limit, 2)

        self._seed_plans(limit - 1)
        self.assertEqual(self._post_plan().status_code, 201)

        refused = self._post_plan()
        body = refused.json()
        self.assertEqual(refused.status_code, 402)
        self.assertEqual(body["limit"], limit)
        self.assertEqual(body["used"], limit)
        self.assertEqual(body["upgrade_to"], "bloom")
        self.assertEqual(CropPlan.objects.filter(user=self.user).count(), limit)

    def test_archiving_a_finished_plan_frees_a_slot(self):
        self._set_plan("grow")
        plans = self._seed_plans(self._limit())
        self.assertEqual(self._post_plan().status_code, 402)

        CropPlan.objects.filter(pk=plans[0].pk).update(status=CropPlan.Status.ARCHIVED)

        self.assertEqual(self._post_plan().status_code, 201)
        # The archived season is kept, just out of the way.
        self.assertTrue(CropPlan.objects.filter(pk=plans[0].pk).exists())

    def test_bloom_caps_higher_and_elite_is_unlimited(self):
        self._set_plan("bloom")
        bloom_limit = self._limit()
        self.assertEqual(bloom_limit, 10)
        self._seed_plans(bloom_limit)

        refused = self._post_plan()
        self.assertEqual(refused.status_code, 402)
        self.assertEqual(refused.json()["upgrade_to"], "elite")

        self._set_plan("elite")
        self.assertIsNone(self._limit())
        self.assertEqual(self._post_plan().status_code, 201)

    def test_previewing_stays_free_when_the_cap_is_full(self):
        self._seed_plans(3)  # still Seed, so far past the cap
        response = self.client.post(
            "/api/crop-plans/plans/preview/",
            data={
                "crop_type": self.tomato.slug,
                "location_id": self.location.id,
                "planting_mode": "pot",
                "plant_count": 3,
                "start_date": (timezone.localdate() + timedelta(days=3)).isoformat(),
            },
            content_type="application/json",
            **self._auth(),
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("steps", response.json())

    def test_a_refused_create_leaves_no_growing_area_behind(self):
        before = CropLocation.objects.filter(user=self.user).count()
        response = self._post_plan(location_id=None, lat=11.9, lon=108.4, location_name="Khu mới")

        self.assertEqual(response.status_code, 402)
        self.assertEqual(CropLocation.objects.filter(user=self.user).count(), before)

    def _patch_plan(self, pk, **payload):
        return self.client.patch(
            f"/api/crop-plans/plans/{pk}/",
            data=payload,
            content_type="application/json",
            **self._auth(),
        )

    def test_archiving_and_creating_in_a_loop_cannot_hold_more_than_the_cap(self):
        """The cap counts a set the user can shrink at will, so every way back
        into that set has to be checked - otherwise create -> archive -> create
        accumulates plans and un-archiving them all lands far past the cap."""
        self._set_plan("grow")
        limit = self._limit()

        created = []
        for _ in range(limit + 3):
            created_response = self._post_plan()
            if created_response.status_code == 201:
                pk = created_response.json()["id"]
                created.append(pk)
                self.assertEqual(self._patch_plan(pk, status="archived").status_code, 200)

        # Closing a season and starting a new one is allowed as often as the
        # grower likes; what is capped is how many run at the same time.
        self.assertEqual(len(created), limit + 3)

        restored = [pk for pk in created if self._patch_plan(pk, status="active").status_code == 200]
        held = CropPlan.objects.filter(user=self.user).exclude(status=CropPlan.Status.ARCHIVED).count()
        self.assertEqual(len(restored), limit)
        self.assertEqual(held, limit)
        # Nothing was deleted along the way.
        self.assertEqual(CropPlan.objects.filter(user=self.user).count(), len(created))

    def test_restoring_over_the_cap_is_refused_without_touching_the_plan(self):
        self._set_plan("grow")
        plans = self._seed_plans(self._limit())
        archived = self._seed_plans(1, status=CropPlan.Status.ARCHIVED)[0]

        refused = self._patch_plan(archived.pk, title="Tên mới", status="active")
        body = refused.json()
        archived.refresh_from_db()

        self.assertEqual(refused.status_code, 402)
        self.assertEqual(body["limit"], self._limit())
        self.assertEqual(body["used"], len(plans))
        # The refusal must not read as "my plan is gone", and must not half-apply.
        self.assertIn("giữ nguyên", body["detail"])
        self.assertEqual(archived.status, CropPlan.Status.ARCHIVED)
        self.assertNotEqual(archived.title, "Tên mới")
        # Archived or not, the grower can still open it.
        self.assertEqual(
            self.client.get(f"/api/crop-plans/plans/{archived.pk}/", **self._auth()).status_code, 200
        )

    def test_restoring_is_allowed_once_a_slot_is_free(self):
        self._set_plan("grow")
        self._seed_plans(self._limit() - 1)
        archived = self._seed_plans(1, status=CropPlan.Status.ARCHIVED)[0]

        self.assertEqual(self._patch_plan(archived.pk, status="active").status_code, 200)
        archived.refresh_from_db()
        self.assertEqual(archived.status, CropPlan.Status.ACTIVE)

    def test_editing_a_plan_over_the_cap_still_works(self):
        # Seed with grandfathered plans: renaming or archiving must never be
        # blocked, only moving one back into the tracked list.
        plans = self._seed_plans(2)
        self.assertEqual(self._patch_plan(plans[0].pk, title="Vụ xuân").status_code, 200)
        self.assertEqual(self._patch_plan(plans[1].pk, status="archived").status_code, 200)
        plans[0].refresh_from_db()
        self.assertEqual(plans[0].title, "Vụ xuân")

    def test_regenerating_an_archived_plan_respects_the_cap(self):
        self._set_plan("grow")
        self._seed_plans(self._limit())
        archived = self._seed_plans(1, status=CropPlan.Status.ARCHIVED)[0]

        refused = self.client.post(
            f"/api/crop-plans/plans/{archived.pk}/regenerate/",
            data={},
            content_type="application/json",
            **self._auth(),
        )
        archived.refresh_from_db()
        self.assertEqual(refused.status_code, 402)
        self.assertEqual(archived.status, CropPlan.Status.ARCHIVED)

    def test_a_weather_refresh_does_not_pull_an_archived_plan_back(self):
        plan = create_plan_from_payload(self.user, self._context(self.tomato))
        CropPlan.objects.filter(pk=plan.pk).update(status=CropPlan.Status.ARCHIVED)

        def wet(lat, lon, start_date, end_date):
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

        with mock.patch("crop_plans.services.planner.fetch_nasa_power", side_effect=wet):
            body = self.client.post(
                f"/api/crop-plans/plans/{plan.pk}/weather-refresh/",
                data={},
                content_type="application/json",
                **self._auth(),
            ).json()

        plan.refresh_from_db()
        # The warning is still reported; the plan just stays where the grower put it.
        self.assertTrue(body["warnings"])
        self.assertEqual(body["status"], CropPlan.Status.ARCHIVED)
        self.assertEqual(plan.status, CropPlan.Status.ARCHIVED)

    def test_a_lapsed_paid_plan_falls_back_to_the_seed_cap(self):
        self._set_plan("bloom")
        self.user.plan_expires_at = timezone.now() - timedelta(minutes=1)
        self.user.save(update_fields=["plan_expires_at", "updated_at"])
        plans = self._seed_plans(3)

        refused = self._post_plan()
        self.assertEqual(refused.status_code, 402)
        self.assertEqual(refused.json()["plan"], "seed")
        # Everything bought while Bloom was active is still there.
        self.assertEqual(CropPlan.objects.filter(user=self.user).count(), len(plans))
        self.assertEqual(
            self.client.get(f"/api/crop-plans/plans/{plans[0].pk}/", **self._auth()).status_code, 200
        )


class DefaultLocationTests(PlannerTestCase):
    def test_only_one_location_stays_default(self):
        first = CropLocation.objects.create(user=self.user, name="A", lat=11.0, lon=108.0, is_default=True)
        second = CropLocation.objects.create(user=self.user, name="B", lat=11.1, lon=108.1, is_default=True)
        first.refresh_from_db()
        self.assertFalse(first.is_default)
        self.assertTrue(second.is_default)
