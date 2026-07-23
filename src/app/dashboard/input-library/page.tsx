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
import { useLanguageStore } from "@/store/language-store";

const copy = {
  vi: {
    eyebrow: "Thư viện vật tư",
    title: "Thuốc, phân bón và dinh dưỡng cây trồng",
    intro: "Tra cứu theo cây, bệnh, hoạt chất hoặc loại vật tư. Gợi ý này chỉ là tham khảo, cần đọc nhãn và tuân thủ quy định địa phương.",
    search: "Tìm kiếm",
    crop: "Cây trồng",
    disease: "Bệnh/triệu chứng",
    category: "Loại vật tư",
    all: "Tất cả",
    pesticide: "Thuốc BVTV",
    fertilizer: "Phân bón",
    nutrition: "Dinh dưỡng",
    symptoms: "Triệu chứng thiếu dinh dưỡng",
    safety: "Lưu ý an toàn",
  },
  en: {
    eyebrow: "Input library",
    title: "Pesticides, fertilizers and crop nutrition",
    intro: "Search by crop, disease, active ingredient or input type. Suggestions are reference only; read labels and follow local rules.",
    search: "Search",
    crop: "Crop",
    disease: "Disease/symptom",
    category: "Input type",
    all: "All",
    pesticide: "Pesticide",
    fertilizer: "Fertilizer",
    nutrition: "Nutrition",
    symptoms: "Nutrition deficiency symptoms",
    safety: "Safety notes",
  },
};

function categoryLabel(category: string, language: "vi" | "en") {
  const labels = copy[language];
  if (category === "pesticide") return labels.pesticide;
  if (category === "fertilizer") return labels.fertilizer;
  if (category === "nutrition") return labels.nutrition;
  return category;
}

function InputCard({ item, language }: { item: AgriculturalInput; language: "vi" | "en" }) {
  return (
    <Card variant={item.category === "pesticide" ? "warning" : "default"} padding="lg" className="rounded-xl shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge variant={item.category === "pesticide" ? "warning" : "success"}>
            {categoryLabel(item.category, language)}
          </Badge>
          <h3 className="mt-3 text-h3 font-bold text-ink">{item.name}</h3>
          <p className="mt-1 text-body-sm text-ink-soft">{item.group || item.active_ingredient}</p>
        </div>
        <FlaskConical strokeWidth={1.75} className="h-6 w-6 text-leaf-strong" />
      </div>
      <p className="mt-4 text-body-sm leading-relaxed text-ink-soft">{item.usage}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {item.suitable_crops.map((crop) => (
          <Badge key={crop} variant="muted">{crop}</Badge>
        ))}
        {item.related_diseases.map((disease) => (
          <Badge key={disease} variant="brand">{disease}</Badge>
        ))}
      </div>
      {item.warning ? <p className="mt-4 text-body-sm leading-relaxed text-danger-ink">{item.warning}</p> : null}
      {item.safety_notes.length ? (
        <ul className="mt-4 space-y-1 text-caption leading-relaxed text-ink-soft">
          {item.safety_notes.map((note) => (
            <li key={note}>- {note}</li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function SymptomCard({ item }: { item: NutritionSymptom }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="flex items-center gap-2">
        <Leaf strokeWidth={1.75} className="h-4 w-4 text-leaf-strong" />
        <p className="font-semibold text-ink">{item.nutrient}</p>
      </div>
      <p className="mt-3 text-body-sm leading-relaxed text-ink-soft">{item.symptom}</p>
      <p className="mt-3 text-body-sm font-medium leading-relaxed text-leaf-strong">{item.recommendation}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {item.affected_crops.map((crop) => (
          <Badge key={crop} variant="locked">{crop}</Badge>
        ))}
      </div>
    </div>
  );
}

export default function InputLibraryPage() {
  const { language } = useLanguageStore();
  const text = copy[language];
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
      setError(err instanceof Error ? err.message : "Không tải được thư viện vật tư.");
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
        <p className="text-overline text-on-forest-muted">{text.eyebrow}</p>
        <h2 className="mt-2 text-h2 font-bold text-on-forest">{text.title}</h2>
        <p className="mt-3 max-w-3xl text-body-sm leading-relaxed text-on-forest-muted">{text.intro}</p>
      </Card>

      <Card variant="raised" padding="lg" className="rounded-xl">
        <form className="grid gap-4 xl:grid-cols-[1fr_0.8fr_0.8fr_0.7fr_auto]" onSubmit={handleSubmit}>
          <Input label={text.search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Mancozeb, đốm lá, kali..." />
          <Input label={text.crop} value={crop} onChange={(e) => setCrop(e.target.value)} placeholder="Cà chua, táo, lúa..." />
          <Input label={text.disease} value={disease} onChange={(e) => setDisease(e.target.value)} placeholder="Đốm lá, cháy lá..." />
          <label className="space-y-1.5">
            <span className="text-body-sm font-semibold text-ink">{text.category}</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 w-full rounded-md border border-line bg-surface px-3.5 text-body text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
            >
              <option value="">{text.all}</option>
              <option value="pesticide">{text.pesticide}</option>
              <option value="fertilizer">{text.fertilizer}</option>
              <option value="nutrition">{text.nutrition}</option>
            </select>
          </label>
          <div className="flex items-end">
            <Button type="submit" loading={loading}>
              <Search strokeWidth={1.75} className="h-4 w-4" />
              {text.search}
            </Button>
          </div>
        </form>
        {error ? (
          <p className="mt-4 text-body-sm text-danger-ink">
            Không tìm thấy vật tư phù hợp. Thử từ khoá khác hoặc kiểm tra kết nối.
          </p>
        ) : null}
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.75fr]">
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <InputCard key={item.id} item={item} language={language} />
          ))}
          {!items.length && !loading && !error ? (
            <Card variant="soft" padding="lg" className="rounded-xl shadow-sm">
              <p className="text-body-sm text-ink-soft">Chưa có vật tư phù hợp với bộ lọc hiện tại.</p>
            </Card>
          ) : null}
          {!items.length && !loading && error ? (
            <Card variant="soft" padding="lg" className="rounded-xl shadow-sm">
              <p className="text-body-sm text-ink-soft">Không tìm thấy vật tư phù hợp. Thử từ khoá khác.</p>
            </Card>
          ) : null}
        </div>

        <Card variant="soft" padding="lg" className="rounded-xl">
          <div className="flex items-center gap-2">
            <ShieldAlert strokeWidth={1.75} className="h-5 w-5 text-warning-ink" />
            <h3 className="text-h3 font-bold text-ink">{text.symptoms}</h3>
          </div>
          <div className="mt-5 space-y-3">
            {symptoms.map((item) => (
              <SymptomCard key={item.id} item={item} />
            ))}
            {!symptoms.length && !loading ? (
              <p className="text-body-sm text-ink-soft">Chưa có triệu chứng phù hợp.</p>
            ) : null}
          </div>
          <p className="mt-5 border-t border-line pt-4 text-caption leading-relaxed text-ink-soft">
            {text.safety}: không pha trộn vật tư khi chưa kiểm tra nhãn, không phun khi gió mạnh hoặc sắp mưa, dùng bảo hộ và tuân thủ thời gian cách ly.
          </p>
        </Card>
      </div>
    </div>
  );
}
