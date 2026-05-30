from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Any
from zoneinfo import ZoneInfo

from django.db import transaction
from django.utils import timezone

from crop_plans.models import CompletionLog, Crop, CropLocation, CropPlan, CropPlanStep, Reminder, WeatherSnapshot

from .nasa_power import fetch_nasa_power


@dataclass
class PlanContext:
    crop: Crop
    location: CropLocation
    planting_mode: str
    area_value: Decimal | None
    area_unit: str
    plant_count: int
    start_date: date
    experience_level: str
    plan_goal: str
    timezone_name: str


PHASE_LABELS = {
    "preparation": "Chuẩn bị",
    "sowing": "Gieo trồng",
    "early_care": "Chăm sóc ban đầu",
    "maintenance": "Chăm sóc định kỳ",
    "monitoring": "Theo dõi",
    "harvest": "Thu hoạch",
}


def _localize(day: date, hh: int, mm: int, tz_name: str) -> datetime:
    zone = ZoneInfo(tz_name or "Asia/Ho_Chi_Minh")
    return datetime.combine(day, time(hour=hh, minute=mm), tzinfo=zone)


def _decimal_or_none(value: Any) -> Decimal | None:
    if value in (None, "", 0):
        return None
    return Decimal(str(value))


def evaluate_suitability(crop: Crop, metrics: dict, planting_mode: str, experience_level: str) -> dict:
    climate = crop.climate_profile or {}
    optimal_temp = climate.get("optimal_temp_c", [22, 30])
    humidity_range = climate.get("optimal_humidity_pct", [55, 80])
    sunlight_hours = climate.get("sunlight_hours_min", 6)

    score = 100
    warnings: list[str] = []
    avg_temp = metrics.get("avg_temp_14d", 0)
    rain_14d = metrics.get("rain_sum_14d", 0)
    humidity = metrics.get("humidity_avg_14d", 0)
    sun_hours = metrics.get("sun_hours_proxy", 0)

    if avg_temp < optimal_temp[0]:
        score -= 18
        warnings.append("Nhiệt độ hiện tại hơi thấp, nên lùi lịch gieo để cây dễ nảy mầm hơn.")
    elif avg_temp > optimal_temp[1] + 3:
        score -= 12
        warnings.append("Nhiệt độ cao, cần che nắng giai đoạn đầu và theo dõi mặt nước.")

    if humidity > humidity_range[1]:
        score -= 12
        warnings.append("Độ ẩm cao, cần thông thoáng và tăng kiểm tra nấm bệnh.")

    if rain_14d > climate.get("rain_14d_high_mm", 80):
        score -= 15
        warnings.append("Mưa nhiều trong 2 tuần tới, nên giảm tưới và ưu tiên đất thoát nước.")

    if sun_hours < sunlight_hours:
        score -= 10
        warnings.append("Lượng nắng dự kiến chưa cao, nên ưu tiên vị trí nhận nắng buổi sáng.")

    if planting_mode == "pot":
        warnings.append("Trồng chậu cần kiểm tra lỗ thoát nước và độ ẩm đất thường xuyên hơn trồng đất.")
    if experience_level == "beginner":
        score -= 3

    score = max(25, min(98, int(score)))
    if score >= 78:
        level = CropPlan.SuitabilityLevel.SUITABLE
    elif score >= 58:
        level = CropPlan.SuitabilityLevel.BORDERLINE
    else:
        level = CropPlan.SuitabilityLevel.NOT_RECOMMENDED

    start_shift_days = 0
    if rain_14d > climate.get("rain_14d_high_mm", 80):
        start_shift_days = max(start_shift_days, 2)
    if avg_temp < optimal_temp[0]:
        start_shift_days = max(start_shift_days, 4)

    return {
        "score": score,
        "level": level,
        "warnings": warnings[:4],
        "recommended_start_shift_days": start_shift_days,
        "reasoning_summary": (
            f"Khu vực này có nhiệt độ trung bình {avg_temp}°C, độ ẩm {humidity}% và tổng mưa 14 ngày "
            f"{rain_14d} mm. Hệ thống đánh giá mức phù hợp ở mức "
            f"{'tốt' if level == CropPlan.SuitabilityLevel.SUITABLE else 'cần cân nhắc'}."
        ),
    }


