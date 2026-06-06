from __future__ import annotations

import json
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen


DISCLAIMER = "Thông tin chỉ mang tính tham khảo, không thay thế tư vấn của chuyên gia nông nghiệp."


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
            "User-Agent": "AgromindAI/1.0 (https://agromindai.vercel.app)",
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
    query_sets = [
        [address_text, ward, district, province, "Việt Nam"],
        [ward, district, province, "Việt Nam"],
        [district, province, "Việt Nam"],
        [province, "Việt Nam"],
    ]
    for parts in query_sets:
        query = ", ".join(part.strip() for part in parts if part and part.strip())
        result = geocode_location_query(query)
        if result:
            return result
    return None


def _risk_from_conditions(crop: str, humidity: int, rain_probability: int, temperature: int) -> str:
    crop_norm = crop.lower()
    fungal_sensitive = any(key in crop_norm for key in ["tomato", "cà chua", "potato", "khoai", "pepper", "tiêu"])
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


def _fetch_open_meteo(location: Any) -> dict[str, Any]:
    lat = getattr(location, "latitude", None)
    lon = getattr(location, "longitude", None)
    if lat is None or lon is None:
        raise WeatherDataUnavailable("Vị trí chưa có tọa độ. Hãy lấy GPS hiện tại hoặc nhập địa chỉ rõ hơn để geocode.")

    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code",
        "hourly": "relative_humidity_2m",
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
                "humidity_percent": humidity,
                "rain_probability_percent": rain_probability,
                "wind_kmh": round(wind),
                "summary": _weather_summary(weather_code),
            }
        )

    if not rows:
        raise WeatherDataUnavailable("Open-Meteo không trả về dự báo cho tọa độ này.")

    return {
        "source": "open_meteo",
        "is_mock": False,
        "latitude": lat,
        "longitude": lon,
        "current": rows[0],
        "forecast_3d": rows[:3],
        "forecast_7d": rows,
    }


def _weather_warnings(current: dict[str, Any], daily: list[dict[str, Any]]) -> list[str]:
    warnings = []
    if current["rain_probability_percent"] >= 60:
        warnings.append("Khả năng mưa cao, hạn chế phun thuốc ngoài trời hôm nay.")
    if current["temperature_c"] >= 35:
        warnings.append("Nắng nóng, ưu tiên tưới sáng sớm hoặc chiều mát.")
    if current["humidity_percent"] >= 80:
        warnings.append("Độ ẩm cao, cần theo dõi nguy cơ nấm bệnh.")
    if any(day["rain_probability_percent"] >= 75 for day in daily[:3]):
        warnings.append("Có ngày mưa lớn trong 3 ngày tới, kiểm tra rãnh thoát nước để giảm nguy cơ ngập úng.")
    if not warnings:
        warnings.append("Chưa có cảnh báo thời tiết nghiêm trọng trong hôm nay.")
    return warnings


def build_weather(location: Any, crop: str = "") -> dict[str, Any]:
    crop_name = crop or getattr(location, "crop_type", "") or "cây trồng"
    weather = _fetch_open_meteo(location)

    daily = weather["forecast_7d"]
    current = weather["current"]
    return {
        **weather,
        "location_name": getattr(location, "name", "Vị trí canh tác"),
        "crop": crop_name,
        "warnings": _weather_warnings(current, daily),
        "message": "Dữ liệu thời tiết thật lấy từ Open-Meteo theo tọa độ vị trí canh tác.",
    }


def build_pest_alerts(location: Any, crop: str = "", weather: dict[str, Any] | None = None) -> dict[str, Any]:
    weather = weather or build_weather(location, crop)
    crop_name = crop or getattr(location, "crop_type", "") or "cây trồng"
    current = weather["current"]
    risk_level = _risk_from_conditions(
        crop_name,
        current["humidity_percent"],
        current["rain_probability_percent"],
        current["temperature_c"],
    )

    alerts = []
    if risk_level == "high":
        alerts.append(
            {
                "title": "Nguy cơ nấm bệnh tăng",
                "description": "Độ ẩm hoặc mưa cao có thể làm bệnh đốm lá, sương mai hoặc thán thư phát triển nhanh hơn.",
                "severity": "high",
            }
        )
    elif risk_level == "medium":
        alerts.append(
            {
                "title": "Cần theo dõi sâu bệnh",
                "description": "Điều kiện thời tiết ở mức cần quan sát thêm, đặc biệt ở lá non và mặt dưới lá.",
                "severity": "medium",
            }
        )
    else:
        alerts.append(
            {
                "title": "Rủi ro sâu bệnh thấp",
                "description": "Điều kiện hiện tại tương đối ổn định, vẫn nên kiểm tra vườn định kỳ.",
                "severity": "low",
            }
        )

    return {
        "crop": crop_name,
        "risk_level": risk_level,
        "alerts": alerts,
        "source": "weather_rule_engine",
        "is_mock": False,
    }


def build_farm_advisory(location: Any, crop: str = "") -> dict[str, Any]:
    weather = build_weather(location, crop)
    pest_alerts = build_pest_alerts(location, crop, weather)
    current = weather["current"]
    should_water = current["rain_probability_percent"] < 45 and current["temperature_c"] >= 28
    should_fertilize = current["rain_probability_percent"] < 55
    should_spray = current["rain_probability_percent"] < 45 and current["wind_kmh"] <= 18

    recommendations = [
        "Nên tưới nước vào sáng sớm hoặc chiều mát." if should_water else "Không cần tưới nhiều nếu đất còn ẩm hoặc sắp mưa.",
        "Có thể bón phân nếu đất đủ ẩm và không có mưa lớn." if should_fertilize else "Tạm hoãn bón phân nếu khả năng mưa cao.",
        "Có thể phun thuốc khi cần thiết và gió nhẹ." if should_spray else "Không nên phun thuốc hôm nay vì mưa/gió có thể làm giảm hiệu quả.",
    ]

    if current["humidity_percent"] >= 78:
        recommendations.append("Độ ẩm cao, tăng kiểm tra mặt dưới lá và vùng tán rậm.")

    return {
        "weather": weather,
        "pest_alerts": pest_alerts,
        "recommendations": recommendations,
        "disclaimer": DISCLAIMER,
    }
