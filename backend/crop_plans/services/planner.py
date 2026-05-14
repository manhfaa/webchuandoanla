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
    "preparation": "Chuan bi",
    "sowing": "Gieo trong",
    "early_care": "Cham soc ban dau",
    "maintenance": "Cham soc dinh ky",
    "monitoring": "Theo doi",
    "harvest": "Thu hoach",
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
        warnings.append("Nhiet do hien tai hoi thap, nen lui lich gieo de cay de nay mam hon.")
    elif avg_temp > optimal_temp[1] + 3:
        score -= 12
        warnings.append("Nhiet do cao, can che nang giai doan dau va theo doi mat nuoc.")

    if humidity > humidity_range[1]:
        score -= 12
        warnings.append("Do am cao, can thong thoang va tang kiem tra nam benh.")

    if rain_14d > climate.get("rain_14d_high_mm", 80):
        score -= 15
        warnings.append("Mua nhieu trong 2 tuan toi, nen giam tuoi va uu tien dat thoat nuoc.")

    if sun_hours < sunlight_hours:
        score -= 10
        warnings.append("Luong nang du kien chua cao, nen uu tien vi tri nhan nang buoi sang.")

    if planting_mode == "pot":
        warnings.append("Trong chau can kiem tra lo thoat nuoc va do am dat thuong xuyen hon trong dat.")
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
            f"Khu vuc nay co nhiet do trung binh {avg_temp}°C, do am {humidity}% va tong mua 14 ngay "
            f"{rain_14d} mm. He thong danh gia muc phu hop o muc "
            f"{'tot' if level == CropPlan.SuitabilityLevel.SUITABLE else 'can can nhac'}."
        ),
    }


def _water_amount(planting_mode: str, plant_count: int) -> tuple[Decimal, str]:
    if planting_mode == "pot":
        return Decimal("600"), "ml/chau/lan"
    if plant_count >= 20:
        return Decimal("1.5"), "lit/cay/lan"
    return Decimal("1.2"), "lit/cay/lan"