def _water_amount(planting_mode: str, plant_count: int) -> tuple[Decimal, str]:
    if planting_mode == "pot":
        return Decimal("600"), "ml/chậu/lần"
    if plant_count >= 20:
        return Decimal("1.5"), "lít/cây/lần"
    return Decimal("1.2"), "lít/cây/lần"


def build_step_templates(context: PlanContext, metrics: dict) -> list[dict]:
    rain_14d = metrics.get("rain_sum_14d", 0)
    humid = metrics.get("humidity_avg_14d", 0)
    water_value, water_unit = _water_amount(context.planting_mode, context.plant_count)
    planting_distance = "50-60 cm giữa các cây" if context.planting_mode == "ground" else "mỗi chậu 1 cây"
    plan_scale_note = (
        "Tách thành checklist theo từng khu chậu để dễ kiểm soát tiến độ."
        if context.plant_count >= 15 or (context.area_value and context.area_value >= 20)
        else "Làm theo từng cây hoặc từng cụm nhỏ."
    )

    return [
        {
            "phase_key": "preparation",
            "title": "Chuẩn bị giá thể và dụng cụ trồng",
            "short_label": "Chuẩn bị đất",
            "description": (
                "Trộn đất sạch với phân hữu cơ hoai mục và vật liệu giúp thoát nước. "
                f"Nếu trồng đất, làm tơi mặt đất và giữ khoảng cách {planting_distance}. "
                "Nếu trồng chậu, sử dụng chậu 20-30 lít có ít nhất 4 lỗ thoát nước."
            ),
            "why_this_step_matters": "Nền trồng thông thoáng giúp rễ phát triển nhanh, giảm úng và hạn chế nấm.",
            "prerequisites": ["Kiểm tra vị trí trồng có nhận đủ nắng buổi sáng."],
            "tools_needed": ["Chậu hoặc luống trồng", "Đất sạch", "Phân hữu cơ", "Xẻng tay", "Găng tay"],
            "estimated_duration_minutes": 60,
            "start_offset_days": -1,
            "start_time": [7, 0],
            "duration_minutes": 60,
            "repeat_rule": None,
            "completion_condition": "Đất tơi, không đọng nước sau khi tưới thử 1 ca nước nhẹ.",
            "risk_notes": ["Nếu đất nén chặt, cây dễ bị vàng lá và chậm lớn."],
            "weather_dependency": {"avoid_if": ["heavy_rain"]},
            "water_amount": None,
            "fertilizer_amount": {"value": 1.5, "unit": "kg phân hữu cơ/10 lít đất"} if context.planting_mode == "pot" else {"value": 2.0, "unit": "kg phân hữu cơ/m2"},
            "sunlight_requirement": "Vị trí có 6-8 giờ nắng/ngày",
            "reminder_offsets_minutes": [30],
        },
        {
            "phase_key": "sowing",
            "title": "Xử lý hạt giống trước khi gieo",
            "short_label": "Xử lý hạt",
            "description": "Ngâm hạt trong nước ấm 2-4 giờ, sau đó để ráo. Loại bỏ hạt nổi trên mặt nước nếu có.",
            "why_this_step_matters": "Hạt hút đủ ẩm đều hơn và tăng tỷ lệ nảy mầm.",
            "prerequisites": ["Đã chuẩn bị giá thể."],
            "tools_needed": ["Hạt giống", "Ly nước ấm", "Khay hoặc khăn sạch"],
            "estimated_duration_minutes": 25,
            "start_offset_days": 0,
            "start_time": [6, 30],
            "duration_minutes": 25,
            "repeat_rule": None,
            "completion_condition": "Hạt nở đều, không ngâm quá lâu đến mức mềm vỏ.",
            "risk_notes": ["Ngâm quá lâu có thể làm hạt bị úng, khó nảy mầm."],
            "weather_dependency": {},
            "water_amount": None,
            "fertilizer_amount": None,
            "sunlight_requirement": "Chưa cần phơi nắng",
            "reminder_offsets_minutes": [20],
        },
        {
            "phase_key": "sowing",
            "title": "Gieo hạt và phủ lớp đất mỏng",
            "short_label": "Gieo hạt",
            "description": "Mỗi lỗ gieo 1-2 hạt, đặt sâu 0.5-1 cm, phủ đất mỏng và tưới phun sương nhẹ.",
            "why_this_step_matters": "Độ sâu gieo và độ ẩm phù hợp giúp hạt nảy mầm nhanh và đồng đều.",
            "prerequisites": ["Đã xử lý hạt hoặc chuẩn bị hạt giống."],
            "tools_needed": ["Khay gieo hoặc chậu", "Bình phun sương", "Nhãn ghi ngày gieo"],
            "estimated_duration_minutes": 35,
            "start_offset_days": 0,
            "start_time": [7, 15],
            "duration_minutes": 35,
            "repeat_rule": None,
            "completion_condition": "Mặt đất ẩm đều, hạt được phủ đất mỏng và ghi ngày gieo.",
            "risk_notes": ["Không nên ấn hạt quá sâu vì sẽ khó đội mầm."],
            "weather_dependency": {"avoid_if": ["storm"]},
            "water_amount": {"value": 150, "unit": "ml/khay gieo"},
            "fertilizer_amount": None,
            "sunlight_requirement": "Ánh sáng tán xạ, tránh nắng gắt ngay lập tức",
            "reminder_offsets_minutes": [20],
        },
        {
            "phase_key": "early_care",
            "title": "Kiểm tra nảy mầm và bổ sung cây dự phòng",
            "short_label": "Kiểm tra nảy mầm",
            "description": "Sau gieo 5-7 ngày, kiểm tra các lỗ gieo đã đội mầm chưa. Nếu lỗ nào không lên, có thể gieo bù ngay.",
            "why_this_step_matters": "Phát hiện sớm lỗ gieo hỏng để bổ sung kịp, giữ mật độ cây đều.",
            "prerequisites": ["Đã hoàn thành gieo hạt."],
            "tools_needed": ["Sổ ghi chú", "Bình phun sương"],
            "estimated_duration_minutes": 15,
            "start_offset_days": 7,
            "start_time": [7, 0],
            "duration_minutes": 15,
            "repeat_rule": {"freq": "daily", "count": 3, "times_of_day": ["07:00"]},
            "completion_condition": "Đã ghi nhận tỷ lệ nảy mầm và quyết định có bổ sung hay không.",
            "risk_notes": ["Độ ẩm quá cao dễ phát sinh nấm ở giai đoạn nảy mầm."],
            "weather_dependency": {},
            "water_amount": {"value": 120, "unit": "ml/khay/lần"},
            "fertilizer_amount": None,
            "sunlight_requirement": "Tăng dần ánh sáng mỗi ngày",
            "reminder_offsets_minutes": [30],
        },
        {
            "phase_key": "early_care",
            "title": "Tập cho cây con làm quen với nắng",
            "short_label": "Tập nắng",
            "description": "Khi cây có 2-3 lá thật, đưa cây ra nắng sáng 2-3 giờ/ngày, sau đó tăng dần lên 4-6 giờ.",
            "why_this_step_matters": "Cây con cần thích nghi từ từ để tránh sốc nhiệt và cháy lá.",
            "prerequisites": ["Cây con đã lên đều."],
            "tools_needed": ["Khay hoặc chậu cây", "Lưới che nắng nếu cần"],
            "estimated_duration_minutes": 20,
            "start_offset_days": 12,
            "start_time": [7, 30],
            "duration_minutes": 20,
            "repeat_rule": {"freq": "daily", "count": 3, "times_of_day": ["07:30"]},
            "completion_condition": "Lá đứng, xanh và không héo sau khi đưa ra nắng sáng.",
            "risk_notes": ["Nếu lá non bị quặp, giảm thời gian phơi nắng vào ngày hôm sau."],
            "weather_dependency": {"avoid_if": ["extreme_heat"]},
            "water_amount": None,
            "fertilizer_amount": None,
            "sunlight_requirement": "Tăng dần từ 2 giờ lên 6 giờ nắng sáng",
            "reminder_offsets_minutes": [25],
        },
        {
            "phase_key": "maintenance",
            "title": "Tưới nước định kỳ",
            "short_label": "Tưới nước",
            "description": (
                "Tưới vào 6h sáng và 17h chiều. Kiểm tra độ ẩm đất trước khi tưới; "
                f"nếu đất còn ẩm do mưa gần đây ({rain_14d} mm/14 ngày) thì giảm hoặc bỏ cữ tưới chiều. "
                f"{plan_scale_note}"
            ),
            "why_this_step_matters": "Cà chua cần độ ẩm ổn định để phát triển thân lá và nuôi quả.",
            "prerequisites": ["Đã gieo trồng và cây bắt đầu phát triển."],
            "tools_needed": ["Bình tưới hoặc hệ thống tưới nhẹ", "Độ ẩm đất cầm tay"],
            "estimated_duration_minutes": 12 if context.plant_count <= 10 else 25,
            "start_offset_days": 1,
            "start_time": [6, 0],
            "duration_minutes": 10,
            "repeat_rule": {"freq": "daily", "until_offset_days": 75, "times_of_day": ["06:00", "17:00"]},
            "completion_condition": "Đất ẩm đều ở lớp rễ, không đọng nước dưới chậu hay mặt luống.",
            "risk_notes": ["Nếu mưa nhiều thì bỏ cữ tưới chiều.", "Nếu đất đã ẩm, không nên tưới thêm."],
            "weather_dependency": {"skip_if": ["rain_today_mm > 8"]},
            "water_amount": {"value": float(water_value), "unit": water_unit},
            "fertilizer_amount": None,
            "sunlight_requirement": "Duy trì 6-8 giờ nắng/ngày",
            "reminder_offsets_minutes": [15],
        },
        {
            "phase_key": "maintenance",
            "title": "Bón phân nhẹ theo chu kỳ",
            "short_label": "Bón phân",
            "description": "Bắt đầu bón nhẹ từ ngày 20 đến ngày 35 sau gieo, lặp lại mỗi 5 ngày. Bón cách gốc 5-7 cm.",
            "why_this_step_matters": "Bón đúng lúc giúp cây ra thân lá khỏe và sẵn sàng ra hoa.",
            "prerequisites": ["Cây đã ổn định sau giai đoạn cây con."],
            "tools_needed": ["Phân hữu cơ hoặc NPK loãng", "Muỗng đo", "Găng tay"],
            "estimated_duration_minutes": 20,
            "start_offset_days": 20,
            "start_time": [6, 30],
            "duration_minutes": 20,
            "repeat_rule": {"freq": "every_n_days", "interval_days": 5, "until_offset_days": 35, "times_of_day": ["06:30"]},
            "completion_condition": "Đã bón đúng liều, không để phân chạm trực tiếp vào thân cây.",
            "risk_notes": ["Không bón lúc đất đang quá ướt hoặc ngày nắng gắt giữa trưa."],
            "weather_dependency": {"avoid_if": ["heavy_rain", "storm"]},
            "water_amount": None,
            "fertilizer_amount": {"value": 15 if context.planting_mode == "pot" else 25, "unit": "g/cây/lần"},
            "sunlight_requirement": "Bón vào sáng sớm, tránh nóng cao",
            "reminder_offsets_minutes": [60],
        },
        {
            "phase_key": "maintenance",
            "title": "Cắm cọc và buộc thân",
            "short_label": "Cắm cọc",
            "description": "Khi cây cao 25-35 cm, cắm cọc sát mép chậu hoặc cạnh gốc, buộc thân bằng dây mềm.",
            "why_this_step_matters": "Cắm cọc giúp cây đứng thẳng, thông thoáng và dễ chăm sóc.",
            "prerequisites": ["Cây đã lớn và thân chính rõ."],
            "tools_needed": ["Cọc tre hoặc cọc nhựa", "Dây buộc mềm", "Kéo"],
            "estimated_duration_minutes": 30,
            "start_offset_days": 24,
            "start_time": [7, 15],
            "duration_minutes": 30,
            "repeat_rule": None,
            "completion_condition": "Thân đứng, được buộc nhẹ và không bị cong gãy.",
            "risk_notes": ["Tránh đâm cọc quá sát rễ."],
            "weather_dependency": {},
            "water_amount": None,
            "fertilizer_amount": None,
            "sunlight_requirement": "Tiếp tục duy trì nắng sáng tốt",
            "reminder_offsets_minutes": [30],
        },
        {
            "phase_key": "monitoring",
            "title": "Kiểm tra sâu bệnh và lá bất thường",
            "short_label": "Kiểm tra sâu bệnh",
            "description": f"Mỗi 2 ngày kiểm tra lá, thân non và chỗ giao giữa các cành. Độ ẩm đang ở {humid}%, cần ưu tiên tìm dấu hiệu nấm.",
            "why_this_step_matters": "Phát hiện sớm giúp xử lý nhẹ hơn và tránh lan sang nhiều cây.",
            "prerequisites": ["Cây đã vào giai đoạn phát triển thân lá."],
            "tools_needed": ["Găng tay", "Sổ ghi chú", "Điện thoại chụp ảnh nếu cần"],
            "estimated_duration_minutes": 15,
            "start_offset_days": 18,
            "start_time": [7, 0],
            "duration_minutes": 15,
            "repeat_rule": {"freq": "every_n_days", "interval_days": 2, "until_offset_days": 80, "times_of_day": ["07:00"]},
            "completion_condition": "Đã ghi nhận lá, thân, hoa/quả có bình thường hay không.",
            "risk_notes": ["Sau mưa cần kiểm tra kỹ hơn vì môi trường ẩm dễ phát sinh nấm."],
            "weather_dependency": {},
            "water_amount": None,
            "fertilizer_amount": None,
            "sunlight_requirement": "Kiểm tra buổi sáng để dễ nhìn mặt dưới lá",
            "reminder_offsets_minutes": [20],
        },
        {
            "phase_key": "harvest",
            "title": "Theo dõi cửa sổ thu hoạch",
            "short_label": "Theo dõi thu hoạch",
            "description": "Từ ngày 60 trở đi, kiểm tra quả mỗi 2 ngày. Thu hoạch khi quả lên màu đều, vỏ căng và kích cỡ ổn định.",
            "why_this_step_matters": "Thu đúng lúc giúp chất lượng quả tốt hơn và duy trì đợt quả tiếp theo.",
            "prerequisites": ["Cây đã ra hoa, đậu quả và nuôi quả."],
            "tools_needed": ["Kéo cắt quả", "Rổ đựng nhẹ", "Khay đựng quả"],
            "estimated_duration_minutes": 20,
            "start_offset_days": 60,
            "start_time": [6, 30],
            "duration_minutes": 20,
            "repeat_rule": {"freq": "every_n_days", "interval_days": 2, "until_offset_days": 90, "times_of_day": ["06:30"]},
            "completion_condition": "Đã kiểm tra và thu các quả đạt độ chín mong muốn.",
            "risk_notes": ["Không nên để quả quá chín trên cây nếu mưa ẩm kéo dài."],
            "weather_dependency": {"avoid_if": ["storm"]},
            "water_amount": None,
            "fertilizer_amount": None,
            "sunlight_requirement": "Thu vào sáng sớm để quả mát và dễ bảo quản",
            "reminder_offsets_minutes": [30],
        },
    ]


