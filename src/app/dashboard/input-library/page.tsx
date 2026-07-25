"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { FlaskConical, Leaf, Search, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  fetchInputLibrary,
  fetchNutritionSymptoms,
  type AgriculturalInput,
  type NutritionSymptom,
} from "@/lib/farmops-client";
import { useTr } from "@/lib/use-tr";
import { useLanguageStore } from "@/store/language-store";

type Tr = (vi: string, en: string) => string;

/**
 * Same bilingual resolution as `useTr`, but readable outside of render
 * (async callbacks) so memoised handlers do not need `tr` as a dependency.
 */
function trOffRender(vi: string, en: string) {
  return useLanguageStore.getState().language === "en" ? en : vi;
}

/**
 * Backend content is Vietnamese-first: the English column is optional and is
 * empty for every row created before the bilingual rollout. Always fall back
 * to the Vietnamese value.
 */
function pickText(vi: string, en: string | null | undefined, isEnglish: boolean) {
  if (!isEnglish) return vi;
  return en && en.trim() ? en : vi;
}

function pickList(vi: string[], en: string[] | null | undefined, isEnglish: boolean) {
  if (!isEnglish) return vi;
  return en && en.length ? en : vi;
}

function categoryLabel(category: string, tr: Tr) {
  if (category === "pesticide") return tr("Thuốc BVTV", "Pesticide");
  if (category === "fertilizer") return tr("Phân bón", "Fertilizer");
  if (category === "nutrition") return tr("Dinh dưỡng", "Nutrition");
  return category;
}

