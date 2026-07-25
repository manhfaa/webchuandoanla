from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Any
from zoneinfo import ZoneInfo

from django.db import transaction
from django.utils import timezone

from crop_plans.models import CompletionLog, Crop, CropLocation, CropPlan, CropPlanStep, Reminder, WeatherSnapshot

from .nasa_power import SOURCE_OBSERVED, SOURCE_UNAVAILABLE, fetch_nasa_power


def _crop_name_en(crop: Crop) -> str:
    """English crop name for the *_en strings, falling back to the Vietnamese one."""
    return (getattr(crop, "name_en", "") or "").strip() or crop.name


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

PHASE_LABELS_EN = {
    "preparation": "Preparation",
    "sowing": "Sowing",
    "early_care": "Early care",
    "maintenance": "Routine care",
    "monitoring": "Monitoring",
    "harvest": "Harvest",
}

# How much of the suitability assessment rests on real observations.
CONFIDENCE_OBSERVED = "observed"
CONFIDENCE_CLIMATOLOGY = "climatology"
CONFIDENCE_UNAVAILABLE = "unavailable"


def _localize(day: date, hh: int, mm: int, tz_name: str) -> datetime:
    zone = ZoneInfo(tz_name or "Asia/Ho_Chi_Minh")
    return datetime.combine(day, time(hour=hh, minute=mm), tzinfo=zone)


def _decimal_or_none(value: Any) -> Decimal | None:
    if value in (None, "", 0):
        return None
    return Decimal(str(value))


def climate_confidence(weather: dict) -> str:
    """How far the derived metrics can be trusted, given where they came from."""
    if not weather.get("derived_metrics") or weather.get("source") == SOURCE_UNAVAILABLE:
        return CONFIDENCE_UNAVAILABLE
    if weather.get("source") == SOURCE_OBSERVED:
        return CONFIDENCE_OBSERVED
    return CONFIDENCE_CLIMATOLOGY


def evaluate_suitability(
    crop: Crop,
    metrics: dict,
    planting_mode: str,
    experience_level: str,
    confidence: str = CONFIDENCE_OBSERVED,
) -> dict:
    climate = crop.climate_profile or {}
    optimal_temp = climate.get("optimal_temp_c", [22, 30])
    humidity_range = climate.get("optimal_humidity_pct", [55, 80])
    sunlight_hours = climate.get("sunlight_hours_min", 6)
    rain_high = climate.get("rain_14d_high_mm", 80)

    warnings: list[str] = []
    warnings_en: list[str] = []
    avg_temp = metrics.get("avg_temp_14d")
    rain_14d = metrics.get("rain_sum_14d")
    humidity = metrics.get("humidity_avg_14d")
    sun_hours = metrics.get("sun_hours_proxy")

    pot_warning = "Trồng chậu cần kiểm tra lỗ thoát nước và độ ẩm đất thường xuyên hơn trồng đất."
    pot_warning_en = (
        "Pot growing needs more frequent checks of the drainage holes and soil moisture than in-ground growing."
    )

    # Without any real numbers a score would be pure invention, so say so instead.
    if confidence == CONFIDENCE_UNAVAILABLE or all(
        value is None for value in (avg_temp, rain_14d, humidity, sun_hours)
    ):
        warnings.append("Chưa lấy được dữ liệu khí hậu cho khoảng thời gian này nên chưa chấm được mức phù hợp.")
        warnings_en.append(
            "No climate data could be retrieved for this window, so the suitability score cannot be calculated yet."
        )
        if planting_mode == "pot":
            warnings.append(pot_warning)
            warnings_en.append(pot_warning_en)
        return {
            "score": None,
            "level": CropPlan.SuitabilityLevel.BORDERLINE,
            "confidence": CONFIDENCE_UNAVAILABLE,
            "warnings": warnings[:4],
            "warnings_en": warnings_en[:4],
            "recommended_start_shift_days": 0,
            "reasoning_summary": (
                "Hệ thống chưa lấy được số liệu nhiệt độ, độ ẩm và lượng mưa cho khu vực này, "
                "vì vậy lịch chăm cây vẫn được tạo nhưng chưa kèm đánh giá mức phù hợp."
            ),
            "reasoning_summary_en": (
                "Temperature, humidity and rainfall figures could not be retrieved for this area, so the care "
                "schedule is still created but comes without a suitability assessment."
            ),
        }

    score = 100
    if confidence == CONFIDENCE_CLIMATOLOGY:
        warnings.append(
            "Khoảng thời gian này chưa có số liệu thực đo, đánh giá dựa trên trung bình khí hậu nhiều năm "
            "của cùng thời điểm trong năm."
        )
        warnings_en.append(
            "This window has no measured data yet; the assessment uses the multi-year climate average for the "
            "same time of year."
        )

    if avg_temp is not None:
        if avg_temp < optimal_temp[0]:
            score -= 18
            warnings.append("Nhiệt độ hiện tại hơi thấp, nên lùi lịch gieo để cây dễ nảy mầm hơn.")
            warnings_en.append("Temperatures are a little low right now; push the sowing date back so the seeds germinate more easily.")
        elif avg_temp > optimal_temp[1] + 3:
            score -= 12
            warnings.append("Nhiệt độ cao, cần che nắng giai đoạn đầu và theo dõi mặt nước.")
            warnings_en.append("Temperatures are high; shade the crop in the early stage and keep an eye on the water level.")

    if humidity is not None and humidity > humidity_range[1]:
        score -= 12
        warnings.append("Độ ẩm cao, cần thông thoáng và tăng kiểm tra nấm bệnh.")
        warnings_en.append("Humidity is high; improve air flow and check more often for fungal disease.")

    if rain_14d is not None and rain_14d > rain_high:
        score -= 15
        warnings.append("Mưa nhiều trong 2 tuần tới, nên giảm tưới và ưu tiên đất thoát nước.")
        warnings_en.append("Heavy rain is expected over the next two weeks; water less and favour free-draining soil.")

    if sun_hours is not None and sun_hours < sunlight_hours:
        score -= 10
        warnings.append("Lượng nắng dự kiến chưa cao, nên ưu tiên vị trí nhận nắng buổi sáng.")
        warnings_en.append("Expected sunshine is on the low side; choose a spot that catches the morning sun.")

    if planting_mode == "pot":
        warnings.append(pot_warning)
        warnings_en.append(pot_warning_en)
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
    if rain_14d is not None and rain_14d > rain_high:
        start_shift_days = max(start_shift_days, 2)
    if avg_temp is not None and avg_temp < optimal_temp[0]:
        start_shift_days = max(start_shift_days, 4)

    measured: list[str] = []
    measured_en: list[str] = []
    if avg_temp is not None:
        measured.append(f"nhiệt độ trung bình {avg_temp}°C")
        measured_en.append(f"an average temperature of {avg_temp}°C")
    if humidity is not None:
        measured.append(f"độ ẩm {humidity}%")
        measured_en.append(f"{humidity}% humidity")
    if rain_14d is not None:
        measured.append(f"tổng mưa 14 ngày {rain_14d} mm")
        measured_en.append(f"{rain_14d} mm of rain over 14 days")
    basis = (
        "trung bình khí hậu nhiều năm"
        if confidence == CONFIDENCE_CLIMATOLOGY
        else "số liệu khí hậu thực đo"
    )
    basis_en = (
        "the multi-year climate average"
        if confidence == CONFIDENCE_CLIMATOLOGY
        else "measured climate data"
    )

    return {
        "score": score,
        "level": level,
        "confidence": confidence,
        "warnings": warnings[:4],
        "warnings_en": warnings_en[:4],
        "recommended_start_shift_days": start_shift_days,
        "reasoning_summary": (
            f"Theo {basis}, khu vực này có {', '.join(measured)}. Hệ thống đánh giá mức phù hợp ở mức "
            f"{'tốt' if level == CropPlan.SuitabilityLevel.SUITABLE else 'cần cân nhắc'}."
        ),
        "reasoning_summary_en": (
            f"Based on {basis_en}, this area has {', '.join(measured_en)}. "
            f"The system rates the growing conditions as "
            f"{'good' if level == CropPlan.SuitabilityLevel.SUITABLE else 'worth reconsidering'}."
        ),
    }


