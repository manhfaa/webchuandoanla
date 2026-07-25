"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FilterX, FlaskConical, Search, SearchX, ShieldAlert } from "lucide-react";

import { InputCard } from "@/components/input-library/input-card";
import { SymptomCard } from "@/components/input-library/symptom-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ListSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import {
  fetchInputLibrary,
  fetchNutritionSymptoms,
  type AgriculturalInput,
  type NutritionSymptom,
} from "@/lib/farmops-client";
import { useTr } from "@/lib/use-tr";
import { useLanguageStore } from "@/store/language-store";

type Filters = { q: string; category: string; crop: string; disease: string };

const NO_FILTERS: Filters = { q: "", category: "", crop: "", disease: "" };

/**
 * Combining accent marks that NFD normalisation leaves behind, built from char
 * codes (U+0300 to U+036F) so this source line stays free of invisible characters.
 */
const COMBINING_MARKS = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, "g");

/**
 * Same bilingual resolution as `useTr`, but readable outside of render
 * (async callbacks) so memoised handlers do not need `tr` as a dependency.
 */
function trOffRender(vi: string, en: string) {
  return useLanguageStore.getState().language === "en" ? en : vi;
}

/** Fold case and Vietnamese accents so "Cà chua", "ca chua" and "CÀ CHUA" all match. */
function fold(value: string) {
  return value.toLowerCase().normalize("NFD").replace(COMBINING_MARKS, "").replace(/đ/g, "d").trim();
}

/** Each entry is one crop name, so a plain substring is precise enough here. */
function matchesCrop(needle: string, crops: string[]) {
  const folded = fold(needle);
  if (!folded) return true;
  return crops.some((crop) => fold(crop).includes(folded));
}

/**
 * Free prose, so every word of the needle must appear somewhere rather than as
 * one block: growers type "vàng lá" for a row that reads "Vàng giữa gân lá".
 */
function matchesText(needle: string, texts: Array<string | null | undefined>) {
  const words = fold(needle).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = texts.map((text) => (text ? fold(text) : "")).join(" ");
  return words.every((word) => haystack.includes(word));
}

/**
 * /api/nutrition-symptoms/ only understands `q`, which it matches against the
 * nutrient and symptom text. Feeding the crop box into `q` therefore matched
 * nothing and blanked the whole panel, so crop and disease are narrowed here
 * against the fields the rows actually carry.
 */
function narrowSymptoms(rows: NutritionSymptom[], crop: string, disease: string) {
  return rows.filter(
    (row) =>
      matchesCrop(crop, [...row.affected_crops, ...(row.affected_crops_en ?? [])]) &&
      matchesText(disease, [row.nutrient, row.nutrient_en, row.symptom, row.symptom_en]),
  );
}

function errorMessage(reason: unknown, fallback: string) {
  return reason instanceof Error && reason.message ? reason.message : fallback;
}

