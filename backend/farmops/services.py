from __future__ import annotations

import json
import re
import unicodedata
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.utils import timezone


DISCLAIMER = "Thông tin chỉ mang tính tham khảo, không thay thế tư vấn của chuyên gia nông nghiệp."
DISCLAIMER_EN = "This information is for reference only and does not replace advice from an agricultural expert."


def fold_text(text: Any) -> str:
    """Lowercase and drop Vietnamese diacritics so 'Ớt chuông' and 'ot chuong' compare equal.

    Growers type accents inconsistently and the catalogue mixes Vietnamese and
    English spellings, so every crop/disease comparison in this app folds first.
    """
    lowered = str(text or "").lower()
    stripped = "".join(ch for ch in unicodedata.normalize("NFD", lowered) if unicodedata.category(ch) != "Mn")
    return unicodedata.normalize("NFC", stripped).replace("đ", "d")


def contains_term(haystack: Any, needle_folded: str) -> bool:
    """Whole-word containment on folded text, so crop='a' stops matching 'cà chua'."""
    if not needle_folded:
        return False
    return re.search(rf"(?<!\w){re.escape(needle_folded)}(?!\w)", fold_text(haystack)) is not None


class WeatherDataUnavailable(RuntimeError):
    pass


def _geocode_with_nominatim(query: str) -> dict[str, Any] | None:
    params = {
        "q": query,
        "format": "json",
        "limit": 1,
        "addressdetails": 1,
        "accept-language": "vi",
    }
    url = f"https://nominatim.openstreetmap.org/search?{urlencode(params)}"
    request = Request(
        url,
        headers={
            "User-Agent": "AgromindAI/1.0 (https://agromind.io.vn)",
        },
    )

    try:
        with urlopen(request, timeout=15) as response:
            results = json.loads(response.read().decode("utf-8"))
    except Exception:
        return None

    if not results:
        return None

    match = results[0]
    lat = match.get("lat")
    lon = match.get("lon")
    if lat is None or lon is None:
        return None

    return {
        "latitude": float(lat),
        "longitude": float(lon),
        "label": match.get("display_name") or match.get("name") or query,
        "source": "nominatim_openstreetmap",
        "raw": match,
    }