def _water_amount(planting_mode: str, plant_count: int, profile: CropPlanProfile) -> tuple[Decimal, str, str]:
    if planting_mode == "pot":
        return Decimal(str(profile.water_ml_per_pot)), "ml/chậu/lần", "ml per pot per watering"
    litres = profile.water_litres_per_plant_large if plant_count >= 20 else profile.water_litres_per_plant
    return Decimal(str(litres)), "lít/cây/lần", "litres per plant per watering"


def _fmt(value: float) -> str:
    number = float(value)
    return str(int(number)) if number.is_integer() else str(round(number, 2))


def _pair_text(pair: list[float], unit: str) -> str:
    return f"{_fmt(pair[0])}-{_fmt(pair[1])} {unit}"


def _num_pair(source: dict, key: str, fallback: list[float]) -> list[float]:
    value = source.get(key)
    if isinstance(value, (list, tuple)) and len(value) >= 2:
        try:
            low, high = float(value[0]), float(value[1])
        except (TypeError, ValueError):
            return [float(item) for item in fallback]
        return sorted([low, high])
    return [float(item) for item in fallback]


def _positive_int(source: dict, key: str, fallback: int) -> int:
    try:
        value = int(source[key])
    except (KeyError, TypeError, ValueError):
        return fallback
    return value if value > 0 else fallback


def _number(source: dict, key: str, fallback: float) -> float:
    try:
        return float(source[key])
    except (KeyError, TypeError, ValueError):
        return fallback


def _text(source: dict, key: str, fallback: str) -> str:
    value = source.get(key)
    return value.strip() if isinstance(value, str) and value.strip() else fallback


@dataclass
class CropPlanProfile:
    """Everything the schedule builder needs, read off the Crop row.

    Adding a crop is therefore a data change (growth_profile / care_rules) and
    not a code change; every field has a fallback so a half-filled crop still
    produces a coherent plan.
    """

    crop_name: str
    crop_name_en: str
    germination: list[float]
    seedling: list[float]
    vegetative: list[float]
    flowering: list[float]
    harvest: list[float]
    propagation: str
    needs_support: bool
    spacing_cm: list[float]
    pot_litres: list[float]
    seed_soak_hours: list[float]
    sowing_depth_cm: list[float]
    watering_times: list[str]
    water_ml_per_pot: float
    water_litres_per_plant: float
    water_litres_per_plant_large: float
    watering_reason: str
    watering_reason_en: str
    fertilizing_start_day: int
    fertilizing_end_day: int
    fertilizing_interval_days: int
    fertilizer_grams_pot: float
    fertilizer_grams_ground: float
    scouting_interval_days: int
    harvest_check_interval_days: int
    sunlight_text: str
    sunlight_text_en: str
    harvest_signs: str
    harvest_signs_en: str
    support_note: str = ""
    support_note_en: str = ""
    support_height_cm: list[float] = field(default_factory=lambda: [25.0, 35.0])


def build_crop_profile(crop: Crop) -> CropPlanProfile:
    growth = crop.growth_profile or {}
    care = crop.care_rules or {}

    germination = _num_pair(growth, "germination_days", [5, 10])
    seedling = _num_pair(growth, "seedling_days", [1, 20])
    vegetative = _num_pair(growth, "vegetative_days", [20, 40])
    flowering = _num_pair(growth, "flowering_days", [35, 60])
    harvest = _num_pair(growth, "harvest_days", [60, 90])

    name = crop.name
    name_en = _crop_name_en(crop)
    watering_times = care.get("watering_times_of_day")
    if not isinstance(watering_times, list) or not watering_times:
        watering_times = ["06:00", "17:00"]

    return CropPlanProfile(
        crop_name=name,
        crop_name_en=name_en,
        germination=germination,
        seedling=seedling,
        vegetative=vegetative,
        flowering=flowering,
        harvest=harvest,
        propagation="seedling" if growth.get("propagation") == "seedling" else "seed",
        needs_support=bool(growth.get("needs_support")),
        spacing_cm=_num_pair(growth, "spacing_cm", [50, 60]),
        pot_litres=_num_pair(growth, "pot_litres", [20, 30]),
        seed_soak_hours=_num_pair(growth, "seed_soak_hours", [2, 4]),
        sowing_depth_cm=_num_pair(growth, "sowing_depth_cm", [0.5, 1]),
        watering_times=[str(item) for item in watering_times],
        water_ml_per_pot=_number(care, "water_ml_per_pot", 600),
        water_litres_per_plant=_number(care, "water_litres_per_plant", 1.2),
        water_litres_per_plant_large=_number(care, "water_litres_per_plant_large", 1.5),
        watering_reason=_text(
            care,
            "watering_reason",
            f"{name} cần độ ẩm ổn định để phát triển thân lá và nuôi quả.",
        ),
        watering_reason_en=_text(
            care,
            "watering_reason_en",
            f"{name_en} needs steady soil moisture to develop healthy foliage and to fill out its fruit.",
        ),
        fertilizing_start_day=_positive_int(care, "fertilizing_start_day", int(vegetative[0])),
        fertilizing_end_day=_positive_int(care, "fertilizing_end_day", max(int(vegetative[1]) - 5, int(vegetative[0]) + 5)),
        fertilizing_interval_days=_positive_int(care, "fertilizing_interval_days", 5),
        fertilizer_grams_pot=_number(care, "fertilizer_grams_pot", 15),
        fertilizer_grams_ground=_number(care, "fertilizer_grams_ground", 25),
        scouting_interval_days=_positive_int(care, "scouting_interval_days", 2),
        harvest_check_interval_days=_positive_int(care, "harvest_check_interval_days", 2),
        sunlight_text=_text(care, "sunlight", "6-8 giờ nắng/ngày"),
        sunlight_text_en=_text(care, "sunlight_en", "6-8 hours of sun a day"),
        harvest_signs=_text(care, "harvest_signs", "quả lên màu đều, vỏ căng và kích cỡ ổn định"),
        harvest_signs_en=_text(
            care, "harvest_signs_en", "the colour is even, the skin is taut and the size has stopped changing"
        ),
        support_note=_text(care, "support_note", "Cắm cọc giúp cây đứng thẳng, thông thoáng và dễ chăm sóc."),
        support_note_en=_text(
            care, "support_note_en", "Staking keeps the plant upright and airy and makes it easier to look after."
        ),
        support_height_cm=_num_pair(growth, "support_height_cm", [25, 35]),
    )