export default function InputLibraryPage() {
  const tr = useTr();
  const [query, setQuery] = useState("");
  const [crop, setCrop] = useState("");
  const [disease, setDisease] = useState("");
  const [category, setCategory] = useState("");
  const [applied, setApplied] = useState<Filters>(NO_FILTERS);
  const [items, setItems] = useState<AgriculturalInput[]>([]);
  const [symptoms, setSymptoms] = useState<NutritionSymptom[]>([]);
  const [loading, setLoading] = useState(true);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [symptomError, setSymptomError] = useState<string | null>(null);
  const latestRequest = useRef(0);

  const load = useCallback(async (next: Filters) => {
    const requestId = ++latestRequest.current;
    setApplied(next);
    setLoading(true);
    // Settled, not all: a failure in one panel must not blank the other.
    const [library, nutrition] = await Promise.allSettled([
      fetchInputLibrary(next),
      fetchNutritionSymptoms(next.q),
    ]);
    if (requestId !== latestRequest.current) return;

    if (library.status === "fulfilled") {
      setItems(library.value);
      setLibraryError(null);
    } else {
      setItems([]);
      setLibraryError(
        errorMessage(
          library.reason,
          trOffRender("Không tải được thư viện vật tư.", "Could not load the input library."),
        ),
      );
    }

    if (nutrition.status === "fulfilled") {
      setSymptoms(nutrition.value);
      setSymptomError(null);
    } else {
      setSymptoms([]);
      setSymptomError(
        errorMessage(
          nutrition.reason,
          trOffRender("Không tải được danh sách triệu chứng.", "Could not load the symptom list."),
        ),
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load(NO_FILTERS);
  }, [load]);

  const visibleSymptoms = useMemo(
    () => narrowSymptoms(symptoms, applied.crop, applied.disease),
    [applied.crop, applied.disease, symptoms],
  );

  /** Only these three narrow the symptom panel; the input-type select does not apply to it. */
  const appliedTerms = [applied.q, applied.crop, applied.disease].filter(Boolean);
  const hasAppliedFilters = appliedTerms.length > 0 || Boolean(applied.category);
  const canClear = hasAppliedFilters || Boolean(query.trim() || crop.trim() || disease.trim() || category);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load({ q: query.trim(), category, crop: crop.trim(), disease: disease.trim() });
  }

  function handleClearFilters() {
    setQuery("");
    setCrop("");
    setDisease("");
    setCategory("");
    void load(NO_FILTERS);
  }

  const clearFiltersAction = (
    <button
      type="button"
      onClick={handleClearFilters}
      className={buttonVariants({ variant: "secondary", size: "md" })}
    >
      {tr("Xóa bộ lọc", "Clear filters")}
    </button>
  );

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
            placeholder={tr("Gốc đồng, NPK, canxi...", "Copper-based, NPK, calcium...")}
          />
          <Input
            label={tr("Cây trồng", "Crop")}
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
            placeholder={tr("Cà chua, cà phê, lúa...", "Tomato, coffee, rice...")}
          />
          <Input
            label={tr("Bệnh/triệu chứng", "Disease/symptom")}
            value={disease}
            onChange={(e) => setDisease(e.target.value)}
            placeholder={tr("Đốm lá, vàng lá...", "Leaf spot, leaf yellowing...")}
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
          <div className="flex items-end gap-2">
            <Button type="submit" loading={loading} disabled={loading}>
              <Search strokeWidth={1.75} className="h-4 w-4" />
              {tr("Tìm kiếm", "Search")}
            </Button>
            {canClear ? (
              <Button type="button" variant="secondary" onClick={handleClearFilters} disabled={loading}>
                <FilterX strokeWidth={1.75} className="h-4 w-4" />
                {tr("Xóa bộ lọc", "Clear filters")}
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.75fr]">
        <div className="space-y-4">
          {!loading && !libraryError ? (
            <p className="text-body-sm text-ink-soft" role="status">
              {hasAppliedFilters
                ? tr(`${items.length} vật tư khớp bộ lọc`, `${items.length} inputs match your filters`)
                : tr(`${items.length} vật tư trong thư viện`, `${items.length} inputs in the library`)}
            </p>
          ) : null}

          {loading ? <ListSkeleton count={4} className="lg:grid-cols-2" itemClassName="h-[260px]" /> : null}

          {!loading && libraryError ? (
            <ErrorState
              title={tr("Chưa tải được thư viện vật tư", "Could not load the input library")}
              description={libraryError}
              onRetry={() => void load(applied)}
            />
          ) : null}

          {!loading && !libraryError && items.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {items.map((item) => (
                <InputCard key={item.id} item={item} />
              ))}
            </div>
          ) : null}

          {!loading && !libraryError && !items.length ? (
            hasAppliedFilters ? (
              <EmptyState
                icon={SearchX}
                title={tr("Không tìm thấy vật tư phù hợp", "No matching input found")}
                description={tr(
                  "Chưa có vật tư phù hợp với bộ lọc hiện tại. Thử từ khoá khác hoặc bỏ bớt bộ lọc.",
                  "No input matches the current filters yet. Try another keyword or remove some filters.",
                )}
                action={clearFiltersAction}
              />
            ) : (
              <EmptyState
                icon={FlaskConical}
                title={tr("Thư viện chưa có vật tư nào", "The library has no inputs yet")}
                description={tr(
                  "Danh mục vật tư đang được cập nhật. Bạn có thể quay lại sau hoặc hỏi thêm trong phần chat tư vấn.",
                  "The catalogue is being updated. Check back later or ask in the advisory chat.",
                )}
              />
            )
          ) : null}
        </div>

        <Card variant="soft" padding="lg" className="rounded-xl">
          <div className="flex items-center gap-2">
            <ShieldAlert strokeWidth={1.75} className="h-5 w-5 text-warning-ink" />
            <h3 className="text-h3 font-bold text-ink">
              {tr("Triệu chứng thiếu dinh dưỡng", "Nutrition deficiency symptoms")}
            </h3>
          </div>
          {appliedTerms.length ? (
            <p className="mt-2 text-caption text-ink-soft">
              {tr(`Lọc theo: ${appliedTerms.join(" · ")}`, `Filtered by: ${appliedTerms.join(" · ")}`)}
            </p>
          ) : null}
          <div className="mt-5 space-y-3">
            {loading ? <ListSkeleton count={3} itemClassName="h-[148px]" /> : null}

            {!loading && symptomError ? (
              <ErrorState
                title={tr("Chưa tải được triệu chứng", "Could not load symptoms")}
                description={symptomError}
                onRetry={() => void load(applied)}
                className="min-h-[180px]"
              />
            ) : null}

            {!loading && !symptomError
              ? visibleSymptoms.map((item) => <SymptomCard key={item.id} item={item} />)
              : null}

            {!loading && !symptomError && !visibleSymptoms.length ? (
              appliedTerms.length ? (
                <EmptyState
                  icon={SearchX}
                  title={tr("Chưa có triệu chứng phù hợp.", "No matching symptom yet.")}
                  description={tr(
                    "Không có dấu hiệu thiếu dinh dưỡng nào khớp với cây trồng hoặc triệu chứng bạn vừa nhập.",
                    "No deficiency sign matches the crop or symptom you entered.",
                  )}
                  action={clearFiltersAction}
                  className="min-h-[200px]"
                />
              ) : (
                <p className="text-body-sm text-ink-soft">
                  {tr("Danh sách triệu chứng đang được cập nhật.", "The symptom list is being updated.")}
                </p>
              )
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
