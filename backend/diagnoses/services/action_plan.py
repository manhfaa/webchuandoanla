from __future__ import annotations

from typing import Any


DISCLAIMER = "Thông tin chỉ mang tính tham khảo, không thay thế tư vấn của chuyên gia nông nghiệp."
DISCLAIMER_EN = (
    "This information is for reference only and does not replace advice from a local "
    "agricultural expert."
)

# Vietnamese severity/risk labels mapped to natural English.
# Unknown values fall back to the Vietnamese text itself.
SEVERITY_EN = {
    "low": "low",
    "medium": "medium",
    "high": "high",
    "unknown": "unknown",
    "khỏe": "Healthy",
    "khoẻ": "Healthy",
    "cây khỏe": "Healthy plant",
    "cần theo dõi": "Needs monitoring",
    "theo dõi": "Monitor",
    "nhẹ": "Mild",
    "trung bình": "Moderate",
    "nặng": "Severe",
    "nghiêm trọng": "Severe",
    "chưa xác định": "Not determined",
}


def _severity_en(value: str) -> str:
    return SEVERITY_EN.get((value or "").strip().lower(), value)


def build_action_plan(
    *,
    crop_name: str = "",
    disease_name: str = "",
    confidence: float = 0,
    validation_result: bool = True,
    severity: str = "",
    crop_name_en: str = "",
) -> dict[str, Any]:
    if not validation_result:
        return {
            "risk_level": "unknown",
            "immediate_actions": [],
            "follow_up_actions": [],
            "expert_required": False,
            "recheck_after_days": 0,
            "safety_notes": [],
            "disclaimer": DISCLAIMER,
            "warning": "Ảnh chưa hợp lệ nên hệ thống không đưa ra khuyến nghị bệnh cây.",
            "immediate_actions_en": [],
            "follow_up_actions_en": [],
            "safety_notes_en": [],
            "disclaimer_en": DISCLAIMER_EN,
            "warning_en": (
                "The photo is not valid yet, so no plant disease recommendation is given."
            ),
        }

    disease_norm = (disease_name or "").lower()
    crop_label = crop_name or "cây trồng"
    crop_label_en = (crop_name_en or "").strip() or crop_name or "your crop"
    is_healthy = "healthy" in disease_norm or "khỏe" in disease_norm
    low_confidence = confidence < 0.7
    high_risk_terms = [
        "blight",
        "rust",
        "mildew",
        "rot",
        "virus",
        "mite",
        "spot",
        "scab",
        "scorch",
        "cháy",
        "gỉ",
        "thối",
        "đốm",
        "mốc",
        "phấn trắng",
        "vàng lá",
        "xoăn",
        "nhện",
        "ghẻ",
        "sương mai",
        "bạc lá",
    ]

    if is_healthy:
        risk_level = "low"
    elif any(term in disease_norm for term in high_risk_terms) or confidence >= 0.85:
        risk_level = "high"
    elif confidence >= 0.7:
        risk_level = "medium"
    else:
        risk_level = "medium"

    if is_healthy:
        immediate_actions = [
            f"Tiếp tục chăm sóc {crop_label} theo lịch tưới và bón phân hiện tại.",
            "Kiểm tra thêm vài lá ở các vị trí khác để chắc chắn vườn đồng đều.",
        ]
        immediate_actions_en = [
            f"Keep caring for {crop_label_en} on your current watering and fertilizing schedule.",
            "Check a few more leaves in other spots to confirm the plot is uniform.",
        ]
        follow_up_actions = [
            "Theo dõi màu lá, đốm lạ và mặt dưới lá trong 3-7 ngày.",
            "Chụp lại nếu xuất hiện đốm lan rộng, vàng lá hoặc xoăn lá.",
        ]
        follow_up_actions_en = [
            "Watch leaf colour, unusual spots and the leaf undersides for 3-7 days.",
            "Take another photo if spots spread, leaves turn yellow or leaves curl.",
        ]
        expert_required = False
        recheck_after_days = 7
    else:
        immediate_actions = [
            "Cách ly hoặc đánh dấu khu vực cây có triệu chứng để theo dõi riêng.",
            "Chụp thêm ảnh cận cảnh mặt trên, mặt dưới lá và toàn cây.",
            "Không tự ý phun thuốc liều cao khi chưa đối chiếu thực địa.",
        ]
        immediate_actions_en = [
            "Isolate or mark the area with symptomatic plants so you can monitor it separately.",
            "Take extra close-up photos of the upper leaf surface, the underside and the whole plant.",
            "Do not spray a high pesticide dose on your own before checking the plants in the field.",
        ]
        follow_up_actions = [
            "Theo dõi tốc độ lan rộng của vết bệnh trong 3-7 ngày.",
            "Ghi lại thời tiết, lịch tưới, bón phân và lần phun gần nhất.",
            "So sánh thêm với các cây xung quanh để xác định phạm vi ảnh hưởng.",
        ]
        follow_up_actions_en = [
            "Track how fast the lesions spread over the next 3-7 days.",
            "Write down the weather, the watering and fertilizing schedule, and the most recent spray.",
            "Compare with the surrounding plants to work out how far the problem has spread.",
        ]
        expert_required = risk_level == "high" or low_confidence
        recheck_after_days = 3 if risk_level == "high" else 5

    safety_notes = [
        "Luôn đọc nhãn sản phẩm trước khi dùng thuốc hoặc phân bón.",
        "Mang găng tay, khẩu trang và kính bảo hộ khi xử lý cây bệnh.",
        "Không phun thuốc khi sắp mưa, gió mạnh hoặc gần nguồn nước.",
    ]
    safety_notes_en = [
        "Always read the product label before using any pesticide or fertilizer.",
        "Wear gloves, a mask and safety goggles when handling diseased plants.",
        "Do not spray when rain is coming, in strong wind, or near a water source.",
    ]

    warning = ""
    warning_en = ""
    if low_confidence:
        warning = "Kết quả chưa đủ chắc chắn, nên chụp lại ảnh rõ hơn hoặc hỏi chuyên gia."
        warning_en = (
            "The result is not certain enough; take a clearer photo or ask an agricultural expert."
        )

    return {
        "risk_level": risk_level,
        "immediate_actions": immediate_actions,
        "follow_up_actions": follow_up_actions,
        "expert_required": expert_required,
        "recheck_after_days": recheck_after_days,
        "should_retake_photo": low_confidence,
        "safety_notes": safety_notes,
        "disclaimer": DISCLAIMER,
        "warning": warning,
        "severity": severity or risk_level,
        "immediate_actions_en": immediate_actions_en,
        "follow_up_actions_en": follow_up_actions_en,
        "safety_notes_en": safety_notes_en,
        "disclaimer_en": DISCLAIMER_EN,
        "warning_en": warning_en,
        "severity_en": _severity_en(severity) or _severity_en(risk_level),
    }