def _seed_start_steps(context: PlanContext, profile: CropPlanProfile) -> list[dict]:
    soak = _pair_text(profile.seed_soak_hours, "giờ")
    soak_en = _pair_text(profile.seed_soak_hours, "hours")
    depth = _pair_text(profile.sowing_depth_cm, "cm")
    germination_check_day = int(profile.germination[0])
    germination_span = max(2, min(5, int(profile.germination[1] - profile.germination[0]) + 1))

    return [
        {
            "phase_key": "sowing",
            "title": "Xử lý hạt giống trước khi gieo",
            "title_en": "Treat the seeds before sowing",
            "short_label": "Xử lý hạt",
            "short_label_en": "Seed treatment",
            "description": f"Ngâm hạt trong nước ấm {soak}, sau đó để ráo. Loại bỏ hạt nổi trên mặt nước nếu có.",
            "description_en": (
                f"Soak the seeds in warm water for {soak_en}, then drain them. "
                "Discard any seeds that float to the surface."
            ),
            "why_this_step_matters": "Hạt hút đủ ẩm đều hơn và tăng tỷ lệ nảy mầm.",
            "why_this_step_matters_en": "The seeds take up moisture more evenly, which raises the germination rate.",
            "prerequisites": ["Đã chuẩn bị giá thể."],
            "prerequisites_en": ["The growing medium is ready."],
            "tools_needed": ["Hạt giống", "Ly nước ấm", "Khay hoặc khăn sạch"],
            "tools_needed_en": ["Seeds", "A cup of warm water", "A clean tray or cloth"],
            "estimated_duration_minutes": 25,
            "start_offset_days": 0,
            "start_time": [6, 30],
            "duration_minutes": 25,
            "repeat_rule": None,
            "completion_condition": "Hạt nở đều, không ngâm quá lâu đến mức mềm vỏ.",
            "completion_condition_en": "The seeds have swelled evenly and were not soaked long enough for the coats to go soft.",
            "risk_notes": ["Ngâm quá lâu có thể làm hạt bị úng, khó nảy mầm."],
            "risk_notes_en": ["Soaking too long can waterlog the seeds and make germination difficult."],
            "weather_dependency": {},
            "water_amount": None,
            "fertilizer_amount": None,
            "sunlight_requirement": "Chưa cần phơi nắng",
            "sunlight_requirement_en": "No sun exposure needed yet",
            "reminder_offsets_minutes": [20],
        },
        {
            "phase_key": "sowing",
            "title": "Gieo hạt và phủ lớp đất mỏng",
            "title_en": "Sow the seeds and cover with a thin layer of soil",
            "short_label": "Gieo hạt",
            "short_label_en": "Sowing",
            "description": f"Mỗi lỗ gieo 1-2 hạt, đặt sâu {depth}, phủ đất mỏng và tưới phun sương nhẹ.",
            "description_en": (
                f"Sow 1-2 seeds per hole at a depth of {_pair_text(profile.sowing_depth_cm, 'cm')}, "
                "cover with a thin layer of soil and mist lightly."
            ),
            "why_this_step_matters": "Độ sâu gieo và độ ẩm phù hợp giúp hạt nảy mầm nhanh và đồng đều.",
            "why_this_step_matters_en": "The right sowing depth and moisture level make the seeds germinate quickly and evenly.",
            "prerequisites": ["Đã xử lý hạt hoặc chuẩn bị hạt giống."],
            "prerequisites_en": ["The seeds have been treated or otherwise prepared."],
            "tools_needed": ["Khay gieo hoặc chậu", "Bình phun sương", "Nhãn ghi ngày gieo"],
            "tools_needed_en": ["Seed tray or pot", "Mist sprayer", "Label with the sowing date"],
            "estimated_duration_minutes": 35,
            "start_offset_days": 0,
            "start_time": [7, 15],
            "duration_minutes": 35,
            "repeat_rule": None,
            "completion_condition": "Mặt đất ẩm đều, hạt được phủ đất mỏng và ghi ngày gieo.",
            "completion_condition_en": "The soil surface is evenly moist, the seeds are covered with a thin layer of soil and the sowing date is recorded.",
            "risk_notes": ["Không nên ấn hạt quá sâu vì sẽ khó đội mầm."],
            "risk_notes_en": ["Do not press the seeds in too deep or the sprouts will struggle to break through."],
            "weather_dependency": {"avoid_if": ["storm"]},
            "water_amount": {"value": 150, "unit": "ml/khay gieo", "unit_en": "ml per seed tray"},
            "fertilizer_amount": None,
            "sunlight_requirement": "Ánh sáng tán xạ, tránh nắng gắt ngay lập tức",
            "sunlight_requirement_en": "Diffused light; avoid harsh direct sun straight away",
            "reminder_offsets_minutes": [20],
        },
        {
            "phase_key": "early_care",
            "title": "Kiểm tra nảy mầm và bổ sung cây dự phòng",
            "title_en": "Check germination and fill in replacement seedlings",
            "short_label": "Kiểm tra nảy mầm",
            "short_label_en": "Germination check",
            "description": (
                f"Sau gieo {_pair_text(profile.germination, 'ngày')}, kiểm tra các lỗ gieo đã đội mầm chưa. "
                "Nếu lỗ nào không lên, có thể gieo bù ngay."
            ),
            "description_en": (
                f"{_pair_text(profile.germination, 'days')} after sowing, check whether each hole has sprouted. "
                "Re-sow straight away any hole that did not come up."
            ),
            "why_this_step_matters": "Phát hiện sớm lỗ gieo hỏng để bổ sung kịp, giữ mật độ cây đều.",
            "why_this_step_matters_en": "Spotting failed holes early lets you fill them in on time and keeps plant density even.",
            "prerequisites": ["Đã hoàn thành gieo hạt."],
            "prerequisites_en": ["Sowing is complete."],
            "tools_needed": ["Sổ ghi chú", "Bình phun sương"],
            "tools_needed_en": ["Notebook", "Mist sprayer"],
            "estimated_duration_minutes": 15,
            "start_offset_days": germination_check_day,
            "start_time": [7, 0],
            "duration_minutes": 15,
            "repeat_rule": {"freq": "daily", "count": germination_span, "times_of_day": ["07:00"]},
            "completion_condition": "Đã ghi nhận tỷ lệ nảy mầm và quyết định có bổ sung hay không.",
            "completion_condition_en": "The germination rate is recorded and you have decided whether to re-sow.",
            "risk_notes": ["Độ ẩm quá cao dễ phát sinh nấm ở giai đoạn nảy mầm."],
            "risk_notes_en": ["Too much moisture during germination encourages fungal growth."],
            "weather_dependency": {},
            "water_amount": {"value": 120, "unit": "ml/khay/lần", "unit_en": "ml per tray per watering"},
            "fertilizer_amount": None,
            "sunlight_requirement": "Tăng dần ánh sáng mỗi ngày",
            "sunlight_requirement_en": "Increase light exposure a little each day",
            "reminder_offsets_minutes": [30],
        },
    ]


