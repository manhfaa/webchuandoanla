import json
from datetime import date
from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from diagnoses.models import Diagnosis

from .models import AgriculturalInput, CultivationLog, FarmLocation, FarmPlot, NutritionSymptom, TraceabilityRecord
from .services import _fetch_open_meteo, _risk_from_conditions, geocode_location_fields

User = get_user_model()

DA_LAT = {"latitude": 11.7652907, "longitude": 108.370674}


def _geocode_stub(**kwargs):
    """Stand-in for Nominatim so tests never touch the network."""
    return {"latitude": 21.0278, "longitude": 105.8342, "label": "Hà Nội, Việt Nam", "source": "test"}


class FarmOpsAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="grower", email="grower@example.com", password="FarmTest#2026"
        )
        self.other = User.objects.create_user(
            username="neighbour", email="neighbour@example.com", password="FarmTest#2026"
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.user).access_token}")
        self.plot = FarmPlot.objects.create(user=self.user, name="Lô cà chua 01", crop_type="Cà chua")


class FarmLocationTests(FarmOpsAPITestCase):
    def setUp(self):
        super().setUp()
        self.location = FarmLocation.objects.create(
            user=self.user,
            name="Vườn Đức Trọng",
            province="Lâm Đồng",
            district="Đức Trọng",
            ward="Hiệp An",
            **DA_LAT,
        )

    def test_patch_without_address_keeps_stored_coordinates(self):
        """Renaming a location must not relocate the field."""
        response = self.client.patch(
            f"/api/farm-locations/{self.location.pk}/", {"name": "Vườn mới"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.location.refresh_from_db()
        self.assertAlmostEqual(self.location.latitude, DA_LAT["latitude"])
        self.assertAlmostEqual(self.location.longitude, DA_LAT["longitude"])

    def test_patch_with_null_coordinates_keeps_stored_coordinates(self):
        response = self.client.patch(
            f"/api/farm-locations/{self.location.pk}/",
            {"crop_type": "Dâu tây", "latitude": None, "longitude": None},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.location.refresh_from_db()
        self.assertAlmostEqual(self.location.latitude, DA_LAT["latitude"])

    def test_patch_with_explicit_coordinates_moves_the_location(self):
        response = self.client.patch(
            f"/api/farm-locations/{self.location.pk}/", {"latitude": 12.5, "longitude": 108.5}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.location.refresh_from_db()
        self.assertAlmostEqual(self.location.latitude, 12.5)

    @patch("farmops.serializers.geocode_location_fields", side_effect=_geocode_stub)
    def test_patch_with_changed_address_regeocodes(self, geocode):
        response = self.client.patch(
            f"/api/farm-locations/{self.location.pk}/", {"province": "Hà Nội"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(geocode.called)
        self.location.refresh_from_db()
        self.assertAlmostEqual(self.location.latitude, 21.0278)

    def test_half_a_coordinate_is_rejected(self):
        response = self.client.patch(
            f"/api/farm-locations/{self.location.pk}/", {"latitude": 12.5}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_out_of_range_coordinates_are_rejected(self):
        response = self.client.patch(
            f"/api/farm-locations/{self.location.pk}/", {"latitude": 999, "longitude": 108}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_without_any_address_is_rejected(self):
        response = self.client.post("/api/farm-locations/", {"name": "Vườn không địa chỉ"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn("latitude", response.data)

    @patch("farmops.serializers.geocode_location_fields", side_effect=_geocode_stub)
    def test_create_with_an_address_geocodes(self, _geocode):
        response = self.client.post(
            "/api/farm-locations/", {"name": "Vườn Hà Nội", "province": "Hà Nội"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertAlmostEqual(response.data["latitude"], 21.0278)

    def test_setting_a_default_demotes_the_previous_one(self):
        previous = FarmLocation.objects.create(user=self.user, name="Cũ", is_default=True, **DA_LAT)
        response = self.client.patch(
            f"/api/farm-locations/{self.location.pk}/", {"is_default": True}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        previous.refresh_from_db()
        self.location.refresh_from_db()
        self.assertTrue(self.location.is_default)
        self.assertFalse(previous.is_default)

    def test_another_users_default_is_untouched(self):
        theirs = FarmLocation.objects.create(user=self.other, name="Của người khác", is_default=True, **DA_LAT)
        self.client.patch(f"/api/farm-locations/{self.location.pk}/", {"is_default": True}, format="json")
        theirs.refresh_from_db()
        self.assertTrue(theirs.is_default)

    def test_non_numeric_location_id_is_a_400_not_a_500(self):
        for path in ("/api/weather/", "/api/pest-alerts/", "/api/farm-advisory/"):
            with self.subTest(path=path):
                self.assertEqual(
                    self.client.get(f"{path}?location_id=abc").status_code, status.HTTP_400_BAD_REQUEST
                )

    def test_unknown_location_id_still_returns_404(self):
        self.assertEqual(self.client.get("/api/weather/?location_id=999999").status_code, status.HTTP_404_NOT_FOUND)


class GeocodeFallbackTests(APITestCase):
    @patch("farmops.services.geocode_location_query", return_value=None)
    def test_blank_address_never_queries_the_country_alone(self, query):
        self.assertIsNone(geocode_location_fields(province="", district="", ward="", address_text=""))
        self.assertEqual(query.call_count, 0)

    @patch("farmops.services.geocode_location_query", return_value=None)
    def test_country_is_only_ever_a_qualifier(self, query):
        geocode_location_fields(province="Lâm Đồng")
        self.assertEqual([call.args[0] for call in query.call_args_list], ["Lâm Đồng, Việt Nam"])


class CultivationLogTests(FarmOpsAPITestCase):
    def _payload(self, **overrides):
        payload = {
            "plot": self.plot.pk,
            "activity_type": "note",
            "activity_date": "2026-07-25",
            "title": "Kiểm tra sâu bệnh",
        }
        payload.update(overrides)
        return payload

    def test_non_numeric_plot_id_is_a_400_not_a_500(self):
        response = self.client.get("/api/cultivation-logs/?plot_id=abc")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_numeric_plot_id_still_filters(self):
        CultivationLog.objects.create(
            user=self.user, plot=self.plot, activity_date=date(2026, 7, 25), title="A"
        )
        response = self.client.get(f"/api/cultivation-logs/?plot_id={self.plot.pk}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_unknown_activity_type_is_rejected(self):
        self.assertEqual(
            self.client.get("/api/cultivation-logs/?activity_type=bogus").status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_cannot_attach_another_users_diagnosis(self):
        theirs = Diagnosis.objects.create(user=self.other, image_url="https://example.test/a.jpg")
        response = self.client.post("/api/cultivation-logs/", self._payload(diagnosis=theirs.pk), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("diagnosis", response.data)

    def test_can_attach_own_diagnosis(self):
        mine = Diagnosis.objects.create(user=self.user, image_url="https://example.test/b.jpg")
        response = self.client.post("/api/cultivation-logs/", self._payload(diagnosis=mine.pk), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["diagnosis"], mine.pk)

    def test_negative_cost_is_rejected(self):
        response = self.client.post("/api/cultivation-logs/", self._payload(cost_amount=-50), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_materials_must_be_a_list(self):
        response = self.client.post("/api/cultivation-logs/", self._payload(materials="not-a-list"), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_absurd_activity_date_is_rejected(self):
        response = self.client.post("/api/cultivation-logs/", self._payload(activity_date="1899-01-01"), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class FarmPlotValidationTests(FarmOpsAPITestCase):
    def test_negative_area_is_rejected(self):
        response = self.client.post(
            "/api/farm-plots/", {"name": "Lô mới", "crop_type": "Cà chua", "area_value": -999}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_area_unit_is_normalised(self):
        response = self.client.post(
            "/api/farm-plots/", {"name": "Lô sào", "crop_type": "Lúa", "area_unit": "Sào"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["area_unit"], "sào")

    def test_unknown_area_unit_is_rejected(self):
        response = self.client.post(
            "/api/farm-plots/", {"name": "Lô lạ", "crop_type": "Lúa", "area_unit": "furlong"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_link_another_users_location(self):
        theirs = FarmLocation.objects.create(user=self.other, name="Của người khác", **DA_LAT)
        response = self.client.post(
            "/api/farm-plots/", {"name": "Lô", "crop_type": "Cà chua", "location": theirs.pk}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class PublicTraceabilityTests(FarmOpsAPITestCase):
    def setUp(self):
        super().setUp()
        self.plot.address_text = "Thôn Hiệp Thạnh"
        self.plot.growth_stage = "Ra hoa"
        self.plot.planting_start_date = date(2026, 5, 1)
        self.plot.save()
        CultivationLog.objects.create(
            user=self.user,
            plot=self.plot,
            activity_date=date(2026, 7, 20),
            activity_type="pesticide",
            title="Phun phòng nấm",
            description="Ghi chú nội bộ",
            cost_amount="1234567.00",
            materials=[{"name": "Mancozeb"}],
            metadata={"private_note": "KHÔNG CÔNG KHAI"},
        )

    def _publish(self, **settings):
        response = self.client.post(
            "/api/traceability/",
            {"plot": self.plot.pk, "product_name": "Cà chua sạch", "is_public": True, "public_settings": settings},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response.data

    def test_public_payload_hides_cost_materials_and_internal_ids(self):
        record = self._publish(show_logs=True)
        self.client.credentials()
        response = self.client.get(f"/api/traceability/public/{record['public_token']}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = json.loads(response.content)
        self.assertEqual(len(body["logs"]), 1)
        self.assertEqual(
            sorted(body["logs"][0]),
            ["activity_date", "activity_type", "description", "id", "image_url", "title"],
        )
        self.assertNotIn("KHÔNG CÔNG KHAI", response.content.decode())
        self.assertNotIn("1234567", response.content.decode())

    def test_show_logs_false_publishes_no_timeline(self):
        record = self._publish(show_logs=False)
        self.client.credentials()
        response = self.client.get(f"/api/traceability/public/{record['public_token']}/")
        self.assertEqual(response.data["logs"], [])
        self.assertFalse(response.data["public_settings"]["show_logs"])

    def test_hidden_fields_are_blanked(self):
        record = self._publish(show_region=False, show_planting_date=False, show_growth_stage=False)
        self.client.credentials()
        response = self.client.get(f"/api/traceability/public/{record['public_token']}/")
        self.assertEqual(response.data["region"], "")
        self.assertIsNone(response.data["planting_start_date"])
        self.assertEqual(response.data["growth_stage"], "")

    def test_flags_default_to_published(self):
        record = self._publish()
        self.client.credentials()
        response = self.client.get(f"/api/traceability/public/{record['public_token']}/")
        self.assertEqual(len(response.data["logs"]), 1)
        self.assertTrue(all(response.data["public_settings"].values()))

    def test_legacy_non_dict_settings_do_not_break_the_public_page(self):
        record = TraceabilityRecord.objects.create(
            user=self.user, plot=self.plot, product_name="Cũ", public_settings="not-a-dict"
        )
        self.client.credentials()
        response = self.client.get(f"/api/traceability/public/{record.public_token}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["public_settings"]["show_logs"])

    def test_public_settings_must_be_a_known_object(self):
        for payload in ("not-a-dict", {"show_everything": True}, {"show_logs": "yes"}):
            with self.subTest(payload=payload):
                response = self.client.post(
                    "/api/traceability/",
                    {"plot": self.plot.pk, "product_name": "X", "public_settings": payload},
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unpublished_record_is_not_reachable(self):
        record = self._publish(show_logs=True)
        self.client.patch(f"/api/traceability/{record['id']}/", {"is_public": False}, format="json")
        self.client.credentials()
        response = self.client.get(f"/api/traceability/public/{record['public_token']}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class InputLibraryFilterTests(APITestCase):
    """The catalogue ships in the migrations, so these run against the real seed."""

    def _names(self, **params):
        query = "&".join(f"{key}={value}" for key, value in params.items())
        response = self.client.get(f"/api/input-library/?{query}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return [row["name"] for row in response.data]

    def test_seed_covers_the_supported_crops(self):
        self.assertGreaterEqual(AgriculturalInput.objects.count(), 20)
        self.assertGreaterEqual(NutritionSymptom.objects.count(), 10)

    def test_vietnamese_crop_filter_matches(self):
        self.assertTrue(self._names(crop="cà chua"))

    def test_crop_filter_is_diacritic_and_case_insensitive(self):
        self.assertEqual(self._names(crop="cà chua"), self._names(crop="CA CHUA"))

    def test_english_crop_filter_matches_the_english_column(self):
        self.assertTrue(self._names(crop="tomato"))

    def test_single_letter_crop_no_longer_returns_everything(self):
        self.assertEqual(self._names(crop="a"), self._names())

    def test_crop_filter_does_not_match_a_substring_of_another_crop(self):
        self.assertNotIn("Phân urê (đạm)", self._names(crop="ng"))

    def test_disease_filter_matches_both_languages(self):
        self.assertTrue(self._names(disease="đốm lá"))
        self.assertTrue(self._names(disease="leaf spot"))

    def test_free_text_searches_ingredient_usage_and_diseases(self):
        self.assertIn("Thuốc trừ nấm gốc Mancozeb", self._names(q="Mancozeb"))
        self.assertTrue(self._names(q="đốm lá"))
        self.assertTrue(self._names(q="dom la"))
        self.assertTrue(self._names(q="kali"))

    def test_unknown_category_is_a_400(self):
        self.assertEqual(
            self.client.get("/api/input-library/?category=bogus").status_code, status.HTTP_400_BAD_REQUEST
        )

    def test_category_is_trimmed(self):
        response = self.client.get("/api/input-library/?category=%20pesticide%20")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data)

    def test_nutrition_symptoms_filter_by_crop(self):
        response = self.client.get("/api/nutrition-symptoms/?crop=cà chua")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data)
        self.assertLess(len(response.data), NutritionSymptom.objects.count())

    def test_nutrition_symptoms_crop_filter_speaks_english(self):
        self.assertTrue(self.client.get("/api/nutrition-symptoms/?crop=tomato").data)

    def test_nutrition_symptoms_free_text_is_diacritic_insensitive(self):
        self.assertTrue(self.client.get("/api/nutrition-symptoms/?q=dam").data)


class WeatherPayloadTests(APITestCase):
    OPEN_METEO_RESPONSE = {
        "timezone": "Asia/Ho_Chi_Minh",
        "current": {
            "time": "2026-07-25T17:30",
            "temperature_2m": 21.6,
            "relative_humidity_2m": 94,
            "wind_speed_10m": 12.1,
            "precipitation": 0.1,
            "weather_code": 51,
        },
        "hourly": {
            "time": [f"2026-07-25T{hour:02d}:00" for hour in range(24)],
            "relative_humidity_2m": [90] * 24,
            "precipitation_probability": [30] * 17 + [55] + [30] * 6,
        },
        "daily": {
            "time": ["2026-07-25"],
            "weather_code": [80],
            "temperature_2m_max": [28.0],
            "temperature_2m_min": [18.8],
            "precipitation_probability_max": [100],
            "wind_speed_10m_max": [42.6],
        },
    }

    def _weather(self):
        with patch("farmops.services.urlopen") as urlopen:
            urlopen.return_value.__enter__.return_value.read.return_value = json.dumps(
                self.OPEN_METEO_RESPONSE
            ).encode()
            location = FarmPlot(name="x")  # any object carrying latitude/longitude
            location.latitude, location.longitude = DA_LAT["latitude"], DA_LAT["longitude"]
            return _fetch_open_meteo(location)

    def test_current_is_the_live_reading_not_the_daily_aggregate(self):
        weather = self._weather()
        self.assertEqual(weather["current"]["temperature_c"], 22)
        self.assertEqual(weather["current"]["humidity_percent"], 94)
        self.assertEqual(weather["current"]["wind_kmh"], 12)
        self.assertTrue(weather["current"]["is_current"])

    def test_current_wind_is_not_the_days_maximum(self):
        weather = self._weather()
        self.assertNotEqual(weather["current"]["wind_kmh"], weather["today"]["wind_kmh"])
        self.assertEqual(weather["today"]["wind_kmh"], 43)

    def test_current_rain_probability_comes_from_the_current_hour(self):
        self.assertEqual(self._weather()["current"]["rain_probability_percent"], 55)

    def test_payload_carries_a_fetch_and_observation_timestamp(self):
        weather = self._weather()
        self.assertTrue(weather["fetched_at"])
        self.assertEqual(weather["observed_at"], "2026-07-25T17:30")

    def test_daily_rows_keep_the_high_and_the_low(self):
        today = self._weather()["today"]
        self.assertEqual((today["temperature_max_c"], today["temperature_min_c"]), (28, 19))

    def test_is_mock_is_gone(self):
        self.assertNotIn("is_mock", self._weather())

    def test_falls_back_to_the_daily_row_when_there_is_no_current_block(self):
        payload = {**self.OPEN_METEO_RESPONSE, "current": {}}
        with patch("farmops.services.urlopen") as urlopen:
            urlopen.return_value.__enter__.return_value.read.return_value = json.dumps(payload).encode()
            location = FarmPlot(name="x")
            location.latitude, location.longitude = DA_LAT["latitude"], DA_LAT["longitude"]
            weather = _fetch_open_meteo(location)
        self.assertFalse(weather["current"]["is_current"])


class PestRiskCropMatchingTests(APITestCase):
    def test_vietnamese_and_english_crop_names_score_the_same(self):
        wet = {"humidity": 96, "rain_probability": 100, "temperature": 22}
        for vi, en in (("Cà chua", "tomato"), ("Ớt chuông", "bell-pepper"), ("Dâu tây", "strawberry")):
            with self.subTest(crop=vi):
                self.assertEqual(_risk_from_conditions(vi, **wet), _risk_from_conditions(en, **wet))

    def test_fungal_sensitive_crops_score_high_in_wet_weather(self):
        self.assertEqual(_risk_from_conditions("Ớt chuông", 96, 100, 22), "high")

    def test_an_unknown_crop_is_not_promoted(self):
        self.assertEqual(_risk_from_conditions("asdfghjkl", 96, 100, 22), "medium")