def _geocode_with_open_meteo(query: str) -> dict[str, Any] | None:
    first_part = query.split(",", 1)[0].strip() or query
    query = " ".join((query or "").split())
    if not query:
        return None

    params = {
        "name": first_part,
        "count": 1,
        "language": "vi",
        "format": "json",
    }
    url = f"https://geocoding-api.open-meteo.com/v1/search?{urlencode(params)}"

    try:
        with urlopen(url, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception:
        return None

    results = payload.get("results") or []
    if not results:
        return None

    match = results[0]
    lat = match.get("latitude")
    lon = match.get("longitude")
    if lat is None or lon is None:
        return None

    return {
        "latitude": float(lat),
        "longitude": float(lon),
        "label": ", ".join(
            str(part)
            for part in [match.get("name"), match.get("admin1"), match.get("country")]
            if part
        ),
        "source": "open_meteo_geocoding",
        "raw": match,
    }


def geocode_location_query(query: str) -> dict[str, Any] | None:
    query = " ".join((query or "").split())
    if not query:
        return None
    return _geocode_with_nominatim(query) or _geocode_with_open_meteo(query)


def geocode_location_fields(*, province: str = "", district: str = "", ward: str = "", address_text: str = "") -> dict[str, Any] | None:
    """Resolve the most specific address tier that Nominatim/Open-Meteo can find.

    "Việt Nam" is only a country qualifier appended to a real address, never a
    query of its own: on its own it resolves to the geographic centre of the
    country, which would silently relocate the field.
    """
    query_sets = [
        [address_text, ward, district, province],
        [ward, district, province],
        [district, province],
        [province],
    ]
    seen: set[str] = set()
    for parts in query_sets:
        address_parts = [part.strip() for part in parts if part and part.strip()]
        if not address_parts:
            continue
        query = ", ".join([*address_parts, "Việt Nam"])
        # Tiers collapse into each other when only one field is filled; asking
        # Nominatim the same question four times only burns its rate limit.
        if query in seen:
            continue
        seen.add(query)
        result = geocode_location_query(query)
        if result:
            return result
    return None


# Crops whose main Vietnamese diseases are driven by leaf wetness, listed in
# both languages (and as the crop slugs the crop planner uses) because the crop
# name reaching this function comes straight from a free-text field.
FUNGAL_SENSITIVE_CROP_KEYWORDS = (
    "ca chua",
    "tomato",
    "khoai tay",
    "potato",
    "ot chuong",
    "bell pepper",
    "bell-pepper",
    "pepper",
    "ho tieu",
    "tieu",
    "dau tay",
    "strawberry",
    "nho",
    "grape",
    "ca phe",
    "coffee",
    "dua chuot",
    "cucumber",
    "sau rieng",
    "durian",
    "xoai",
    "mango",
    "che",
    "tea",
)


def _is_fungal_sensitive(crop: str) -> bool:
    folded = fold_text(crop)
    return any(contains_term(folded, keyword) for keyword in FUNGAL_SENSITIVE_CROP_KEYWORDS)


def _risk_from_conditions(crop: str, humidity: int, rain_probability: int, temperature: int) -> str:
    fungal_sensitive = _is_fungal_sensitive(crop)
    if humidity >= 82 or rain_probability >= 70:
        return "high" if fungal_sensitive else "medium"
    if temperature >= 35 or humidity >= 75 or rain_probability >= 45:
        return "medium"
    return "low"


def _weather_summary(code: int) -> str:
    if code in {0, 1}:
        return "Trời quang, nắng nhẹ"
    if code in {2, 3}:
        return "Có mây thay đổi"
    if code in {45, 48}:
        return "Có sương mù"
    if code in {51, 53, 55, 61, 63, 65, 80, 81, 82}:
        return "Có mưa, cần theo dõi độ ẩm"
    if code in {95, 96, 99}:
        return "Có nguy cơ dông"
    return "Thời tiết thay đổi"


def _weather_summary_en(code: int) -> str:
    if code in {0, 1}:
        return "Clear sky, light sunshine"
    if code in {2, 3}:
        return "Partly cloudy"
    if code in {45, 48}:
        return "Foggy"
    if code in {51, 53, 55, 61, 63, 65, 80, 81, 82}:
        return "Rain expected, keep an eye on humidity"
    if code in {95, 96, 99}:
        return "Risk of thunderstorms"
    return "Changeable weather"


def _fetch_open_meteo(location: Any) -> dict[str, Any]:
    lat = getattr(location, "latitude", None)
    lon = getattr(location, "longitude", None)
    if lat is None or lon is None:
        raise WeatherDataUnavailable("Vị trí chưa có tọa độ. Hãy lấy GPS hiện tại hoặc nhập địa chỉ rõ hơn để geocode.")

    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code",
        "hourly": "relative_humidity_2m,precipitation_probability",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
        "forecast_days": 7,
        "timezone": "auto",
    }
    url = f"https://api.open-meteo.com/v1/forecast?{urlencode(params)}"

    try:
        with urlopen(url, timeout=15) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception:
        raise WeatherDataUnavailable("Không lấy được dữ liệu thời tiết thật từ Open-Meteo. Vui lòng thử lại sau.")

    daily_payload = payload.get("daily") or {}
    dates = daily_payload.get("time") or []
    humidity_values = (payload.get("hourly") or {}).get("relative_humidity_2m") or []
    current = payload.get("current") or {}
    current_humidity = int(current.get("relative_humidity_2m") or 70)
    rows = []

    for index, day in enumerate(dates[:7]):
        humidity_slice = humidity_values[index * 24 : (index + 1) * 24]
        humidity = round(sum(humidity_slice) / len(humidity_slice)) if humidity_slice else current_humidity
        temp_max = float((daily_payload.get("temperature_2m_max") or [0])[index] or 0)
        temp_min = float((daily_payload.get("temperature_2m_min") or [0])[index] or 0)
        rain_probability = int((daily_payload.get("precipitation_probability_max") or [0])[index] or 0)
        wind = float((daily_payload.get("wind_speed_10m_max") or [0])[index] or 0)
        weather_code = int((daily_payload.get("weather_code") or [0])[index] or 0)
        rows.append(
            {
                "date": day,
                "temperature_c": round((temp_max + temp_min) / 2),
                "temperature_max_c": round(temp_max),
                "temperature_min_c": round(temp_min),
                "humidity_percent": humidity,
                "rain_probability_percent": rain_probability,
                "wind_kmh": round(wind),
                "summary": _weather_summary(weather_code),
                "summary_en": _weather_summary_en(weather_code),
            }
        )

    if not rows:
        raise WeatherDataUnavailable("Open-Meteo không trả về dự báo cho tọa độ này.")

    current = _current_conditions(payload, rows)
    return {
        "source": "open_meteo",
        "latitude": lat,
        "longitude": lon,
        # fetched_at is when we asked Open-Meteo; observed_at is when the
        # reading itself was taken, in the field's own timezone.
        "fetched_at": timezone.now().isoformat(),
        "observed_at": current.get("observed_at"),
        "timezone": payload.get("timezone") or "",
        "current": current,
        "today": rows[0],
        "forecast_3d": rows[:3],
        "forecast_7d": rows,
    }