def _seedling_start_steps(context: PlanContext, profile: CropPlanProfile) -> list[dict]:
    """Crops normally started from nursery plants or runners rather than seed."""
    spacing = _pair_text(profile.spacing_cm, "cm")
    spacing_en = _pair_text(profile.spacing_cm, "cm")

    return [
        {
            "phase_key": "sowing",
            "title": "Chọn và làm quen cây giống",
            "title_en": "Pick the nursery plants and let them settle",
            "short_label": "Chọn cây giống",
            "short_label_en": "Choosing plants",
            "description": (
                "Chọn cây giống có 3-4 lá thật, rễ trắng, không đốm lá. Để cây ở nơi mát 1 ngày trước khi trồng."
            ),
            "description_en": (
                "Choose nursery plants with 3-4 true leaves, white roots and no leaf spots. "
                "Keep them somewhere cool for a day before planting."
            ),
            "why_this_step_matters": "Cây giống khỏe quyết định phần lớn khả năng bén rễ và năng suất về sau.",
            "why_this_step_matters_en": "Healthy nursery plants decide most of how well the crop roots in and yields later.",
            "prerequisites": ["Đã chuẩn bị giá thể."],
            "prerequisites_en": ["The growing medium is ready."],
            "tools_needed": ["Cây giống", "Khay đựng cây", "Bình phun sương"],
            "tools_needed_en": ["Nursery plants", "Plant tray", "Mist sprayer"],
            "estimated_duration_minutes": 25,
            "start_offset_days": 0,
            "start_time": [6, 30],
            "duration_minutes": 25,
            "repeat_rule": None,
            "completion_condition": "Cây giống còn tươi, lá không héo và rễ chưa bị khô.",
            "completion_condition_en": "The plants are still fresh, the leaves have not wilted and the roots have not dried out.",
            "risk_notes": ["Cây giống có đốm lá hoặc rễ nâu nên loại bỏ ngay từ đầu."],
            "risk_notes_en": ["Discard any plant with leaf spots or browned roots right at the start."],
            "weather_dependency": {},
            "water_amount": None,
            "fertilizer_amount": None,
            "sunlight_requirement": "Để nơi mát, tránh nắng gắt",
            "sunlight_requirement_en": "Keep them somewhere cool, out of harsh sun",
            "reminder_offsets_minutes": [20],
        },
        {
            "phase_key": "sowing",
            "title": "Trồng cây giống vào giá thể",
            "title_en": "Plant the seedlings into the growing medium",
            "short_label": "Trồng cây giống",
            "short_label_en": "Transplanting",
            "description": (
                f"Trồng vào chiều mát, giữ khoảng cách {spacing}, đặt gốc ngang mặt đất và tưới đẫm ngay sau khi trồng."
            ),
            "description_en": (
                f"Plant in the cool of the afternoon, keep a spacing of {spacing_en}, set the crown level with the "
                "soil surface and water thoroughly straight afterwards."
            ),
            "why_this_step_matters": "Trồng đúng độ sâu và tưới ngay giúp cây bén rễ nhanh, ít bị sốc.",
            "why_this_step_matters_en": "Planting at the right depth and watering immediately helps the roots take hold quickly with less shock.",
            "prerequisites": ["Đã chọn được cây giống khỏe."],
            "prerequisites_en": ["Healthy nursery plants have been selected."],
            "tools_needed": ["Cây giống", "Xẻng tay", "Bình tưới", "Găng tay"],
            "tools_needed_en": ["Nursery plants", "Hand trowel", "Watering can", "Gloves"],
            "estimated_duration_minutes": 40,
            "start_offset_days": 0,
            "start_time": [16, 30],
            "duration_minutes": 40,
            "repeat_rule": None,
            "completion_condition": "Cây đứng vững, gốc không bị vùi quá sâu và đất quanh gốc đã đủ ẩm.",
            "completion_condition_en": "The plants stand firm, the crown is not buried too deep and the soil around it is moist enough.",
            "risk_notes": ["Vùi lấp phần gốc quá sâu dễ làm cây thối gốc."],
            "risk_notes_en": ["Burying the crown too deep easily leads to crown rot."],
            "weather_dependency": {"avoid_if": ["heavy_rain", "extreme_heat"]},
            "water_amount": {"value": 500, "unit": "ml/cây", "unit_en": "ml per plant"},
            "fertilizer_amount": None,
            "sunlight_requirement": "Trồng vào chiều mát để cây đỡ mất nước",
            "sunlight_requirement_en": "Plant in the cool of the afternoon so the plants lose less water",
            "reminder_offsets_minutes": [30],
        },
        {
            "phase_key": "early_care",
            "title": "Kiểm tra cây bén rễ",
            "title_en": "Check that the plants have rooted in",
            "short_label": "Kiểm tra bén rễ",
            "short_label_en": "Rooting check",
            "description": (
                "Sau trồng 3-5 ngày, kiểm tra lá non và độ vững của gốc. Cây héo kéo dài cần che nắng và trồng lại."
            ),
            "description_en": (
                "3-5 days after planting, check the young leaves and how firmly the plant sits. "
                "A plant that keeps wilting needs shade and replanting."
            ),
            "why_this_step_matters": "Phát hiện sớm cây không bén rễ để trồng dặm, giữ mật độ cây đều.",
            "why_this_step_matters_en": "Spotting plants that failed to root early lets you replace them and keeps plant density even.",
            "prerequisites": ["Đã trồng cây giống."],
            "prerequisites_en": ["The seedlings have been planted."],
            "tools_needed": ["Sổ ghi chú", "Bình tưới"],
            "tools_needed_en": ["Notebook", "Watering can"],
            "estimated_duration_minutes": 15,
            "start_offset_days": 3,
            "start_time": [7, 0],
            "duration_minutes": 15,
            "repeat_rule": {"freq": "daily", "count": 3, "times_of_day": ["07:00"]},
            "completion_condition": "Lá non bắt đầu vươn, gốc chắc khi lay nhẹ.",
            "completion_condition_en": "New leaves are pushing out and the base feels firm when nudged gently.",
            "risk_notes": ["Tưới quá nhiều khi cây chưa bén rễ dễ gây thối gốc."],
            "risk_notes_en": ["Overwatering before the plant has rooted easily causes crown rot."],
            "weather_dependency": {},
            "water_amount": {"value": 300, "unit": "ml/cây/lần", "unit_en": "ml per plant per watering"},
            "fertilizer_amount": None,
            "sunlight_requirement": "Che bớt nắng trưa trong vài ngày đầu",
            "sunlight_requirement_en": "Shade the plants from midday sun for the first few days",
            "reminder_offsets_minutes": [30],
        },
    ]


