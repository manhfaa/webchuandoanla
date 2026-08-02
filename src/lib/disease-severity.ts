import { normalizeCropKey } from "@/lib/crop-filter";

/**
 * How serious a disease is if the photo really is that disease.
 *
 * IMPORTANT: this is not the model's confidence and must never be presented as
 * if it were. The CNN outputs how strongly an image matches a class; the risk
 * below comes from a hand-written keyword table over the disease name. A
 * candidate the model barely believes in can still carry a high risk, so any UI
 * that shows risk has to show the confidence beside it or it will read as
 * "the AI is certain and this is dire" when the AI is nothing of the sort.
 */
export type DiseaseRisk = "healthy" | "low" | "medium" | "high";

const RULES: { risk: DiseaseRisk; keywords: string[] }[] = [
  { risk: "healthy", keywords: ["healthy", "khoe"] },
  // Blight and rot kill tissue outright; virus and curl cannot be cured in the
  // field and spread through the plot. These are the ones worth alarming about.
  { risk: "high", keywords: ["blight", "chay", "scorch"] },
  { risk: "high", keywords: ["rot", "thoi", "black"] },
  { risk: "high", keywords: ["virus", "curl", "mosaic", "yellow"] },
  { risk: "medium", keywords: ["spot", "scab", "septoria", "dom"] },
  { risk: "medium", keywords: ["mildew", "mold", "phan", "moc"] },
  { risk: "medium", keywords: ["rust", "gi"] },
  { risk: "medium", keywords: ["mite", "spider", "nhen"] },
];

export type RiskInput = {
  class_name?: string;
  plant_name?: string;
  disease_name?: string;
  plant_name_en?: string;
  disease_name_en?: string;
};

/**
 * Mirrors the ordering used by the diagnosis page's own guidance table, so the
 * band beside a candidate and the action plan for the chosen one never disagree
 * about how serious the same disease is.
 */
export function predictionRisk(prediction: RiskInput): DiseaseRisk {
  const text = normalizeCropKey(
    [
      prediction.class_name,
      prediction.plant_name,
      prediction.disease_name,
      prediction.plant_name_en,
      prediction.disease_name_en,
    ]
      .filter(Boolean)
      .join(" "),
  );

  for (const rule of RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) return rule.risk;
  }
  // Unrecognised disease names are still something to look at, never "fine".
  return "medium";
}

export const RISK_LABEL: Record<DiseaseRisk, { vi: string; en: string }> = {
  healthy: { vi: "Khỏe", en: "Healthy" },
  low: { vi: "Nhẹ", en: "Mild" },
  medium: { vi: "Cần theo dõi", en: "Watch" },
  high: { vi: "Nặng", en: "Serious" },
};

/**
 * Band colour. Healthy is green on purpose: painting every row on a red scale
 * would make a clean leaf look like an emergency, which is the opposite of what
 * the grower needs to read at a glance.
 *
 * These are full colour values rather than Tailwind classes with an opacity
 * modifier, because every colour token in tailwind.config.ts is a bare
 * `var(--token)` with no <alpha-value> — `bg-danger/70` compiles to invalid CSS
 * and disappears.
 */
export const RISK_FILL: Record<DiseaseRisk, string> = {
  healthy: "var(--leaf)",
  low: "color-mix(in srgb, var(--sun) 70%, var(--leaf))",
  medium: "var(--sun)",
  high: "var(--danger)",
};