def build_step_templates(context: PlanContext, metrics: dict) -> list[dict]:
    rain_14d = metrics.get("rain_sum_14d", 0)
    humid = metrics.get("humidity_avg_14d", 0)
    water_value, water_unit = _water_amount(context.planting_mode, context.plant_count)
    planting_distance = "50-60 cm giua cac cay" if context.planting_mode == "ground" else "moi chau 1 cay"
    plan_scale_note = (
        "Tach thanh checklist theo tung khu chau de de kiem soat tien do."
        if context.plant_count >= 15 or (context.area_value and context.area_value >= 20)
        else "Lam theo tung cay hoac tung cum nho."
    )

    return [
        {
            "phase_key": "preparation",
            "title": "Chuan bi gia the va dung cu trong",
            "short_label": "Chuan bi dat",
            "description": (
                "Tron dat sach voi phan huu co hoai muc va vat lieu giup thoat nuoc. "
                f"Neu trong dat, lam toi mat dat va giu khoang cach {planting_distance}. "
                "Neu trong chau, su dung chau 20-30 lit co it nhat 4 lo thoat nuoc."
            ),
            "why_this_step_matters": "Nen trong thong thoang giup re phat trien nhanh, giam ung va han che nam.",
            "prerequisites": ["Kiem tra vi tri trong co nhan du nang buoi sang."],
            "tools_needed": ["Chau hoac luong trong", "Dat sach", "Phan huu co", "Xeng tay", "Gang tay"],
            "estimated_duration_minutes": 60,
            "start_offset_days": -1,
            "start_time": [7, 0],
            "duration_minutes": 60,
            "repeat_rule": None,
            "completion_condition": "Dat toi, khong dong nuoc sau khi tuoi thu 1 ca nuoc nhe.",
            "risk_notes": ["Neu dat nen chat, cay de bi vang la va cham lon."],
            "weather_dependency": {"avoid_if": ["heavy_rain"]},
            "water_amount": None,
            "fertilizer_amount": {"value": 1.5, "unit": "kg phan huu co/10 lit dat"} if context.planting_mode == "pot" else {"value": 2.0, "unit": "kg phan huu co/m2"},
            "sunlight_requirement": "Vi tri co 6-8 gio nang/ngay",
            "reminder_offsets_minutes": [30],
        },
        {
            "phase_key": "sowing",
            "title": "Xu ly hat giong truoc khi gieo",
            "short_label": "Xu ly hat",
            "description": "Ngam hat trong nuoc am 2-4 gio, sau do de rao. Loai bo hat noi tren mat nuoc neu co.",
            "why_this_step_matters": "Hat hut du am deu hon va tang ty le nay mam.",
            "prerequisites": ["Da chuan bi gia the."],
            "tools_needed": ["Hat giong", "Ly nuoc am", "Khay hoac khan sach"],
            "estimated_duration_minutes": 25,
            "start_offset_days": 0,
            "start_time": [6, 30],
            "duration_minutes": 25,
            "repeat_rule": None,
            "completion_condition": "Hat no deu, khong ngam qua lau den muc mem vo.",
            "risk_notes": ["Ngam qua lau co the lam hat bi ung, kho nay mam."],
            "weather_dependency": {},
            "water_amount": None,
            "fertilizer_amount": None,
            "sunlight_requirement": "Chua can phoi nang",
            "reminder_offsets_minutes": [20],
        },
        {
            "phase_key": "sowing",
            "title": "Gieo hat va phu lop dat mong",
            "short_label": "Gieo hat",
            "description": "Moi lo gieo 1-2 hat, dat sau 0.5-1 cm, phu dat mong va tuoi phun suong nhe.",
            "why_this_step_matters": "Do sau gieo va do am phu hop giup hat nay mam nhanh va dong deu.",
            "prerequisites": ["Da xu ly hat hoac chuan bi hat giong."],
            "tools_needed": ["Khay gieo hoac chau", "Binh phun suong", "Nhom ghi ngay gieo"],
            "estimated_duration_minutes": 35,
            "start_offset_days": 0,
            "start_time": [7, 15],
            "duration_minutes": 35,
            "repeat_rule": None,
            "completion_condition": "Mat dat am deu, hat duoc phu dat mong va ghi ngay gieo.",
            "risk_notes": ["Khong nen an hat qua sau vi se kho doi mam."],
            "weather_dependency": {"avoid_if": ["storm"]},
            "water_amount": {"value": 150, "unit": "ml/khay gieo"},
            "fertilizer_amount": None,
            "sunlight_requirement": "Anh sang tan xa, tranh nang gat ngay lap tuc",
            "reminder_offsets_minutes": [20],
        },
        {
            "phase_key": "early_care",
            "title": "Kiem tra nay mam va bo sung cay du phong",
            "short_label": "Kiem tra nay mam",
            "description": "Sau gieo 5-7 ngay, kiem tra cac lo gieo da doi mam chua. Neu lo nao khong len, co the gieo bu ngay.",
            "why_this_step_matters": "Phat hien som lo gieo hong de bo sung kip, giu mat do cay deu.",
            "prerequisites": ["Da hoan thanh gieo hat."],
            "tools_needed": ["So ghi chu", "Binh phun suong"],
            "estimated_duration_minutes": 15,
            "start_offset_days": 7,
            "start_time": [7, 0],
            "duration_minutes": 15,
            "repeat_rule": {"freq": "daily", "count": 3, "times_of_day": ["07:00"]},
            "completion_condition": "Da ghi nhan ty le nay mam va quyet dinh co bo sung hay khong.",
            "risk_notes": ["Do am qua cao de phat sinh nam o giai doan nay mam."],
            "weather_dependency": {},
            "water_amount": {"value": 120, "unit": "ml/khay/lan"},
            "fertilizer_amount": None,
            "sunlight_requirement": "Tang dan anh sang moi ngay",
            "reminder_offsets_minutes": [30],
        },
        {
            "phase_key": "early_care",
            "title": "Tap cho cay con lam quen voi nang",
            "short_label": "Tap nang",
            "description": "Khi cay co 2-3 la that, dua cay ra nang sang 2-3 gio/ngay, sau do tang dan len 4-6 gio.",
            "why_this_step_matters": "Cay con can thich nghi tu tu de tranh soc nhiet va chay la.",
            "prerequisites": ["Cay con da len deu."],
            "tools_needed": ["Khay hoac chau cay", "Luoi che nang neu can"],
            "estimated_duration_minutes": 20,
            "start_offset_days": 12,
            "start_time": [7, 30],
            "duration_minutes": 20,
            "repeat_rule": {"freq": "daily", "count": 3, "times_of_day": ["07:30"]},
            "completion_condition": "La dung, xanh va khong heo sau khi dua ra nang sang.",
            "risk_notes": ["Neu la non bi quap, giam thoi gian phoi nang vao ngay hom sau."],
            "weather_dependency": {"avoid_if": ["extreme_heat"]},
            "water_amount": None,
            "fertilizer_amount": None,
            "sunlight_requirement": "Tang dan tu 2 gio len 6 gio nang sang",
            "reminder_offsets_minutes": [25],
        },
        {
            "phase_key": "maintenance",
            "title": "Tuoi nuoc dinh ky",
            "short_label": "Tuoi nuoc",
            "description": (
                "Tuoi vao 6h sang va 17h chieu. Kiem tra do am dat truoc khi tuoi; "
                f"neu dat con am do mua gan day ({rain_14d} mm/14 ngay) thi giam hoac bo cu tuoi chieu. "
                f"{plan_scale_note}"
            ),
            "why_this_step_matters": "Ca chua can do am on dinh de phat trien than la va nuoi qua.",
            "prerequisites": ["Da gieo trong va cay bat dau phat trien."],
            "tools_needed": ["Binh tuoi hoac he thong tuoi nhe", "Do am dat cam tay"],
            "estimated_duration_minutes": 12 if context.plant_count <= 10 else 25,
            "start_offset_days": 1,
            "start_time": [6, 0],
            "duration_minutes": 10,
            "repeat_rule": {"freq": "daily", "until_offset_days": 75, "times_of_day": ["06:00", "17:00"]},
            "completion_condition": "Dat am deu o lop re, khong dong nuoc duoi chau hay mat luong.",
            "risk_notes": ["Neu mua nhieu thi bo cu tuoi chieu.", "Neu dat da am, khong nen tuoi them."],
            "weather_dependency": {"skip_if": ["rain_today_mm > 8"]},
            "water_amount": {"value": float(water_value), "unit": water_unit},
            "fertilizer_amount": None,
            "sunlight_requirement": "Duy tri 6-8 gio nang/ngay",
            "reminder_offsets_minutes": [15],
        },
        {
            "phase_key": "maintenance",
            "title": "Bon phan nhe theo chu ky",
            "short_label": "Bon phan",
            "description": "Bat dau bon nhe tu ngay 20 den ngay 35 sau gieo, lap lai moi 5 ngay. Bon cach goc 5-7 cm.",
            "why_this_step_matters": "Bon dung luc giup cay ra than la khoe va san sang ra hoa.",
            "prerequisites": ["Cay da on dinh sau giai doan cay con."],
            "tools_needed": ["Phan huu co hoac NPK loang", "Muong do", "Gang tay"],
            "estimated_duration_minutes": 20,
            "start_offset_days": 20,
            "start_time": [6, 30],
            "duration_minutes": 20,
            "repeat_rule": {"freq": "every_n_days", "interval_days": 5, "until_offset_days": 35, "times_of_day": ["06:30"]},
            "completion_condition": "Da bon dung lieu, khong de phan cham truc tiep vao than cay.",
            "risk_notes": ["Khong bon luc dat dang qua uot hoac ngay nang gat giua trua."],
            "weather_dependency": {"avoid_if": ["heavy_rain", "storm"]},
            "water_amount": None,
            "fertilizer_amount": {"value": 15 if context.planting_mode == "pot" else 25, "unit": "g/cay/lan"},
            "sunlight_requirement": "Bon vao sang som, tranh nong cao",
            "reminder_offsets_minutes": [60],
        },
        {
            "phase_key": "maintenance",
            "title": "Cam coc va buong than",
            "short_label": "Cam coc",
            "description": "Khi cay cao 25-35 cm, cam coc sat mep chau hoac canh goc, buong than bang day mem.",
            "why_this_step_matters": "Cam coc giup cay dung thang, thong thoang va de cham soc.",
            "prerequisites": ["Cay da lon va than chinh ro."],
            "tools_needed": ["Coc tre hoac coc nhua", "Day buong mem", "Keo"],
            "estimated_duration_minutes": 30,
            "start_offset_days": 24,
            "start_time": [7, 15],
            "duration_minutes": 30,
            "repeat_rule": None,
            "completion_condition": "Than dung, duoc buong nhe va khong bi cong gay.",
            "risk_notes": ["Tranh dam coc qua sat re."],
            "weather_dependency": {},
            "water_amount": None,
            "fertilizer_amount": None,
            "sunlight_requirement": "Tiep tuc duy tri nang sang tot",
            "reminder_offsets_minutes": [30],
        },
        {
            "phase_key": "monitoring",
            "title": "Kiem tra sau benh va la bat thuong",
            "short_label": "Kiem tra sau benh",
            "description": f"Moi 2 ngay kiem tra la, than non va cho giao giua cac canh. Do am dang o {humid}%, can uu tien tim dau hieu nam.",
            "why_this_step_matters": "Phat hien som giup xu ly nhe hon va tranh lan sang nhieu cay.",
            "prerequisites": ["Cay da vao giai doan phat trien than la."],
            "tools_needed": ["Gang tay", "So ghi chu", "Dien thoai chup anh neu can"],
            "estimated_duration_minutes": 15,
            "start_offset_days": 18,
            "start_time": [7, 0],
            "duration_minutes": 15,
            "repeat_rule": {"freq": "every_n_days", "interval_days": 2, "until_offset_days": 80, "times_of_day": ["07:00"]},
            "completion_condition": "Da ghi nhan la, than, hoa/qua co binh thuong hay khong.",
            "risk_notes": ["Sau mua can kiem tra ky hon vi moi truong am de phat sinh nam."],
            "weather_dependency": {},
            "water_amount": None,
            "fertilizer_amount": None,
            "sunlight_requirement": "Kiem tra buoi sang de de nhin mat duoi la",
            "reminder_offsets_minutes": [20],
        },
        {
            "phase_key": "harvest",
            "title": "Theo doi cua so thu hoach",
            "short_label": "Theo doi thu hoach",
            "description": "Tu ngay 60 tro di, kiem tra qua moi 2 ngay. Thu hoach khi qua len mau deu, vo cang va kich co on dinh.",
            "why_this_step_matters": "Thu dung luc giup chat luong qua tot hon va duy tri dot qua tiep theo.",
            "prerequisites": ["Cay da ra hoa, dau qua va nuoi qua."],
            "tools_needed": ["Keo cat qua", "Roi dung nhe", "Khay dung qua"],
            "estimated_duration_minutes": 20,
            "start_offset_days": 60,
            "start_time": [6, 30],
            "duration_minutes": 20,
            "repeat_rule": {"freq": "every_n_days", "interval_days": 2, "until_offset_days": 90, "times_of_day": ["06:30"]},
            "completion_condition": "Da kiem tra va thu cac qua dat do chin mong muon.",
            "risk_notes": ["Khong nen de qua qua chin tren cay neu mua am keo dai."],
            "weather_dependency": {"avoid_if": ["storm"]},
            "water_amount": None,
            "fertilizer_amount": None,
            "sunlight_requirement": "Thu vao sang som de qua mat va de bao quan",
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
            f"Ke hoach {context.crop.name.lower()} cho {context.plant_count} cay tai {context.location.name}. "
            f"He thong de xuat bat dau vao {recommended_start.strftime('%d/%m/%Y')} va uu tien theo doi mua, do am."
        ),
        "steps": steps,
    }


def _map_reminder_type(step_title: str) -> str:
    title = step_title.lower()
    if "tuoi" in title:
        return "watering"
    if "phan" in title:
        return "fertilizing"
    if "thu hoach" in title:
        return "harvest_window"
    if "sau benh" in title:
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
            title=f"Ke hoach trong {context.crop.name} - {context.location.name}",
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
                        title=f"Nhac viec: {step.title}",
                        body=f"Den luc thuc hien buoc '{step.title.lower()}' cho ke hoach {plan.crop.name.lower()}.",
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
        warnings.append("Du bao mua nhieu, can giam tuoi va kiem tra thoat nuoc.")
        status = CropPlan.Status.NEEDS_REVIEW
    if derived.get("humidity_avg_14d", 0) > 82:
        warnings.append("Do am cao, can tang tan suat kiem tra nam benh.")
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
    step.delay_reason = reason or f"Doi lich {delay_days} ngay"
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
        note=reason or f"Doi lich {delay_days} ngay",
    )
    return step