def build_step_templates(context: PlanContext, metrics: dict) -> list[dict]:
    profile = build_crop_profile(context.crop)
    rain_14d = metrics.get("rain_sum_14d")
    humid = metrics.get("humidity_avg_14d")
    water_value, water_unit, water_unit_en = _water_amount(context.planting_mode, context.plant_count, profile)
    planting_distance = (
        _pair_text(profile.spacing_cm, "cm giữa các cây") if context.planting_mode == "ground" else "mỗi chậu 1 cây"
    )
    planting_distance_en = (
        _pair_text(profile.spacing_cm, "cm between plants") if context.planting_mode == "ground" else "one plant per pot"
    )
    plan_scale_note = (
        "Tách thành checklist theo từng khu chậu để dễ kiểm soát tiến độ."
        if context.plant_count >= 15 or (context.area_value and context.area_value >= 20)
        else "Làm theo từng cây hoặc từng cụm nhỏ."
    )
    plan_scale_note_en = (
        "Split the work into a checklist per pot area so progress is easier to track."
        if context.plant_count >= 15 or (context.area_value and context.area_value >= 20)
        else "Work through it plant by plant or in small clusters."
    )

    rain_note = (
        f"nếu đất còn ẩm do mưa gần đây ({rain_14d} mm/14 ngày) thì giảm hoặc bỏ cữ tưới chiều"
        if rain_14d is not None
        else "nếu đất còn ẩm sau mưa thì giảm hoặc bỏ cữ tưới chiều"
    )
    rain_note_en = (
        f"if the soil is still damp from recent rain ({rain_14d} mm over 14 days), reduce or skip the afternoon watering"
        if rain_14d is not None
        else "if the soil is still damp after rain, reduce or skip the afternoon watering"
    )
    humid_note = (
        f"Độ ẩm đang ở {humid}%, cần ưu tiên tìm dấu hiệu nấm."
        if humid is not None
        else "Ưu tiên tìm dấu hiệu nấm, nhất là sau những ngày ẩm."
    )
    humid_note_en = (
        f"Humidity is currently {humid}%, so look for signs of fungus first."
        if humid is not None
        else "Look for signs of fungus first, especially after damp days."
    )

    watering_times = profile.watering_times
    watering_when = " và ".join(f"{item}" for item in watering_times)
    watering_end_day = max(int(profile.harvest[1]) - 15, int(profile.vegetative[1]))
    scouting_start_day = max(int(profile.seedling[1]) - 2, 5)
    scouting_end_day = max(int(profile.harvest[1]) - 10, scouting_start_day + profile.scouting_interval_days)
    hardening_day = max(int(profile.germination[1]) + 2, 3)

    templates: list[dict] = [
        {
            "phase_key": "preparation",
            "title": "Chuẩn bị giá thể và dụng cụ trồng",
            "title_en": "Prepare the growing medium and planting tools",
            "short_label": "Chuẩn bị đất",
            "short_label_en": "Soil prep",
            "description": (
                "Trộn đất sạch với phân hữu cơ hoai mục và vật liệu giúp thoát nước. "
                f"Nếu trồng đất, làm tơi mặt đất và giữ khoảng cách {planting_distance}. "
                f"Nếu trồng chậu, sử dụng chậu {_pair_text(profile.pot_litres, 'lít')} có ít nhất 4 lỗ thoát nước."
            ),
            "description_en": (
                "Mix clean soil with well-rotted organic compost and a material that improves drainage. "
                f"For in-ground planting, loosen the topsoil and keep a spacing of {planting_distance_en}. "
                f"For pot planting, use a {_pair_text(profile.pot_litres, 'litre')} pot with at least 4 drainage holes."
            ),
            "why_this_step_matters": "Nền trồng thông thoáng giúp rễ phát triển nhanh, giảm úng và hạn chế nấm.",
            "why_this_step_matters_en": "A well-aerated growing bed lets roots develop quickly, reduces waterlogging and limits fungal disease.",
            "prerequisites": ["Kiểm tra vị trí trồng có nhận đủ nắng buổi sáng."],
            "prerequisites_en": ["Check that the planting spot gets enough morning sun."],
            "tools_needed": ["Chậu hoặc luống trồng", "Đất sạch", "Phân hữu cơ", "Xẻng tay", "Găng tay"],
            "tools_needed_en": ["Pot or planting bed", "Clean soil", "Organic compost", "Hand trowel", "Gloves"],
            "estimated_duration_minutes": 60,
            "start_offset_days": -1,
            "start_time": [7, 0],
            "duration_minutes": 60,
            "repeat_rule": None,
            "completion_condition": "Đất tơi, không đọng nước sau khi tưới thử 1 ca nước nhẹ.",
            "completion_condition_en": "The soil is loose and no water pools after a light test watering.",
            "risk_notes": ["Nếu đất nén chặt, cây dễ bị vàng lá và chậm lớn."],
            "risk_notes_en": ["Compacted soil makes plants prone to yellowing leaves and slow growth."],
            "weather_dependency": {"avoid_if": ["heavy_rain"]},
            "water_amount": None,
            "fertilizer_amount": (
                {"value": 1.5, "unit": "kg phân hữu cơ/10 lít đất", "unit_en": "kg organic compost per 10 L of soil"}
                if context.planting_mode == "pot"
                else {"value": 2.0, "unit": "kg phân hữu cơ/m2", "unit_en": "kg organic compost per m2"}
            ),
            "sunlight_requirement": f"Vị trí có {profile.sunlight_text}",
            "sunlight_requirement_en": f"A spot with {profile.sunlight_text_en}",
            "reminder_offsets_minutes": [30],
        },
    ]

    if profile.propagation == "seedling":
        templates.extend(_seedling_start_steps(context, profile))
    else:
        templates.extend(_seed_start_steps(context, profile))

    templates.append(
        {
            "phase_key": "early_care",
            "title": "Tập cho cây con làm quen với nắng",
            "title_en": "Harden the seedlings off to full sun",
            "short_label": "Tập nắng",
            "short_label_en": "Hardening off",
            "description": "Khi cây có 2-3 lá thật, đưa cây ra nắng sáng 2-3 giờ/ngày, sau đó tăng dần lên 4-6 giờ.",
            "description_en": "Once the seedlings have 2-3 true leaves, give them 2-3 hours of morning sun a day, then build up to 4-6 hours.",
            "why_this_step_matters": "Cây con cần thích nghi từ từ để tránh sốc nhiệt và cháy lá.",
            "why_this_step_matters_en": "Seedlings need to adapt gradually to avoid heat shock and leaf scorch.",
            "prerequisites": ["Cây con đã lên đều."],
            "prerequisites_en": ["The seedlings have come up evenly."],
            "tools_needed": ["Khay hoặc chậu cây", "Lưới che nắng nếu cần"],
            "tools_needed_en": ["Seedling tray or pot", "Shade net if needed"],
            "estimated_duration_minutes": 20,
            "start_offset_days": hardening_day,
            "start_time": [7, 30],
            "duration_minutes": 20,
            "repeat_rule": {"freq": "daily", "count": 3, "times_of_day": ["07:30"]},
            "completion_condition": "Lá đứng, xanh và không héo sau khi đưa ra nắng sáng.",
            "completion_condition_en": "The leaves stay upright and green with no wilting after morning sun exposure.",
            "risk_notes": ["Nếu lá non bị quặp, giảm thời gian phơi nắng vào ngày hôm sau."],
            "risk_notes_en": ["If the young leaves curl, cut back the sun exposure the next day."],
            "weather_dependency": {"avoid_if": ["extreme_heat"]},
            "water_amount": None,
            "fertilizer_amount": None,
            "sunlight_requirement": "Tăng dần từ 2 giờ lên 6 giờ nắng sáng",
            "sunlight_requirement_en": "Build up from 2 to 6 hours of morning sun",
            "reminder_offsets_minutes": [25],
        }
    )

    templates.append(
        {
            "phase_key": "maintenance",
            "title": "Tưới nước định kỳ",
            "title_en": "Water on a regular schedule",
            "short_label": "Tưới nước",
            "short_label_en": "Watering",
            "description": (
                f"Tưới vào {watering_when}. Kiểm tra độ ẩm đất trước khi tưới; {rain_note}. {plan_scale_note}"
            ),
            "description_en": (
                f"Water at {' and '.join(watering_times)}. Check the soil moisture before watering; "
                f"{rain_note_en}. {plan_scale_note_en}"
            ),
            "why_this_step_matters": profile.watering_reason,
            "why_this_step_matters_en": profile.watering_reason_en,
            "prerequisites": ["Đã gieo trồng và cây bắt đầu phát triển."],
            "prerequisites_en": ["The crop is planted and the plants have started to grow."],
            "tools_needed": ["Bình tưới hoặc hệ thống tưới nhẹ", "Độ ẩm đất cầm tay"],
            "tools_needed_en": ["Watering can or a gentle irrigation system", "Handheld soil moisture meter"],
            "estimated_duration_minutes": 12 if context.plant_count <= 10 else 25,
            "start_offset_days": 1,
            "start_time": [int(watering_times[0].split(":")[0]), int(watering_times[0].split(":")[1])],
            "duration_minutes": 10,
            "repeat_rule": {"freq": "daily", "until_offset_days": watering_end_day, "times_of_day": watering_times},
            "completion_condition": "Đất ẩm đều ở lớp rễ, không đọng nước dưới chậu hay mặt luống.",
            "completion_condition_en": "The soil is evenly moist at root level, with no water pooling under the pot or on the bed surface.",
            "risk_notes": ["Nếu mưa nhiều thì bỏ cữ tưới chiều.", "Nếu đất đã ẩm, không nên tưới thêm."],
            "risk_notes_en": ["Skip the afternoon watering when there is heavy rain.", "Do not add more water if the soil is already moist."],
            "weather_dependency": {"skip_if": ["rain_today_mm > 8"]},
            "water_amount": {"value": float(water_value), "unit": water_unit, "unit_en": water_unit_en},
            "fertilizer_amount": None,
            "sunlight_requirement": f"Duy trì {profile.sunlight_text}",
            "sunlight_requirement_en": f"Keep up {profile.sunlight_text_en}",
            "reminder_offsets_minutes": [15],
        }
    )

    templates.append(
        {
            "phase_key": "maintenance",
            "title": "Bón phân nhẹ theo chu kỳ",
            "title_en": "Apply light fertilizer on a cycle",
            "short_label": "Bón phân",
            "short_label_en": "Fertilizing",
            "description": (
                f"Bắt đầu bón nhẹ từ ngày {profile.fertilizing_start_day} đến ngày {profile.fertilizing_end_day} "
                f"sau khi trồng, lặp lại mỗi {profile.fertilizing_interval_days} ngày. Bón cách gốc 5-7 cm."
            ),
            "description_en": (
                f"Start light feeding from day {profile.fertilizing_start_day} to day {profile.fertilizing_end_day} "
                f"after planting, repeating every {profile.fertilizing_interval_days} days. "
                "Apply 5-7 cm away from the base of the plant."
            ),
            "why_this_step_matters": "Bón đúng lúc giúp cây ra thân lá khỏe và sẵn sàng ra hoa.",
            "why_this_step_matters_en": "Feeding at the right time builds strong stems and leaves and gets the plant ready to flower.",
            "prerequisites": ["Cây đã ổn định sau giai đoạn cây con."],
            "prerequisites_en": ["The plants have settled in after the seedling stage."],
            "tools_needed": ["Phân hữu cơ hoặc NPK loãng", "Muỗng đo", "Găng tay"],
            "tools_needed_en": ["Organic compost or diluted NPK", "Measuring spoon", "Gloves"],
            "estimated_duration_minutes": 20,
            "start_offset_days": profile.fertilizing_start_day,
            "start_time": [6, 30],
            "duration_minutes": 20,
            "repeat_rule": {
                "freq": "every_n_days",
                "interval_days": profile.fertilizing_interval_days,
                "until_offset_days": profile.fertilizing_end_day,
                "times_of_day": ["06:30"],
            },
            "completion_condition": "Đã bón đúng liều, không để phân chạm trực tiếp vào thân cây.",
            "completion_condition_en": "The correct dose has been applied and no fertilizer is touching the stem directly.",
            "risk_notes": ["Không bón lúc đất đang quá ướt hoặc ngày nắng gắt giữa trưa."],
            "risk_notes_en": ["Do not fertilize when the soil is soaking wet or in harsh midday sun."],
            "weather_dependency": {"avoid_if": ["heavy_rain", "storm"]},
            "water_amount": None,
            "fertilizer_amount": {
                "value": profile.fertilizer_grams_pot
                if context.planting_mode == "pot"
                else profile.fertilizer_grams_ground,
                "unit": "g/cây/lần",
                "unit_en": "g per plant per application",
            },
            "sunlight_requirement": "Bón vào sáng sớm, tránh nóng cao",
            "sunlight_requirement_en": "Feed in the early morning and avoid peak heat",
            "reminder_offsets_minutes": [60],
        }
    )

    if profile.needs_support:
        templates.append(
            {
                "phase_key": "maintenance",
                "title": "Cắm cọc và buộc thân",
                "title_en": "Stake the plants and tie the stems",
                "short_label": "Cắm cọc",
                "short_label_en": "Staking",
                "description": (
                    f"Khi cây cao {_pair_text(profile.support_height_cm, 'cm')}, cắm cọc sát mép chậu hoặc cạnh gốc, "
                    "buộc thân bằng dây mềm."
                ),
                "description_en": (
                    f"Once the plants are {_pair_text(profile.support_height_cm, 'cm')} tall, drive a stake in near "
                    "the rim of the pot or beside the base, then tie the stem with soft twine."
                ),
                "why_this_step_matters": profile.support_note,
                "why_this_step_matters_en": profile.support_note_en,
                "prerequisites": ["Cây đã lớn và thân chính rõ."],
                "prerequisites_en": ["The plants are large enough and the main stem is clearly formed."],
                "tools_needed": ["Cọc tre hoặc cọc nhựa", "Dây buộc mềm", "Kéo"],
                "tools_needed_en": ["Bamboo or plastic stakes", "Soft tying twine", "Scissors"],
                "estimated_duration_minutes": 30,
                "start_offset_days": int(profile.vegetative[0]) + 4,
                "start_time": [7, 15],
                "duration_minutes": 30,
                "repeat_rule": None,
                "completion_condition": "Thân đứng, được buộc nhẹ và không bị cong gãy.",
                "completion_condition_en": "The stem stands upright, is tied loosely and is not bent or broken.",
                "risk_notes": ["Tránh đâm cọc quá sát rễ."],
                "risk_notes_en": ["Avoid driving the stake in too close to the roots."],
                "weather_dependency": {},
                "water_amount": None,
                "fertilizer_amount": None,
                "sunlight_requirement": "Tiếp tục duy trì nắng sáng tốt",
                "sunlight_requirement_en": "Keep giving the plants good morning sun",
                "reminder_offsets_minutes": [30],
            }
        )

    templates.append(
        {
            "phase_key": "monitoring",
            "title": "Kiểm tra sâu bệnh và lá bất thường",
            "title_en": "Scout for pests, disease and abnormal leaves",
            "short_label": "Kiểm tra sâu bệnh",
            "short_label_en": "Pest scouting",
            "description": (
                f"Mỗi {profile.scouting_interval_days} ngày kiểm tra lá, thân non và chỗ giao giữa các cành. {humid_note}"
            ),
            "description_en": (
                f"Every {profile.scouting_interval_days} days, inspect the leaves, young stems and the joints "
                f"between branches. {humid_note_en}"
            ),
            "why_this_step_matters": "Phát hiện sớm giúp xử lý nhẹ hơn và tránh lan sang nhiều cây.",
            "why_this_step_matters_en": "Catching problems early means a lighter treatment and stops them spreading to other plants.",
            "prerequisites": ["Cây đã vào giai đoạn phát triển thân lá."],
            "prerequisites_en": ["The plants have entered the vegetative growth stage."],
            "tools_needed": ["Găng tay", "Sổ ghi chú", "Điện thoại chụp ảnh nếu cần"],
            "tools_needed_en": ["Gloves", "Notebook", "Phone for photos if needed"],
            "estimated_duration_minutes": 15,
            "start_offset_days": scouting_start_day,
            "start_time": [7, 0],
            "duration_minutes": 15,
            "repeat_rule": {
                "freq": "every_n_days",
                "interval_days": profile.scouting_interval_days,
                "until_offset_days": scouting_end_day,
                "times_of_day": ["07:00"],
            },
            "completion_condition": "Đã ghi nhận lá, thân, hoa/quả có bình thường hay không.",
            "completion_condition_en": "You have recorded whether the leaves, stems and flowers or fruit look normal.",
            "risk_notes": ["Sau mưa cần kiểm tra kỹ hơn vì môi trường ẩm dễ phát sinh nấm."],
            "risk_notes_en": ["Check more carefully after rain, because damp conditions encourage fungus."],
            "weather_dependency": {},
            "water_amount": None,
            "fertilizer_amount": None,
            "sunlight_requirement": "Kiểm tra buổi sáng để dễ nhìn mặt dưới lá",
            "sunlight_requirement_en": "Scout in the morning so the undersides of the leaves are easier to see",
            "reminder_offsets_minutes": [20],
        }
    )

    templates.append(
        {
            "phase_key": "harvest",
            "title": "Theo dõi cửa sổ thu hoạch",
            "title_en": "Track the harvest window",
            "short_label": "Theo dõi thu hoạch",
            "short_label_en": "Harvest tracking",
            "description": (
                f"Từ ngày {int(profile.harvest[0])} trở đi, kiểm tra quả mỗi {profile.harvest_check_interval_days} ngày. "
                f"Thu hoạch khi {profile.harvest_signs}."
            ),
            "description_en": (
                f"From day {int(profile.harvest[0])} onwards, check the fruit every "
                f"{profile.harvest_check_interval_days} days. Harvest once {profile.harvest_signs_en}."
            ),
            "why_this_step_matters": "Thu đúng lúc giúp chất lượng quả tốt hơn và duy trì đợt quả tiếp theo.",
            "why_this_step_matters_en": "Picking at the right time gives better fruit quality and keeps the next flush coming.",
            "prerequisites": ["Cây đã ra hoa, đậu quả và nuôi quả."],
            "prerequisites_en": ["The plants have flowered, set fruit and are filling it out."],
            "tools_needed": ["Kéo cắt quả", "Rổ đựng nhẹ", "Khay đựng quả"],
            "tools_needed_en": ["Harvest snips", "Light-weight basket", "Fruit tray"],
            "estimated_duration_minutes": 20,
            "start_offset_days": int(profile.harvest[0]),
            "start_time": [6, 30],
            "duration_minutes": 20,
            "repeat_rule": {
                "freq": "every_n_days",
                "interval_days": profile.harvest_check_interval_days,
                "until_offset_days": int(profile.harvest[1]),
                "times_of_day": ["06:30"],
            },
            "completion_condition": "Đã kiểm tra và thu các quả đạt độ chín mong muốn.",
            "completion_condition_en": "You have checked the plants and picked the fruit that reached the ripeness you want.",
            "risk_notes": ["Không nên để quả quá chín trên cây nếu mưa ẩm kéo dài."],
            "risk_notes_en": ["Do not leave overripe fruit on the plant during a long wet spell."],
            "weather_dependency": {"avoid_if": ["storm"]},
            "water_amount": None,
            "fertilizer_amount": None,
            "sunlight_requirement": "Thu vào sáng sớm để quả mát và dễ bảo quản",
            "sunlight_requirement_en": "Harvest in the early morning so the fruit stays cool and keeps better",
            "reminder_offsets_minutes": [30],
        }
    )

    return templates


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
        for day_index in range(max(total_days, 1)):
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
            current_day += timedelta(days=max(interval_days, 1))

    for occurrence in occurrences[:120]:
        for offset in offsets or [30]:
            reminders.append((occurrence - timedelta(minutes=offset)).isoformat())
    return start_at, end_at, reminders