def compile_occurrences(template: dict, plan_start: date, tz_name: str) -> tuple[datetime, datetime, list[str]]:
    start_date = plan_start + timedelta(days=template["start_offset_days"])
    start_at = _localize(start_date, template["start_time"][0], template["start_time"][1], tz_name)
    end_at = start_at + timedelta(minutes=template["duration_minutes"])
    reminders: list[str] = []
    offsets = template.get("reminder_offsets_minutes", [])
    repeat_rule = template.get("repeat_rule")

    if not repeat_rule:
        for offset in offsets:
            reminders.append((start_at - timedelta(minutes=offset)).isoformat())
        return start_at, end_at, reminders

    occurrences: list[datetime] = []
    times_of_day = repeat_rule.get("times_of_day", [start_at.strftime("%H:%M")])
    count = repeat_rule.get("count")
    until_offset_days = repeat_rule.get("until_offset_days")
    interval_days = repeat_rule.get("interval_days", 1)

    if repeat_rule["freq"] == "daily":
        total_days = count or (until_offset_days - template["start_offset_days"] + 1 if until_offset_days is not None else 1)
        for day_index in range(total_days):
            current_day = start_date + timedelta(days=day_index)
            for hhmm in times_of_day:
                hh, mm = [int(part) for part in hhmm.split(":")]
                occurrences.append(_localize(current_day, hh, mm, tz_name))
    elif repeat_rule["freq"] == "every_n_days":
        end_day = plan_start + timedelta(days=until_offset_days or template["start_offset_days"])
        current_day = start_date
        while current_day <= end_day:
            for hhmm in times_of_day:
                hh, mm = [int(part) for part in hhmm.split(":")]
                occurrences.append(_localize(current_day, hh, mm, tz_name))
            current_day += timedelta(days=interval_days)

    for occurrence in occurrences[:120]:
        for offset in offsets or [30]:
            reminders.append((occurrence - timedelta(minutes=offset)).isoformat())
    return start_at, end_at, reminders


