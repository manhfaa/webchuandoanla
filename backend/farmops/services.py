from __future__ import annotations

from datetime import date, timedelta
from typing import Any


DISCLAIMER = "Thông tin chỉ mang tính tham khảo, không thay thế tư vấn của chuyên gia nông nghiệp."


def _risk_from_conditions(crop: str, humidity: int, rain_probability: int, temperature: int) -> str:
    crop_norm = crop.lower()
    fungal_sensitive = any(key in crop_norm for key in ["tomato", "cà chua", "potato", "khoai", "pepper", "tiêu"])
    if humidity >= 82 or rain_probability >= 70:
        return "high" if fungal_sensitive else "medium"
    if temperature >= 35 or humidity >= 75 or rain_probability >= 45:
        return "medium"
    return "low"


def build_weather(location: Any, crop: str = "") -> dict[str, Any]:
    today = date.today()
    province = getattr(location, "province", "") or getattr(location, "address_text", "") or "khu vực canh tác"
    crop_name = crop or getattr(location, "crop_type", "") or "cây trồng"

    base_temp = 31
    if "lâm đồng" in province.lower() or "da lat" in province.lower() or "đà lạt" in province.lower():
        base_temp = 24
    if "hà nội" in province.lower() or "ha noi" in province.lower():
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

    current = daily[0]
    warnings = []
    if current["rain_probability_percent"] >= 60:
        warnings.append("Khả năng mưa cao, hạn chế phun thuốc ngoài trời hôm nay.")
    if current["temperature_c"] >= 35:
        warnings.append("Nắng nóng, ưu tiên tưới sáng sớm hoặc chiều mát.")
    if current["humidity_percent"] >= 80:
        warnings.append("Độ ẩm cao, cần theo dõi nguy cơ nấm bệnh.")
    if any(day["rain_probability_percent"] >= 75 for day in daily[:3]):
        warnings.append("Có ngày mưa lớn trong 3 ngày tới, kiểm tra rãnh thoát nước để giảm nguy cơ ngập úng.")
    if current["rain_probability_percent"] <= 20 and current["temperature_c"] >= 33:
        warnings.append("Dấu hiệu khô hạn, ưu tiên giữ ẩm đất và che phủ gốc khi cần.")
    if current["temperature_c"] <= 15:
        warnings.append("Nhiệt độ thấp, cần che chắn cây non và hạn chế tưới muộn.")
    if not warnings:
        warnings.append("Chưa có cảnh báo thời tiết nghiêm trọng trong hôm nay.")

    return {
        "source": "mock_weather",
        "is_mock": True,
        "location_name": getattr(location, "name", "Vị trí canh tác"),
        "crop": crop_name,
        "current": current,
        "forecast_3d": daily[:3],
        "forecast_7d": daily,
        "warnings": warnings,
        "message": "Dữ liệu thời tiết đang được mô phỏng.",
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
        "source": "mock_pest_rules",
        "is_mock": True,
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
