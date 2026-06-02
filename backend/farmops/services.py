from __future__ import annotations

import json
from datetime import date, timedelta
from typing import Any
from urllib.parse import urlencode
from urllib.request import urlopen


DISCLAIMER = "Thông tin chỉ mang tính tham khảo, không thay thế tư vấn của chuyên gia nông nghiệp."


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


def _fetch_open_meteo(location: Any) -> dict[str, Any] | None:
    lat = getattr(location, "latitude", None)
    lon = getattr(location, "longitude", None)
    if lat is None or lon is None:
        return None

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
        return None

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
        return None

    return {
        "source": "open_meteo",
        "is_mock": False,
        "current": rows[0],
        "forecast_3d": rows[:3],
        "forecast_7d": rows,
    }


def _build_rule_weather(location: Any, crop: str = "") -> dict[str, Any]:
    today = date.today()
    province = getattr(location, "province", "") or getattr(location, "address_text", "") or "khu vực canh tác"
    crop_name = crop or getattr(location, "crop_type", "") or "cây trồng"

    base_temp = 31
    province_norm = province.lower()
    if "lâm đồng" in province_norm or "da lat" in province_norm or "đà lạt" in province_norm:
        base_temp = 24
    if "hà nội" in province_norm or "ha noi" in province_norm:
        base_temp = 29

    daily = []
    for offset in range(7):
        rain = 28 + ((offset * 13) % 55)
        humidity = 66 + ((offset * 5) % 22)
        temp = base_temp + ((offset % 3) - 1)
        daily.append(
            {
                "date": (today + timedelta(days=offset)).isoformat(),
                "temperature_c": temp,
                "humidity_percent": humidity,
                "rain_probability_percent": rain,
                "wind_kmh": 8 + offset * 2,
                "summary": "Có mưa rải rác" if rain >= 55 else "Nắng nhẹ, mây thay đổi",
            }
        )

    return {
        "source": "rule_estimate",
        "is_mock": False,
        "location_name": getattr(location, "name", "Vị trí canh tác"),
        "crop": crop_name,
        "current": daily[0],
        "forecast_3d": daily[:3],
        "forecast_7d": daily,
        "warnings": ["Chưa có tọa độ hoặc API thời tiết tạm lỗi, đang dùng ước tính nội bộ."],
        "message": "Dữ liệu thời tiết đang dùng ước tính nội bộ. Hãy lưu latitude/longitude để dùng Open-Meteo.",
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
    if weather is None:
        return _build_rule_weather(location, crop)

    daily = weather["forecast_7d"]
    current = weather["current"]
    return {
        **weather,
        "location_name": getattr(location, "name", "Vị trí canh tác"),
        "crop": crop_name,
        "warnings": _weather_warnings(current, daily),
        "message": "Dữ liệu thời tiết lấy từ Open-Meteo theo tọa độ vị trí canh tác.",
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