def generate_plan_payload(context: PlanContext) -> dict:
    weather_start = context.start_date - timedelta(days=30)
    weather_end = context.start_date + timedelta(days=90)
    weather = fetch_nasa_power(context.location.lat, context.location.lon, weather_start, weather_end)
    suitability = evaluate_suitability(context.crop, weather["derived_metrics"], context.planting_mode, context.experience_level)
    recommended_start = context.start_date + timedelta(days=suitability["recommended_start_shift_days"])
    steps = []
    for index, template in enumerate(build_step_templates(context, weather["derived_metrics"]), start=1):
        start_at, end_at, reminder_times = compile_occurrences(template, recommended_start, context.timezone_name)
        steps.append(
            {
                "phase_key": template["phase_key"],
                "phase_label": PHASE_LABELS.get(template["phase_key"], template["phase_key"]),
                "step_number": index,
                "title": template["title"],
                "short_label": template["short_label"],
                "description": template["description"],
                "why_this_step_matters": template["why_this_step_matters"],
                "prerequisites": template["prerequisites"],
                "tools_needed": template["tools_needed"],
                "estimated_duration_minutes": template["estimated_duration_minutes"],
                "suggested_start_time": start_at.isoformat(),
                "suggested_end_time": end_at.isoformat(),
                "repeat_rule": template["repeat_rule"],
                "reminder_times": reminder_times,
                "completion_condition": template["completion_condition"],
                "risk_notes": template["risk_notes"],
                "weather_dependency": template["weather_dependency"],
                "water_amount": template["water_amount"],
                "fertilizer_amount": template["fertilizer_amount"],
                "sunlight_requirement": template["sunlight_requirement"],
                "status": CropPlanStep.Status.CURRENT if index == 1 else CropPlanStep.Status.PENDING,
                "sort_key": f"{index:03d}",
            }
        )

    return {
        "weather": weather,
        "suitability": suitability,
        "recommended_start_date": recommended_start,
        "summary": (
            f"Kế hoạch {context.crop.name.lower()} cho {context.plant_count} cây tại {context.location.name}. "
            f"Hệ thống đề xuất bắt đầu vào {recommended_start.strftime('%d/%m/%Y')} và ưu tiên theo dõi mưa, độ ẩm."
        ),
        "steps": steps,
    }


