const JSON_TEXT_KEYS = [
  "final_conclusion",
  "summary",
  "compatibility_summary",
  "treatment_summary",
  "best_match",
  "message",
] as const;

function extractJsonText(value: string) {
  const cleaned = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) return cleaned;

  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return cleaned;

    const parts = JSON_TEXT_KEYS.flatMap((key) => {
      const entry = parsed[key];
      return typeof entry === "string" && entry.trim() ? [entry.trim()] : [];
    });

    return parts.length ? [...new Set(parts)].join(" ") : cleaned;
  } catch {
    return cleaned;
  }
}

export function toUserFacingText(value: string, fallback = "") {
  const readable = extractJsonText(value);

  const result = readable
    .replace(/Nhãn CNN(?: cuối cùng)?/gi, "Khả năng được chọn")
    .replace(/Độ tin cậy CNN/gi, "Độ tin cậy")
    .replace(/Top 5 (?:kết quả )?CNN/gi, "Các khả năng khác từ ảnh")
    .replace(/DeepSeek\s*\+\s*Tavily|Tavily\s*(?:và|\/)\s*DeepSeek/gi, "nguồn tham khảo")
    .replace(/\bDeepSeek\b|\bTavily\b/gi, "nguồn tham khảo")
    .replace(/\bCNN\b/gi, "phân tích ảnh")
    .replace(/\bYOLO\b/gi, "kiểm tra ảnh đầu vào")
    .replace(/\b(?:backend|Django|API|pipeline)\b/gi, "hệ thống")
    .replace(/^Model:\s*.*$/gim, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return result || fallback;
}
