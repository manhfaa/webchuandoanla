export type CropPlanLabelLanguage = "vi" | "en";

const phaseLabels: Record<string, string> = {
  preparation: "Chuẩn bị",
  sowing: "Gieo trồng",
  early_care: "Chăm cây con",
  maintenance: "Chăm sóc định kỳ",
  monitoring: "Theo dõi cây",
  harvest: "Thu hoạch",
};

const phaseLabelsEn: Record<string, string> = {
  preparation: "Preparation",
  sowing: "Sowing",
  early_care: "Seedling care",
  maintenance: "Routine care",
  monitoring: "Monitoring",
  harvest: "Harvest",
};

const suitabilityLabels: Record<string, string> = {
  excellent: "Rất phù hợp",
  good: "Phù hợp",
  suitable: "Phù hợp",
  borderline: "Cần cân nhắc",
  poor: "Ít phù hợp",
  unsuitable: "Không phù hợp",
};

const suitabilityLabelsEn: Record<string, string> = {
  excellent: "Very suitable",
  good: "Suitable",
  suitable: "Suitable",
  borderline: "Needs consideration",
  poor: "Barely suitable",
  unsuitable: "Not suitable",
};

/**
 * Vietnamese by default so existing call sites keep their behaviour.
 * Pass "en" (or use the *Pair helper with `tr`) for the English label.
 */
export function getCropPhaseLabel(value: string, language: CropPlanLabelLanguage = "vi") {
  const fallback = value.replaceAll("_", " ");
  const vi = phaseLabels[value] ?? fallback;
  if (language === "en") {
    return phaseLabelsEn[value] ?? vi;
  }
  return vi;
}

export function getSuitabilityLabel(value: string, language: CropPlanLabelLanguage = "vi") {
  const key = value.toLowerCase();
  const vi = suitabilityLabels[key] ?? value;
  if (language === "en") {
    return suitabilityLabelsEn[key] ?? vi;
  }
  return vi;
}

/** Returns [vi, en] so it can be spread straight into `tr(...)`. */
export function getCropPhaseLabelPair(value: string): [string, string] {
  return [getCropPhaseLabel(value, "vi"), getCropPhaseLabel(value, "en")];
}

/** Returns [vi, en] so it can be spread straight into `tr(...)`. */
export function getSuitabilityLabelPair(value: string): [string, string] {
  return [getSuitabilityLabel(value, "vi"), getSuitabilityLabel(value, "en")];
}

/**
 * English columns the backend now stores alongside the Vietnamese content of a
 * generated crop-plan step. They are optional on purpose: rows created before
 * the bilingual planner landed have no English text at all.
 */
export interface CropPlanStepEnglishFields {
  title_en?: string | null;
  short_label_en?: string | null;
  description_en?: string | null;
  why_this_step_matters_en?: string | null;
  prerequisites_en?: string[] | null;
  tools_needed_en?: string[] | null;
  completion_condition_en?: string | null;
  risk_notes_en?: string[] | null;
  sunlight_requirement_text_en?: string | null;
}

/** Narrow a step to its optional English fields without losing the base type. */
export function cropPlanStepEnglish(step: unknown): CropPlanStepEnglishFields {
  return (step ?? {}) as CropPlanStepEnglishFields;
}

/**
 * English unit of a water/fertilizer amount, when the backend stored one.
 * Older rows only carry the Vietnamese `unit`.
 */
export function cropPlanAmountUnitEn(amount: unknown): string | null {
  const unitEn = (amount as { unit_en?: unknown } | null | undefined)?.unit_en;
  return typeof unitEn === "string" ? unitEn : null;
}

/** English text when the backend produced it, otherwise the Vietnamese value. */
export function withViFallback(vi: string, en?: string | null): string {
  const trimmed = typeof en === "string" ? en.trim() : "";
  return trimmed.length > 0 ? trimmed : vi;
}

/**
 * Same fallback rule for parallel string lists: the English list is only used
 * when it lines up with the Vietnamese one, so a partial translation can never
 * drop or reorder items.
 */
export function withViFallbackList(vi: string[], en?: string[] | null): string[] {
  if (!Array.isArray(en) || en.length !== vi.length) {
    return vi;
  }
  return vi.map((value, index) => withViFallback(value, en[index]));
}