def _map_reminder_type(step_title: str) -> str:
    title = step_title.lower()
    if "tưới" in title or "tuoi" in title:
        return "watering"
    if "phân" in title or "phan" in title:
        return "fertilizing"
    if "thu hoạch" in title or "thu hoach" in title:
        return "harvest_window"
    if "sâu bệnh" in title or "sau benh" in title:
        return "pest_monitoring"
    return "step_due"


def build_context_from_request(crop: Crop, location: CropLocation, validated_data: dict) -> PlanContext:
    return PlanContext(
        crop=crop,
        location=location,
        planting_mode=validated_data.get("planting_mode", "pot"),
        area_value=_decimal_or_none(validated_data.get("area_value")),
        area_unit=validated_data.get("area_unit", "m2"),
        plant_count=int(validated_data.get("plant_count") or 1),
        start_date=validated_data["start_date"],
        experience_level=validated_data.get("experience_level", "beginner"),
        plan_goal=validated_data.get("plan_goal", "home"),
        timezone_name=validated_data.get("timezone") or location.timezone or "Asia/Ho_Chi_Minh",
    )


def create_plan_from_payload(user, context: PlanContext) -> CropPlan:
    payload = generate_plan_payload(context)
    with transaction.atomic():
        weather_snapshot = WeatherSnapshot.objects.create(
            location=context.location,
            source=payload["weather"]["source"],
            time_range_start=context.start_date - timedelta(days=30),
            time_range_end=context.start_date + timedelta(days=90),
            raw_payload=payload["weather"]["raw_payload"],
            daily_series=payload["weather"]["daily_series"],
            derived_metrics=payload["weather"]["derived_metrics"],
        )
        plan = CropPlan.objects.create(
            user=user,
            crop=context.crop,
            location=context.location,
            weather_snapshot=weather_snapshot,
            title=f"Kế hoạch trồng {context.crop.name} - {context.location.name}",
            planting_mode=context.planting_mode,
            area_value=context.area_value,
            area_unit=context.area_unit,
            plant_count=context.plant_count,
            planned_start_date=context.start_date,
            recommended_start_date=payload["recommended_start_date"],
            status=CropPlan.Status.ACTIVE,
            suitability_score=payload["suitability"]["score"],
            suitability_level=payload["suitability"]["level"],
            summary=payload["summary"],
            ai_reasoning_summary=payload["suitability"]["reasoning_summary"],
            plan_goal=context.plan_goal,
            experience_level=context.experience_level,
            metadata={
                "warnings": payload["suitability"]["warnings"],
                "climate_metrics": payload["weather"]["derived_metrics"],
                "timezone": context.timezone_name,
            },
        )

        reminder_instances: list[Reminder] = []
        for step_payload in payload["steps"]:
            water_amount = step_payload.get("water_amount") or {}
            fertilizer_amount = step_payload.get("fertilizer_amount") or {}
            step = CropPlanStep.objects.create(
                crop_plan=plan,
                phase_key=step_payload["phase_key"],
                step_number=step_payload["step_number"],
                title=step_payload["title"],
                short_label=step_payload["short_label"],
                description=step_payload["description"],
                why_this_step_matters=step_payload["why_this_step_matters"],
                prerequisites=step_payload["prerequisites"],
                tools_needed=step_payload["tools_needed"],
                estimated_duration_minutes=step_payload["estimated_duration_minutes"],
                suggested_start_time=datetime.fromisoformat(step_payload["suggested_start_time"]),
                suggested_end_time=datetime.fromisoformat(step_payload["suggested_end_time"]),
                repeat_rule=step_payload["repeat_rule"],
                reminder_times=step_payload["reminder_times"],
                completion_condition=step_payload["completion_condition"],
                risk_notes=step_payload["risk_notes"],
                weather_dependency=step_payload["weather_dependency"],
                water_amount_value=water_amount.get("value"),
                water_amount_unit=water_amount.get("unit", ""),
                fertilizer_amount_value=fertilizer_amount.get("value"),
                fertilizer_amount_unit=fertilizer_amount.get("unit", ""),
                sunlight_requirement_text=step_payload["sunlight_requirement"],
                status=step_payload["status"],
                sort_key=step_payload["sort_key"],
            )

            for reminder_time in step_payload["reminder_times"][:120]:
                trigger = datetime.fromisoformat(reminder_time)
                reminder_instances.append(
                    Reminder(
                        user=user,
                        crop_plan=plan,
                        step=step,
                        title=f"Nhắc việc: {step.title}",
                        body=f"Đến lúc thực hiện bước '{step.title.lower()}' cho kế hoạch {plan.crop.name.lower()}.",
                        deep_link=f"/dashboard/crop-plans/{plan.id}?step={step.id}",
                        trigger_time=trigger,
                        fallback_trigger_time=trigger + timedelta(hours=3),
                        priority="high" if step.phase_key in {"sowing", "harvest"} else "medium",
                        type=_map_reminder_type(step.title),
                        channel=Reminder.Channel.IN_APP,
                        payload={"phase_key": step.phase_key, "step_number": step.step_number},
                    )
                )

        Reminder.objects.bulk_create(reminder_instances)
    return plan


