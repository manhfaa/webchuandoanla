"""Chat answers, generated on the server.

Ported from `src/app/api/chat/route.ts`. The prompts are unchanged so the app and
the website give the same advice, but two things about that route do not survive
the move:

* It fell back to `buildChatApiResponse()` — a pre-written answer — whenever
  DeepSeek failed, and rendered it exactly like a model answer. Here a provider
  failure is a failure.
* It reached Django over HTTP to charge the question, then called DeepSeek
  itself. Now both happen in one place, so the charge and the answer cannot end
  up on different sides of a network split.

The two workspaces are genuinely separate. `expert` never receives the
diagnosis context, even when the caller sends `diagnosis_id`: that separation is
what the screen promises the grower ("hỏi chung, không dùng ảnh hay lịch sử
kiểm tra"), so it is enforced here rather than trusted to the client.
"""

from __future__ import annotations

from typing import Any

from aiproviders import deepseek

MODE_ASSISTANT = "assistant"
MODE_EXPERT = "expert"

# `ChatConversation.mode` has always called the diagnosis workspace "advisor".
CONVERSATION_MODE = {MODE_ASSISTANT: "advisor", MODE_EXPERT: "expert"}

_ASSISTANT_SYSTEM = " ".join(
    [
        "Bạn là trợ lý AI của Agromind AI cho người trồng cây.",
        "Trả lời bằng tiếng Việt, thân thiện nhưng không lan man.",
        "Chỉ dùng ca chẩn đoán được người dùng chọn trong lịch sử nếu bối cảnh đó được gửi kèm.",
        "Hỗ trợ hỏi đáp về kết quả CNN, triệu chứng, top bệnh khả nghi, khuyến nghị hành động và bước theo dõi tiếp theo.",
        "Không bịa kết quả CNN/YOLO hoặc kết luận bệnh ngoài dữ liệu chẩn đoán được cung cấp.",
    ]
)

_EXPERT_SYSTEM = " ".join(
    [
        "Bạn là chuyên gia nông nghiệp của Agromind AI.",
        "Trả lời bằng tiếng Việt, thực tế, có thể áp dụng cho người trồng cây ở Việt Nam.",
        "Không dựa vào CNN, YOLO hoặc lịch sử chẩn đoán của ứng dụng trong chế độ này.",
        "Tư vấn các vấn đề nông nghiệp tổng quát: đất, nước, phân bón, thời tiết, sâu bệnh, lịch chăm sóc, canh tác an toàn.",
        "Nếu thiếu thông tin, hãy hỏi thêm cây trồng, vị trí, mùa vụ, điều kiện tưới, đất và triệu chứng thực địa.",
        "Không tự nhận là bác sĩ thú y/thực vật học đang kiểm tra trực tiếp; chỉ đưa khuyến nghị tham khảo an toàn.",
    ]
)


def _text(value: Any) -> str:
    return str(value if value is not None else "").strip()


def diagnosis_context(diagnosis) -> str:
    """What the assistant workspace is allowed to know about the chosen check."""
    if diagnosis is None:
        return "Chưa có ca chẩn đoán gần nhất trong phiên."

    confidence = diagnosis.cnn_confidence or 0
    return "\n".join(
        [
            f"Cây: {_text(diagnosis.plant_name) or 'chưa rõ'}",
            f"Kết quả hiện tại: {_text(diagnosis.disease_name) or 'chưa rõ'}",
            f"Độ tin cậy: {round(float(confidence) * 100)}%",
            f"YOLO xác thực lá: {'có' if diagnosis.is_leaf else 'chưa rõ'}",
            f"Ghi chú: {_text(diagnosis.note)}",
            f"Triệu chứng: {_text(diagnosis.symptom_input)}",
        ]
    )


def answer(*, query: str, mode: str, diagnosis=None) -> str:
    """One answer from DeepSeek. Raises on failure — never returns canned text."""
    is_expert = mode == MODE_EXPERT
    user_prompt = "\n".join(
        [
            "Bối cảnh:" if is_expert else "Bối cảnh ca chẩn đoán được chọn:",
            (
                "Chế độ chuyên gia nông nghiệp độc lập, không dùng dữ liệu CNN/YOLO/lịch sử chẩn đoán."
                if is_expert
                else diagnosis_context(diagnosis)
            ),
            "",
            "Câu hỏi người dùng:",
            query,
        ]
    )

    return deepseek.complete(
        step="trả lời câu hỏi tư vấn",
        messages=[
            {"role": "system", "content": _EXPERT_SYSTEM if is_expert else _ASSISTANT_SYSTEM},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=700,
        temperature=0.35 if is_expert else 0.55,
        json_mode=False,
    )
