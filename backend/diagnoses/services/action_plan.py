from __future__ import annotations

from typing import Any


DISCLAIMER = "Thông tin chỉ mang tính tham khảo, không thay thế tư vấn của chuyên gia nông nghiệp."


def build_action_plan(
    *,
    crop_name: str = "",
    disease_name: str = "",
    confidence: float = 0,
    validation_result: bool = True,
    severity: str = "",
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
        }

    disease_norm = (disease_name or "").lower()
    crop_label = crop_name or "cây trồng"
    is_healthy = "healthy" in disease_norm or "khỏe" in disease_norm
    low_confidence = confidence < 0.7
    high_risk_terms = ["blight", "rust", "mildew", "rot", "cháy", "gỉ", "thối", "sương mai", "bạc lá"]

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
        follow_up_actions = [
            "Theo dõi màu lá, đốm lạ và mặt dưới lá trong 3-7 ngày.",
            "Chụp lại nếu xuất hiện đốm lan rộng, vàng lá hoặc xoăn lá.",
        ]
        expert_required = False
        recheck_after_days = 7
    else:
        immediate_actions = [
            "Cách ly hoặc đánh dấu khu vực cây có triệu chứng để theo dõi riêng.",
            "Chụp thêm ảnh cận cảnh mặt trên, mặt dưới lá và toàn cây.",
            "Không tự ý phun thuốc liều cao khi chưa đối chiếu thực địa.",
        ]
        follow_up_actions = [
            "Theo dõi tốc độ lan rộng của vết bệnh trong 3-7 ngày.",
            "Ghi lại thời tiết, lịch tưới, bón phân và lần phun gần nhất.",
            "So sánh thêm với các cây xung quanh để xác định phạm vi ảnh hưởng.",
        ]
        expert_required = risk_level == "high" or low_confidence
        recheck_after_days = 3 if risk_level == "high" else 5

    safety_notes = [
        "Luôn đọc nhãn sản phẩm trước khi dùng thuốc hoặc phân bón.",
        "Mang găng tay, khẩu trang và kính bảo hộ khi xử lý cây bệnh.",
        "Không phun thuốc khi sắp mưa, gió mạnh hoặc gần nguồn nước.",
    ]

    warning = ""
    if low_confidence:
        warning = "Kết quả chưa đủ chắc chắn, nên chụp lại ảnh rõ hơn hoặc hỏi chuyên gia."

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
    }