def refresh_plan_weather(plan: CropPlan) -> dict:
    weather = fetch_nasa_power(
        plan.location.lat,
        plan.location.lon,
        plan.recommended_start_date or plan.planned_start_date,
        (plan.recommended_start_date or plan.planned_start_date) + timedelta(days=14),
    )
    derived = weather["derived_metrics"]
    warnings: list[str] = []
    status = plan.status

    if derived.get("rain_sum_14d", 0) > 90:
        warnings.append("Dự báo mưa nhiều, cần giảm tưới và kiểm tra thoát nước.")
        status = CropPlan.Status.NEEDS_REVIEW
    if derived.get("humidity_avg_14d", 0) > 82:
        warnings.append("Độ ẩm cao, cần tăng tần suất kiểm tra nấm bệnh.")
        status = CropPlan.Status.NEEDS_REVIEW

    plan.status = status
    plan.metadata = {
        **plan.metadata,
        "weather_refresh": {
            "derived_metrics": derived,
            "warnings": warnings,
            "refreshed_at": timezone.now().isoformat(),
        },
    }
    plan.save(update_fields=["status", "metadata", "updated_at"])
    return {"warnings": warnings, "derived_metrics": derived, "status": status}


def mark_step_complete(step: CropPlanStep, note: str = "") -> CropPlanStep:
    step.status = CropPlanStep.Status.COMPLETED
    step.completed_at = timezone.now()
    if note:
        step.user_notes = note
    step.save(update_fields=["status", "completed_at", "user_notes", "updated_at"])
    step.reminders.filter(status=Reminder.Status.SCHEDULED).update(status=Reminder.Status.CANCELLED, completed_or_not=True)
    CompletionLog.objects.create(user=step.crop_plan.user, crop_plan=step.crop_plan, step=step, action="completed", note=note)

    next_step = (
        step.crop_plan.steps.filter(step_number__gt=step.step_number)
        .exclude(status=CropPlanStep.Status.COMPLETED)
        .order_by("step_number")
        .first()
    )
    if next_step and next_step.status == CropPlanStep.Status.PENDING:
        next_step.status = CropPlanStep.Status.CURRENT
        next_step.save(update_fields=["status", "updated_at"])

    if not step.crop_plan.steps.exclude(status=CropPlanStep.Status.COMPLETED).exists():
        step.crop_plan.status = CropPlan.Status.COMPLETED
        step.crop_plan.save(update_fields=["status", "updated_at"])
    return step


def delay_step(step: CropPlanStep, delay_days: int, reason: str = "") -> CropPlanStep:
    delta = timedelta(days=delay_days)
    step.suggested_start_time += delta
    step.suggested_end_time += delta
    step.status = CropPlanStep.Status.DELAYED
    step.delay_reason = reason or f"Dời lịch {delay_days} ngày"
    step.reminder_times = [(datetime.fromisoformat(item) + delta).isoformat() for item in step.reminder_times]
    step.save(update_fields=["suggested_start_time", "suggested_end_time", "status", "delay_reason", "reminder_times", "updated_at"])

    for reminder in step.reminders.filter(status=Reminder.Status.SCHEDULED):
        reminder.trigger_time += delta
        if reminder.fallback_trigger_time:
            reminder.fallback_trigger_time += delta
        reminder.save(update_fields=["trigger_time", "fallback_trigger_time", "updated_at"])

    CompletionLog.objects.create(
        user=step.crop_plan.user,
        crop_plan=step.crop_plan,
        step=step,
        action="delayed",
        note=reason or f"Dời lịch {delay_days} ngày",
    )
    return step