def _current_conditions(payload: dict[str, Any], rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Real "right now" reading from the Open-Meteo `current` block.

    The daily row is an aggregate — its wind is the day's MAXIMUM and its
    temperature the midpoint of max/min — so it must never be shown as the
    current conditions. Falls back to today's aggregate only if Open-Meteo
    omits the block, and says so through `is_current`.
    """
    today = rows[0]
    current = payload.get("current") or {}
    observed_at = current.get("time")
    if not observed_at:
        return {**today, "observed_at": None, "is_current": False}

    hourly = payload.get("hourly") or {}
    hours = hourly.get("time") or []
    probabilities = hourly.get("precipitation_probability") or []
    rain_probability = today["rain_probability_percent"]
    for index, stamp in enumerate(hours):
        # Open-Meteo stamps `current` to the quarter hour and `hourly` to the hour.
        if str(stamp)[:13] == str(observed_at)[:13] and index < len(probabilities):
            if probabilities[index] is not None:
                rain_probability = int(probabilities[index])
            break

    temperature = current.get("temperature_2m")
    humidity = current.get("relative_humidity_2m")
    wind = current.get("wind_speed_10m")
    return {
        "date": str(observed_at)[:10],
        "observed_at": observed_at,
        "is_current": True,
        "temperature_c": round(float(temperature)) if temperature is not None else today["temperature_c"],
        "humidity_percent": int(humidity) if humidity is not None else today["humidity_percent"],
        "rain_probability_percent": rain_probability,
        "wind_kmh": round(float(wind)) if wind is not None else today["wind_kmh"],
        "precipitation_mm": round(float(current.get("precipitation") or 0), 1),
        "summary": _weather_summary(int(current.get("weather_code") or 0)),
        "summary_en": _weather_summary_en(int(current.get("weather_code") or 0)),
    }


def _weather_warning_pairs(today: dict[str, Any], daily: list[dict[str, Any]]) -> list[tuple[str, str]]:
    """Weather warnings as (Vietnamese, English) pairs, kept in the same order.

    Driven by today's daily aggregate rather than the instantaneous reading:
    every message is advice for the whole day ("hôm nay").
    """
    current = today
    warnings: list[tuple[str, str]] = []
    if current["rain_probability_percent"] >= 60:
        warnings.append(
            (
                "Khả năng mưa cao, hạn chế phun thuốc ngoài trời hôm nay.",
                "High chance of rain; limit outdoor spraying today.",
            )
        )
    if current["temperature_c"] >= 35:
        warnings.append(
            (
                "Nắng nóng, ưu tiên tưới sáng sớm hoặc chiều mát.",
                "Hot weather; water in the early morning or the cool late afternoon.",
            )
        )
    if current["humidity_percent"] >= 80:
        warnings.append(
            (
                "Độ ẩm cao, cần theo dõi nguy cơ nấm bệnh.",
                "High humidity; watch for fungal disease risk.",
            )
        )
    if any(day["rain_probability_percent"] >= 75 for day in daily[:3]):
        warnings.append(
            (
                "Có ngày mưa lớn trong 3 ngày tới, kiểm tra rãnh thoát nước để giảm nguy cơ ngập úng.",
                "Heavy rain is expected in the next 3 days; check the drainage ditches to reduce the risk of waterlogging.",
            )
        )
    if not warnings:
        warnings.append(
            (
                "Chưa có cảnh báo thời tiết nghiêm trọng trong hôm nay.",
                "No severe weather warning for today.",
            )
        )
    return warnings


def _weather_warnings(today: dict[str, Any], daily: list[dict[str, Any]]) -> list[str]:
    return [vi for vi, _ in _weather_warning_pairs(today, daily)]


def _today_row(weather: dict[str, Any]) -> dict[str, Any]:
    """Today's daily aggregate, tolerating a payload built before `today` existed."""
    return weather.get("today") or weather["forecast_7d"][0]


def build_weather(location: Any, crop: str = "") -> dict[str, Any]:
    crop_name = crop or getattr(location, "crop_type", "") or "cây trồng"
    weather = _fetch_open_meteo(location)

    daily = weather["forecast_7d"]
    warning_pairs = _weather_warning_pairs(_today_row(weather), daily)
    return {
        **weather,
        "location_name": getattr(location, "name", "Vị trí canh tác"),
        "crop": crop_name,
        "warnings": [vi for vi, _ in warning_pairs],
        "warnings_en": [en for _, en in warning_pairs],
        "message": "Dữ liệu thời tiết thật lấy từ Open-Meteo theo tọa độ vị trí canh tác.",
        "message_en": "Live weather data from Open-Meteo for your field coordinates.",
    }


def build_pest_alerts(location: Any, crop: str = "", weather: dict[str, Any] | None = None) -> dict[str, Any]:
    weather = weather or build_weather(location, crop)
    crop_name = crop or getattr(location, "crop_type", "") or "cây trồng"
    # Disease pressure builds over a day, so score it on today's aggregate.
    today = _today_row(weather)
    risk_level = _risk_from_conditions(
        crop_name,
        today["humidity_percent"],
        today["rain_probability_percent"],
        today["temperature_c"],
    )

    alerts = []
    if risk_level == "high":
        alerts.append(
            {
                "title": "Nguy cơ nấm bệnh tăng",
                "title_en": "Rising fungal disease risk",
                "description": "Độ ẩm hoặc mưa cao có thể làm bệnh đốm lá, sương mai hoặc thán thư phát triển nhanh hơn.",
                "description_en": "High humidity or rainfall can let leaf spot, downy mildew or anthracnose spread faster.",
                "severity": "high",
            }
        )
    elif risk_level == "medium":
        alerts.append(
            {
                "title": "Cần theo dõi sâu bệnh",
                "title_en": "Keep monitoring for pests and disease",
                "description": "Điều kiện thời tiết ở mức cần quan sát thêm, đặc biệt ở lá non và mặt dưới lá.",
                "description_en": "Weather conditions call for closer scouting, especially on young leaves and leaf undersides.",
                "severity": "medium",
            }
        )
    else:
        alerts.append(
            {
                "title": "Rủi ro sâu bệnh thấp",
                "title_en": "Low pest and disease risk",
                "description": "Điều kiện hiện tại tương đối ổn định, vẫn nên kiểm tra vườn định kỳ.",
                "description_en": "Conditions are fairly stable right now, but keep scouting the field regularly.",
                "severity": "low",
            }
        )

    return {
        "crop": crop_name,
        "risk_level": risk_level,
        "alerts": alerts,
        "source": "weather_rule_engine",
    }


def build_farm_advisory(location: Any, crop: str = "") -> dict[str, Any]:
    weather = build_weather(location, crop)
    pest_alerts = build_pest_alerts(location, crop, weather)
    # Whole-day advice, so the daily aggregate is the right input: its wind is
    # the day's maximum, which is exactly what a spray decision should respect.
    current = _today_row(weather)
    should_water = current["rain_probability_percent"] < 45 and current["temperature_c"] >= 28
    should_fertilize = current["rain_probability_percent"] < 55
    should_spray = current["rain_probability_percent"] < 45 and current["wind_kmh"] <= 18

    recommendation_pairs: list[tuple[str, str]] = [
        (
            ("Nên tưới nước vào sáng sớm hoặc chiều mát.", "Water in the early morning or the cool late afternoon.")
            if should_water
            else (
                "Không cần tưới nhiều nếu đất còn ẩm hoặc sắp mưa.",
                "No heavy watering needed if the soil is still moist or rain is on the way.",
            )
        ),
        (
            (
                "Có thể bón phân nếu đất đủ ẩm và không có mưa lớn.",
                "You can fertilise if the soil is moist enough and no heavy rain is expected.",
            )
            if should_fertilize
            else (
                "Tạm hoãn bón phân nếu khả năng mưa cao.",
                "Hold off on fertilising while the chance of rain is high.",
            )
        ),
        (
            (
                "Có thể phun thuốc khi cần thiết và gió nhẹ.",
                "You can spray when needed while the wind stays light.",
            )
            if should_spray
            else (
                "Không nên phun thuốc hôm nay vì mưa/gió có thể làm giảm hiệu quả.",
                "Avoid spraying today; rain or wind can reduce its effectiveness.",
            )
        ),
    ]

    if current["humidity_percent"] >= 78:
        recommendation_pairs.append(
            (
                "Độ ẩm cao, tăng kiểm tra mặt dưới lá và vùng tán rậm.",
                "Humidity is high; check leaf undersides and dense canopy areas more often.",
            )
        )

    return {
        "weather": weather,
        "pest_alerts": pest_alerts,
        "recommendations": [vi for vi, _ in recommendation_pairs],
        "recommendations_en": [en for _, en in recommendation_pairs],
        "disclaimer": DISCLAIMER,
        "disclaimer_en": DISCLAIMER_EN,
    }
