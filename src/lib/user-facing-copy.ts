import { useLanguageStore } from "@/store/language-store";

const JSON_TEXT_KEYS = [
  "final_conclusion",
  "summary",
  "compatibility_summary",
  "treatment_summary",
  "best_match",
  "message",
] as const;

type Tr = (vi: string, en: string) => string;

/**
 * Same bilingual resolution as `useTr`, but readable outside of render, so the
 * client components already calling this helper do not have to thread `tr`
 * through every call site. Pass `tr` explicitly to override.
 */
const trOffRender: Tr = (vi, en) => (useLanguageStore.getState().language === "en" ? en : vi);

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

export function toUserFacingText(value: string, fallback = "", tr: Tr = trOffRender) {
  const readable = extractJsonText(value);

  const result = readable
    .replace(/Nhãn CNN(?: cuối cùng)?/gi, tr("Khả năng được chọn", "Selected possibility"))
    .replace(/Độ tin cậy CNN/gi, tr("Độ tin cậy", "Confidence"))
    .replace(/Top 5 (?:kết quả )?CNN/gi, tr("Các khả năng khác từ ảnh", "Other possibilities from the photo"))
    .replace(/DeepSeek\s*\+\s*Tavily|Tavily\s*(?:và|\/)\s*DeepSeek/gi, tr("nguồn tham khảo", "reference sources"))
    .replace(/\bDeepSeek\b|\bTavily\b/gi, tr("nguồn tham khảo", "reference sources"))
    .replace(/\bCNN\b/gi, tr("phân tích ảnh", "photo analysis"))
    .replace(/\bYOLO\b/gi, tr("kiểm tra ảnh đầu vào", "the input photo check"))
    .replace(/\b(?:backend|Django|API|pipeline)\b/gi, tr("hệ thống", "the system"))
    .replace(/^Model:\s*.*$/gim, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return result || fallback;
}
