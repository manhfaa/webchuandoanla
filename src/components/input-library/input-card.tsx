"use client";

import { Clock3, FlaskConical } from "lucide-react";

import { pickList, pickText } from "@/components/input-library/bilingual";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AgriculturalInput } from "@/lib/farmops-client";
import { useTr } from "@/lib/use-tr";
import { useLanguageStore } from "@/store/language-store";

function categoryLabel(category: string, tr: (vi: string, en: string) => string) {
  if (category === "pesticide") return tr("Thuốc BVTV", "Pesticide");
  if (category === "fertilizer") return tr("Phân bón", "Fertilizer");
  if (category === "nutrition") return tr("Dinh dưỡng", "Nutrition");
  return category;
}

export function InputCard({ item }: { item: AgriculturalInput }) {
  const tr = useTr();
  const isEnglish = useLanguageStore((state) => state.language === "en");
  const isPesticide = item.category === "pesticide";
  const name = pickText(item.name, item.name_en, isEnglish);
  const group = pickText(item.group, item.group_en, isEnglish);
  const activeIngredient = pickText(item.active_ingredient, item.active_ingredient_en, isEnglish);
  const usage = pickText(item.usage, item.usage_en, isEnglish);
  const warning = pickText(item.warning, item.warning_en, isEnglish);
  const suitableCrops = pickList(item.suitable_crops, item.suitable_crops_en, isEnglish);
  const relatedDiseases = pickList(item.related_diseases, item.related_diseases_en, isEnglish);
  const safetyNotes = pickList(item.safety_notes, item.safety_notes_en, isEnglish);
  const withholding = item.withholding_period_days;

  return (
    <Card variant={isPesticide ? "warning" : "default"} padding="lg" className="rounded-xl shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isPesticide ? "warning" : "success"}>{categoryLabel(item.category, tr)}</Badge>
            {/* Pre-harvest interval is a safety constraint, so it belongs next to the name, not buried in the notes. */}
            {withholding !== null && withholding !== undefined ? (
              <Badge variant="muted" className="gap-1.5 text-warning-ink">
                <Clock3 strokeWidth={1.75} className="h-3 w-3" aria-hidden />
                {withholding > 0
                  ? tr(`Cách ly ${withholding} ngày`, `${withholding}-day pre-harvest interval`)
                  : tr("Không cần cách ly", "No pre-harvest interval")}
              </Badge>
            ) : null}
          </div>
          <h3 className="mt-3 text-h3 font-bold text-ink">{name}</h3>
          <p className="mt-1 text-body-sm text-ink-soft">{group || activeIngredient}</p>
        </div>
        <FlaskConical strokeWidth={1.75} className="h-6 w-6 text-leaf-strong" />
      </div>
      <p className="mt-4 text-body-sm leading-relaxed text-ink-soft">{usage}</p>
      {group && activeIngredient ? (
        <p className="mt-2 text-caption text-ink-soft">
          <span className="font-semibold text-ink">{tr("Hoạt chất", "Active ingredient")}: </span>
          {activeIngredient}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {suitableCrops.map((crop) => (
          <Badge key={crop} variant="muted">{crop}</Badge>
        ))}
        {relatedDiseases.map((disease) => (
          <Badge key={disease} variant="brand">{disease}</Badge>
        ))}
      </div>
      {warning ? <p className="mt-4 text-body-sm leading-relaxed text-danger-ink">{warning}</p> : null}
      {safetyNotes.length ? (
        <ul className="mt-4 space-y-1 text-caption leading-relaxed text-ink-soft">
          {safetyNotes.map((note) => (
            <li key={note}>- {note}</li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
