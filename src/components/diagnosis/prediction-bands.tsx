"use client";

import { predictionRisk, RISK_FILL, RISK_LABEL, type RiskInput } from "@/lib/disease-severity";
import { useTr } from "@/lib/use-tr";

export type BandPrediction = RiskInput & { confidence?: number };

/**
 * The candidate list, as severity bands instead of percentages.
 *
 * Two signals are encoded, and separating them is the whole point:
 *
 *   colour  = how serious the disease is, if it is that disease
 *   length  = how strongly the photo matches it
 *
 * Collapsing them into one would lie. A coffee disease the model gives six
 * percent to is genuinely serious *as a disease*, so a colour-only band paints
 * it solid red and the grower reads "the AI is sure, and it is dire". Here it
 * is a short red sliver next to a long amber bar, which is the truth: serious
 * if true, and the system does not think it is true.
 *
 * No number is printed, but the confidence is still on screen as length — the
 * product promises on its own landing page to show confidence rather than hide
 * uncertainty, and dropping it outright would make that claim false.
 */
export function PredictionBands({ predictions }: { predictions: BandPrediction[] }) {
  const tr = useTr();
  if (!predictions.length) return null;

  return (
    <ul className="space-y-2">
      {predictions.slice(0, 5).map((prediction, index) => {
        const risk = predictionRisk(prediction);
        const confidence = Math.max(0, Math.min(1, Number(prediction.confidence) || 0));
        // A 6% match still needs a visible sliver, or the row reads as "nothing".
        const width = Math.max(6, Math.round(confidence * 100));
        const label = RISK_LABEL[risk];
        const name = [prediction.plant_name, prediction.disease_name].filter(Boolean).join(" · ") ||
          prediction.class_name ||
          tr("Chưa xác định", "Unidentified");

        return (
          <li
            key={`${prediction.class_name ?? name}-${index}`}
            className="rounded-[var(--r-md)] border border-line bg-surface px-3 py-2.5"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-sm font-semibold text-ink">
                {index + 1}. {name}
              </span>
              {/* The colour is never the only carrier of meaning (WCAG 1.4.1),
                  so the severity is written out beside it. */}
              <span className="shrink-0 text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">
                {tr(label.vi, label.en)}
              </span>
            </div>
            <div
              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-soft"
              role="img"
              aria-label={tr(
                `${name}: mức độ ${label.vi}, ảnh khớp ở mức ${width} trên 100`,
                `${name}: severity ${label.en}, image match ${width} out of 100`,
              )}
            >
              <div
                className="h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
                style={{ width: `${width}%`, backgroundColor: RISK_FILL[risk] }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
