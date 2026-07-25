"use client";

import { Leaf } from "lucide-react";

import { pickList, pickText } from "@/components/input-library/bilingual";
import { Badge } from "@/components/ui/badge";
import type { NutritionSymptom } from "@/lib/farmops-client";
import { useLanguageStore } from "@/store/language-store";

export function SymptomCard({ item }: { item: NutritionSymptom }) {
  const isEnglish = useLanguageStore((state) => state.language === "en");
  const nutrient = pickText(item.nutrient, item.nutrient_en, isEnglish);
  const symptom = pickText(item.symptom, item.symptom_en, isEnglish);
  const recommendation = pickText(item.recommendation, item.recommendation_en, isEnglish);
  const affectedCrops = pickList(item.affected_crops, item.affected_crops_en, isEnglish);
  const safetyNotes = pickList(item.safety_notes, item.safety_notes_en, isEnglish);

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="flex items-center gap-2">
        <Leaf strokeWidth={1.75} className="h-4 w-4 text-leaf-strong" />
        <p className="font-semibold text-ink">{nutrient}</p>
      </div>
      <p className="mt-3 text-body-sm leading-relaxed text-ink-soft">{symptom}</p>
      <p className="mt-3 text-body-sm font-medium leading-relaxed text-leaf-strong">{recommendation}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {affectedCrops.map((crop) => (
          <Badge key={crop} variant="locked">{crop}</Badge>
        ))}
      </div>
      {safetyNotes.length ? (
        <ul className="mt-3 space-y-1 text-caption leading-relaxed text-ink-soft">
          {safetyNotes.map((note) => (
            <li key={note}>- {note}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