def generate_plan_payload(context: PlanContext) -> dict:
    weather_start = context.start_date - timedelta(days=30)
    weather_end = context.start_date + timedelta(days=90)
    weather = fetch_nasa_power(context.location.lat, context.location.lon, weather_start, weather_end)
    confidence = climate_confidence(weather)
    suitability = evaluate_suitability(
        context.crop,
        weather["derived_metrics"],
        context.planting_mode,
        context.experience_level,
        confidence,
    )
    recommended_start = context.start_date + timedelta(days=suitability["recommended_start_shift_days"])
    steps = []
    for index, template in enumerate(build_step_templates(context, weather["derived_metrics"]), start=1):
        start_at, end_at, reminder_times = compile_occurrences(template, recommended_start, context.timezone_name)
        steps.append(
            {
                "phase_key": template["phase_key"],
                "phase_label": PHASE_LABELS.get(template["phase_key"], template["phase_key"]),
                "phase_label_en": PHASE_LABELS_EN.get(template["phase_key"], template["phase_key"]),
                "step_number": index,
                "title": template["title"],
                "title_en": template.get("title_en", ""),
                "short_label": template["short_label"],
                "short_label_en": template.get("short_label_en", ""),
                "description": template["description"],
                "description_en": template.get("description_en", ""),
                "why_this_step_matters": template["why_this_step_matters"],
                "why_this_step_matters_en": template.get("why_this_step_matters_en", ""),
                "prerequisites": template["prerequisites"],
                "prerequisites_en": template.get("prerequisites_en", []),
                "tools_needed": template["tools_needed"],
                "tools_needed_en": template.get("tools_needed_en", []),
                "estimated_duration_minutes": template["estimated_duration_minutes"],
                "suggested_start_time": start_at.isoformat(),
                "suggested_end_time": end_at.isoformat(),
                "repeat_rule": template["repeat_rule"],
                "reminder_times": reminder_times,
                "completion_condition": template["completion_condition"],
                "completion_condition_en": template.get("completion_condition_en", ""),
                "risk_notes": template["risk_notes"],
                "risk_notes_en": template.get("risk_notes_en", []),
                "weather_dependency": template["weather_dependency"],
                "water_amount": template["water_amount"],
                "fertilizer_amount": template["fertilizer_amount"],
                "sunlight_requirement": template["sunlight_requirement"],
                "sunlight_requirement_en": template.get("sunlight_requirement_en", ""),
                "status": CropPlanStep.Status.CURRENT if index == 1 else CropPlanStep.Status.PENDING,
                "sort_key": f"{index:03d}",
            }
        )

    return {
        "weather": weather,
        "climate_confidence": confidence,
        "suitability": suitability,
        "recommended_start_date": recommended_start,
        "summary": (
            f"Kế hoạch {context.crop.name.lower()} cho {context.plant_count} cây tại {context.location.name}. "
            f"Hệ thống đề xuất bắt đầu vào {recommended_start.strftime('%d/%m/%Y')} và ưu tiên theo dõi mưa, độ ẩm."
        ),
        "summary_en": (
            f"Growing plan for {_crop_name_en(context.crop).lower()} covering {context.plant_count} plants at {context.location.name}. "
            f"The system suggests starting on {recommended_start.strftime('%d/%m/%Y')} and keeping a close watch on rainfall and humidity."
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


def _create_weather_snapshot(context: PlanContext, payload: dict) -> WeatherSnapshot:
    return WeatherSnapshot.objects.create(
        location=context.location,
        source=payload["weather"]["source"],
        time_range_start=context.start_date - timedelta(days=30),
        time_range_end=context.start_date + timedelta(days=90),
        raw_payload=payload["weather"]["raw_payload"],
        daily_series=payload["weather"]["daily_series"],
        derived_metrics=payload["weather"]["derived_metrics"],
    )


def _plan_metadata(context: PlanContext, payload: dict) -> dict:
    return {
        "warnings": payload["suitability"]["warnings"],
        "warnings_en": payload["suitability"].get("warnings_en", []),
        "climate_metrics": payload["weather"]["derived_metrics"],
        "climate_confidence": payload["climate_confidence"],
        "climate_coverage": payload["weather"].get("coverage", {}),
        "timezone": context.timezone_name,
    }


def _write_steps_and_reminders(plan: CropPlan, payload: dict) -> None:
    reminder_instances: list[Reminder] = []
    for step_payload in payload["steps"]:
        water_amount = step_payload.get("water_amount") or {}
        fertilizer_amount = step_payload.get("fertilizer_amount") or {}
        step = CropPlanStep.objects.create(
            crop_plan=plan,
            phase_key=step_payload["phase_key"],
            step_number=step_payload["step_number"],
            title=step_payload["title"],
            title_en=step_payload.get("title_en", ""),
            short_label=step_payload["short_label"],
            short_label_en=step_payload.get("short_label_en", ""),
            description=step_payload["description"],
            description_en=step_payload.get("description_en", ""),
            why_this_step_matters=step_payload["why_this_step_matters"],
            why_this_step_matters_en=step_payload.get("why_this_step_matters_en", ""),
            prerequisites=step_payload["prerequisites"],
            prerequisites_en=step_payload.get("prerequisites_en", []),
            tools_needed=step_payload["tools_needed"],
            tools_needed_en=step_payload.get("tools_needed_en", []),
            estimated_duration_minutes=step_payload["estimated_duration_minutes"],
            suggested_start_time=datetime.fromisoformat(step_payload["suggested_start_time"]),
            suggested_end_time=datetime.fromisoformat(step_payload["suggested_end_time"]),
            repeat_rule=step_payload["repeat_rule"],
            reminder_times=step_payload["reminder_times"],
            completion_condition=step_payload["completion_condition"],
            completion_condition_en=step_payload.get("completion_condition_en", ""),
            risk_notes=step_payload["risk_notes"],
            risk_notes_en=step_payload.get("risk_notes_en", []),
            weather_dependency=step_payload["weather_dependency"],
            water_amount_value=water_amount.get("value"),
            water_amount_unit=water_amount.get("unit", ""),
            water_amount_unit_en=water_amount.get("unit_en", ""),
            fertilizer_amount_value=fertilizer_amount.get("value"),
            fertilizer_amount_unit=fertilizer_amount.get("unit", ""),
            fertilizer_amount_unit_en=fertilizer_amount.get("unit_en", ""),
            sunlight_requirement_text=step_payload["sunlight_requirement"],
            sunlight_requirement_text_en=step_payload.get("sunlight_requirement_en", ""),
            status=step_payload["status"],
            sort_key=step_payload["sort_key"],
        )

        for reminder_time in step_payload["reminder_times"][:120]:
            trigger = datetime.fromisoformat(reminder_time)
            reminder_instances.append(
                Reminder(
                    user=plan.user,
                    crop_plan=plan,
                    step=step,
                    title=f"Nhắc việc: {step.title}",
                    title_en=f"Reminder: {step.title_en or step.title}",
                    body=f"Đến lúc thực hiện bước '{step.title.lower()}' cho kế hoạch {plan.crop.name.lower()}.",
                    body_en=(
                        f"It's time for the step '{(step.title_en or step.title).lower()}' "
                        f"in your {_crop_name_en(plan.crop).lower()} plan."
                    ),
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


def create_plan_from_payload(user, context: PlanContext) -> CropPlan:
    payload = generate_plan_payload(context)
    with transaction.atomic():
        weather_snapshot = _create_weather_snapshot(context, payload)
        plan = CropPlan.objects.create(
            user=user,
            crop=context.crop,
            location=context.location,
            weather_snapshot=weather_snapshot,
            title=f"Kế hoạch trồng {context.crop.name} - {context.location.name}",
            title_en=f"Growing plan for {_crop_name_en(context.crop)} - {context.location.name}",
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
            summary_en=payload.get("summary_en", ""),
            ai_reasoning_summary=payload["suitability"]["reasoning_summary"],
            ai_reasoning_summary_en=payload["suitability"].get("reasoning_summary_en", ""),
            plan_goal=context.plan_goal,
            experience_level=context.experience_level,
            metadata=_plan_metadata(context, payload),
        )
        _write_steps_and_reminders(plan, payload)
    return plan


def regenerate_plan(plan: CropPlan) -> CropPlan:
    """Rebuild a plan's schedule in place, keeping its id.

    The detail page URL carries the id, so replacing the row left every later
    action on that page pointing at a plan that no longer existed.
    """
    context = build_context_from_request(
        plan.crop,
        plan.location,
        {
            "planting_mode": plan.planting_mode,
            "area_value": plan.area_value,
            "area_unit": plan.area_unit,
            "plant_count": plan.plant_count,
            "start_date": plan.planned_start_date,
            "experience_level": plan.experience_level or "beginner",
            "plan_goal": plan.plan_goal or "home",
            "timezone": plan.location.timezone,
        },
    )
    payload = generate_plan_payload(context)

    with transaction.atomic():
        plan.steps.all().delete()
        plan.reminders.all().delete()
        plan.weather_snapshot = _create_weather_snapshot(context, payload)
        plan.recommended_start_date = payload["recommended_start_date"]
        plan.status = CropPlan.Status.ACTIVE
        plan.suitability_score = payload["suitability"]["score"]
        plan.suitability_level = payload["suitability"]["level"]
        plan.summary = payload["summary"]
        plan.summary_en = payload.get("summary_en", "")
        plan.ai_reasoning_summary = payload["suitability"]["reasoning_summary"]
        plan.ai_reasoning_summary_en = payload["suitability"].get("reasoning_summary_en", "")
        plan.plan_version = plan.plan_version + 1
        plan.metadata = _plan_metadata(context, payload)
        plan.save()
        _write_steps_and_reminders(plan, payload)

    plan.refresh_from_db()
    return plan


def refresh_plan_weather(plan: CropPlan) -> dict:
    window_start = plan.recommended_start_date or plan.planned_start_date
    weather = fetch_nasa_power(plan.location.lat, plan.location.lon, window_start, window_start + timedelta(days=14))
    derived = weather["derived_metrics"]
    confidence = climate_confidence(weather)
    # Kept apart from the data-provenance notes below, because only real
    # weather trouble should push the plan into "needs review".
    weather_warnings: list[str] = []
    weather_warnings_en: list[str] = []
    notes: list[str] = []
    notes_en: list[str] = []

    rain_14d = derived.get("rain_sum_14d")
    humidity = derived.get("humidity_avg_14d")

    if confidence == CONFIDENCE_UNAVAILABLE:
        notes.append("Chưa lấy được dữ liệu khí hậu mới cho khu vực này, hãy thử lại sau.")
        notes_en.append("No fresh climate data could be retrieved for this area; please try again later.")
    else:
        if rain_14d is not None and rain_14d > 90:
            weather_warnings.append("Dự báo mưa nhiều, cần giảm tưới và kiểm tra thoát nước.")
            weather_warnings_en.append("Heavy rain is forecast; water less and check drainage.")
        if humidity is not None and humidity > 82:
            weather_warnings.append("Độ ẩm cao, cần tăng tần suất kiểm tra nấm bệnh.")
            weather_warnings_en.append("Humidity is high; check for fungal disease more often.")
        if confidence == CONFIDENCE_CLIMATOLOGY:
            notes.append(
                "Khoảng thời gian này chưa có số liệu thực đo, các con số bên dưới là trung bình khí hậu nhiều năm."
            )
            notes_en.append(
                "This window has no measured data yet, so the figures below are the multi-year climate average."
            )

    warnings = weather_warnings + notes
    warnings_en = weather_warnings_en + notes_en

    # Once the trouble clears, an untouched plan goes back to normal.
    if weather_warnings:
        status = CropPlan.Status.NEEDS_REVIEW
    elif plan.status == CropPlan.Status.NEEDS_REVIEW:
        status = CropPlan.Status.ACTIVE
    else:
        status = plan.status

    refreshed_at = timezone.now().isoformat()
    plan.status = status
    plan.metadata = {
        **plan.metadata,
        "weather_refresh": {
            "derived_metrics": derived,
            "warnings": warnings,
            "warnings_en": warnings_en,
            "confidence": confidence,
            "source": weather["source"],
            "coverage": weather.get("coverage", {}),
            "refreshed_at": refreshed_at,
        },
    }
    plan.save(update_fields=["status", "metadata", "updated_at"])
    return {
        "warnings": warnings,
        "warnings_en": warnings_en,
        "derived_metrics": derived,
        "confidence": confidence,
        "source": weather["source"],
        "coverage": weather.get("coverage", {}),
        "refreshed_at": refreshed_at,
        "status": status,
    }


def _advance_to_next_step(step: CropPlanStep) -> None:
    next_step = (
        step.crop_plan.steps.filter(step_number__gt=step.step_number)
        .exclude(status=CropPlanStep.Status.COMPLETED)
        .order_by("step_number")
        .first()
    )
    if next_step and next_step.status == CropPlanStep.Status.PENDING:
        next_step.status = CropPlanStep.Status.CURRENT
        next_step.save(update_fields=["status", "updated_at"])


def mark_step_complete(step: CropPlanStep, note: str = "") -> CropPlanStep:
    already_completed = step.status == CropPlanStep.Status.COMPLETED
    step.status = CropPlanStep.Status.COMPLETED
    step.completed_at = step.completed_at if already_completed else timezone.now()
    if note:
        step.user_notes = note
    step.save(update_fields=["status", "completed_at", "user_notes", "updated_at"])
    step.reminders.filter(status=Reminder.Status.SCHEDULED).update(status=Reminder.Status.CANCELLED, completed_or_not=True)

    # A double tap on "hoàn thành" should not add a second entry to the log.
    if not already_completed:
        CompletionLog.objects.create(
            user=step.crop_plan.user,
            crop_plan=step.crop_plan,
            step=step,
            step_number=step.step_number,
            step_title=step.title,
            action="completed",
            note=note,
        )

    _advance_to_next_step(step)

    if not step.crop_plan.steps.exclude(status=CropPlanStep.Status.COMPLETED).exists():
        step.crop_plan.status = CropPlan.Status.COMPLETED
        step.crop_plan.save(update_fields=["status", "updated_at"])
    return step


def reopen_step(step: CropPlanStep, note: str = "") -> CropPlanStep:
    """Undo a completion: the step becomes current again and its plan reopens."""
    step.status = CropPlanStep.Status.CURRENT
    step.completed_at = None
    step.save(update_fields=["status", "completed_at", "updated_at"])
    step.reminders.filter(status=Reminder.Status.CANCELLED, trigger_time__gt=timezone.now()).update(
        status=Reminder.Status.SCHEDULED, completed_or_not=False
    )

    # Whatever came after it can no longer be "current" while this one is open.
    step.crop_plan.steps.filter(
        step_number__gt=step.step_number, status=CropPlanStep.Status.CURRENT
    ).update(status=CropPlanStep.Status.PENDING)

    if step.crop_plan.status == CropPlan.Status.COMPLETED:
        step.crop_plan.status = CropPlan.Status.ACTIVE
        step.crop_plan.save(update_fields=["status", "updated_at"])

    CompletionLog.objects.create(
        user=step.crop_plan.user,
        crop_plan=step.crop_plan,
        step=step,
        step_number=step.step_number,
        step_title=step.title,
        action="reopened",
        note=note,
    )
    return step


def delay_step(step: CropPlanStep, delay_days: int, reason: str = "") -> CropPlanStep:
    delta = timedelta(days=delay_days)
    step.suggested_start_time += delta
    step.suggested_end_time += delta
    # Rescheduling a finished step used to silently un-complete it.
    if step.status != CropPlanStep.Status.COMPLETED:
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
        step_number=step.step_number,
        step_title=step.title,
        action="delayed",
        note=reason or f"Dời lịch {delay_days} ngày",
    )
    return step