function InputCard({ item, tr }: { item: AgriculturalInput; tr: Tr }) {
  const isEnglish = useLanguageStore((state) => state.language === "en");
  const name = pickText(item.name, item.name_en, isEnglish);
  const group = pickText(item.group, item.group_en, isEnglish);
  const activeIngredient = pickText(item.active_ingredient, item.active_ingredient_en, isEnglish);
  const usage = pickText(item.usage, item.usage_en, isEnglish);
  const warning = pickText(item.warning, item.warning_en, isEnglish);
  const suitableCrops = pickList(item.suitable_crops, item.suitable_crops_en, isEnglish);
  const relatedDiseases = pickList(item.related_diseases, item.related_diseases_en, isEnglish);
  const safetyNotes = pickList(item.safety_notes, item.safety_notes_en, isEnglish);

  return (
    <Card variant={item.category === "pesticide" ? "warning" : "default"} padding="lg" className="rounded-xl shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge variant={item.category === "pesticide" ? "warning" : "success"}>
            {categoryLabel(item.category, tr)}
          </Badge>
          <h3 className="mt-3 text-h3 font-bold text-ink">{name}</h3>
          <p className="mt-1 text-body-sm text-ink-soft">{group || activeIngredient}</p>
        </div>
        <FlaskConical strokeWidth={1.75} className="h-6 w-6 text-leaf-strong" />
      </div>
      <p className="mt-4 text-body-sm leading-relaxed text-ink-soft">{usage}</p>
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

function SymptomCard({ item }: { item: NutritionSymptom }) {
  const isEnglish = useLanguageStore((state) => state.language === "en");
  const nutrient = pickText(item.nutrient, item.nutrient_en, isEnglish);
  const symptom = pickText(item.symptom, item.symptom_en, isEnglish);
  const recommendation = pickText(item.recommendation, item.recommendation_en, isEnglish);
  const affectedCrops = pickList(item.affected_crops, item.affected_crops_en, isEnglish);

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
    </div>
  );
}

export default function InputLibraryPage() {
  const tr = useTr();
  const [query, setQuery] = useState("");
  const [crop, setCrop] = useState("");
  const [disease, setDisease] = useState("");
  const [category, setCategory] = useState("");
  const [items, setItems] = useState<AgriculturalInput[]>([]);
  const [symptoms, setSymptoms] = useState<NutritionSymptom[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async ({
    nextQuery,
    nextCategory,
    nextCrop,
    nextDisease,
  }: {
    nextQuery: string;
    nextCategory: string;
    nextCrop: string;
    nextDisease: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const [libraryData, symptomData] = await Promise.all([
        fetchInputLibrary({ q: nextQuery, category: nextCategory, crop: nextCrop, disease: nextDisease }),
        fetchNutritionSymptoms(nextQuery || nextCrop || nextDisease),
      ]);
      setItems(libraryData);
      setSymptoms(symptomData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : trOffRender("Không tải được thư viện vật tư.", "Could not load the input library."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load({ nextQuery: "", nextCategory: "", nextCrop: "", nextDisease: "" });
  }, [load]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load({
      nextQuery: query,
      nextCategory: category,
      nextCrop: crop,
      nextDisease: disease,
    });
  }

  return (
    <div className="fl-stagger mx-auto max-w-[1380px] space-y-6">
      <Card variant="dark" padding="lg" className="field-contours rounded-xl">
        <p className="text-overline text-on-forest-muted">{tr("Thư viện vật tư", "Input library")}</p>
        <h2 className="mt-2 text-h2 font-bold text-on-forest">
          {tr("Thuốc, phân bón và dinh dưỡng cây trồng", "Pesticides, fertilizers and crop nutrition")}
        </h2>
        <p className="mt-3 max-w-3xl text-body-sm leading-relaxed text-on-forest-muted">
          {tr(
            "Tra cứu theo cây, bệnh, hoạt chất hoặc loại vật tư. Gợi ý này chỉ là tham khảo, cần đọc nhãn và tuân thủ quy định địa phương.",
            "Search by crop, disease, active ingredient or input type. Suggestions are reference only; read labels and follow local rules.",
          )}
        </p>
      </Card>

      <Card variant="raised" padding="lg" className="rounded-xl">
        <form className="grid gap-4 xl:grid-cols-[1fr_0.8fr_0.8fr_0.7fr_auto]" onSubmit={handleSubmit}>
          <Input
            label={tr("Tìm kiếm", "Search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr("Mancozeb, đốm lá, kali...", "Mancozeb, leaf spot, potassium...")}
          />
          <Input
            label={tr("Cây trồng", "Crop")}
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
            placeholder={tr("Cà chua, táo, lúa...", "Tomato, apple, rice...")}
          />
          <Input
            label={tr("Bệnh/triệu chứng", "Disease/symptom")}
            value={disease}
            onChange={(e) => setDisease(e.target.value)}
            placeholder={tr("Đốm lá, cháy lá...", "Leaf spot, leaf blight...")}
          />
          <label className="space-y-1.5">
            <span className="text-body-sm font-semibold text-ink">{tr("Loại vật tư", "Input type")}</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 w-full rounded-md border border-line bg-surface px-3.5 text-body text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
            >
              <option value="">{tr("Tất cả", "All")}</option>
              <option value="pesticide">{tr("Thuốc BVTV", "Pesticide")}</option>
              <option value="fertilizer">{tr("Phân bón", "Fertilizer")}</option>
              <option value="nutrition">{tr("Dinh dưỡng", "Nutrition")}</option>
            </select>
          </label>
          <div className="flex items-end">
            <Button type="submit" loading={loading}>
              <Search strokeWidth={1.75} className="h-4 w-4" />
              {tr("Tìm kiếm", "Search")}
            </Button>
          </div>
        </form>
        {error ? (
          <p className="mt-4 text-body-sm text-danger-ink">
            {tr(
              "Không tìm thấy vật tư phù hợp. Thử từ khoá khác hoặc kiểm tra kết nối.",
              "No matching input found. Try another keyword or check your connection.",
            )}
          </p>
        ) : null}
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.75fr]">
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <InputCard key={item.id} item={item} tr={tr} />
          ))}
          {!items.length && !loading && !error ? (
            <Card variant="soft" padding="lg" className="rounded-xl shadow-sm">
              <p className="text-body-sm text-ink-soft">
                {tr("Chưa có vật tư phù hợp với bộ lọc hiện tại.", "No input matches the current filters yet.")}
              </p>
            </Card>
          ) : null}
          {!items.length && !loading && error ? (
            <Card variant="soft" padding="lg" className="rounded-xl shadow-sm">
              <p className="text-body-sm text-ink-soft">
                {tr("Không tìm thấy vật tư phù hợp. Thử từ khoá khác.", "No matching input found. Try another keyword.")}
              </p>
            </Card>
          ) : null}
        </div>

        <Card variant="soft" padding="lg" className="rounded-xl">
          <div className="flex items-center gap-2">
            <ShieldAlert strokeWidth={1.75} className="h-5 w-5 text-warning-ink" />
            <h3 className="text-h3 font-bold text-ink">
              {tr("Triệu chứng thiếu dinh dưỡng", "Nutrition deficiency symptoms")}
            </h3>
          </div>
          <div className="mt-5 space-y-3">
            {symptoms.map((item) => (
              <SymptomCard key={item.id} item={item} />
            ))}
            {!symptoms.length && !loading ? (
              <p className="text-body-sm text-ink-soft">
                {tr("Chưa có triệu chứng phù hợp.", "No matching symptom yet.")}
              </p>
            ) : null}
          </div>
          <p className="mt-5 border-t border-line pt-4 text-caption leading-relaxed text-ink-soft">
            {tr(
              "Lưu ý an toàn: không pha trộn vật tư khi chưa kiểm tra nhãn, không phun khi gió mạnh hoặc sắp mưa, dùng bảo hộ và tuân thủ thời gian cách ly.",
              "Safety notes: do not mix inputs before checking the labels, do not spray in strong wind or before rain, wear protective gear and respect the pre-harvest interval.",
            )}
          </p>
        </Card>
      </div>
    </div>
  );
}
