"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Leaf,
  LoaderCircle,
  MapPinned,
  Sparkles,
} from "lucide-react";

import type { CreateCropPlanPayload, CropCatalogItem, CropLocation, CropPlanPreview } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCropCatalog, fetchCropLocations, previewCropPlan, createCropPlan } from "@/lib/crop-plans-client";
import { getSuitabilityLabel } from "@/lib/crop-plan-labels";
import { useTr } from "@/lib/use-tr";
import { useSessionStore } from "@/store/session-store";

import { LocationMapPicker } from "./location-map-picker";

type WizardScreen = "crop" | "location" | "details" | "analyzing" | "preview";

const loadingStages = [
  "Đang chuẩn hóa vị trí và mùa vụ",
  "Đang tải dữ liệu khí hậu từ NASA POWER",
  "Đang đánh giá mức phù hợp của cây",
  "Đang tách thành các bước chăm sóc và nhắc việc",
];

const loadingStagesEn = [
  "Standardizing location and season",
  "Loading climate data from NASA POWER",
  "Assessing crop suitability",
  "Splitting into care steps and reminders",
];

export function CropPlanCreateWizard() {
  const router = useRouter();
  const tr = useTr();
  const { accessToken } = useSessionStore();
  const [screen, setScreen] = useState<WizardScreen>("crop");
  const [crops, setCrops] = useState<CropCatalogItem[]>([]);
  const [locations, setLocations] = useState<CropLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CropPlanPreview | null>(null);
  const [loadingIndex, setLoadingIndex] = useState(0);

  const [selectedCrop, setSelectedCrop] = useState<string>("");
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [locationName, setLocationName] = useState("Vườn nhà");
  const [locationAddress, setLocationAddress] = useState("Thủ Đức, TP.HCM");
  const [lat, setLat] = useState(10.8421);
  const [lon, setLon] = useState(106.8286);
  const [plantingMode, setPlantingMode] = useState<"pot" | "ground">("pot");
  const [areaValue, setAreaValue] = useState("6");
  const [areaUnit, setAreaUnit] = useState("m2");
  const [plantCount, setPlantCount] = useState("8");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [experienceLevel, setExperienceLevel] = useState<"beginner" | "intermediate">("beginner");
  const [planGoal, setPlanGoal] = useState<"home" | "trial" | "small_farm" | "commercial">("home");

  useEffect(() => {
    if (!accessToken) return;
    void (async () => {
      try {
        setLoading(true);
        const [cropData, locationData] = await Promise.all([
          fetchCropCatalog(accessToken),
          fetchCropLocations(accessToken),
        ]);
        setCrops(cropData);
        setLocations(locationData);
        if (cropData[0]) setSelectedCrop(cropData[0].slug);
        if (locationData[0]) {
          setSelectedLocationId(locationData[0].id);
          setLocationName(locationData[0].name);
          setLocationAddress(locationData[0].address_text);
          setLat(locationData[0].lat);
          setLon(locationData[0].lon);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : tr("Không tải được dữ liệu ban đầu.", "Could not load initial data."));
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  useEffect(() => {
    if (screen !== "analyzing") return;
    const timer = window.setInterval(() => {
      setLoadingIndex((current) => (current + 1) % loadingStages.length);
    }, 1400);
    return () => window.clearInterval(timer);
  }, [screen]);

  const activeCrop = useMemo(
    () => crops.find((crop) => crop.slug === selectedCrop) ?? null,
    [crops, selectedCrop],
  );

  const payload: CreateCropPlanPayload = {
    crop_type: selectedCrop,
    planting_mode: plantingMode,
    area_value: areaValue ? Number(areaValue) : null,
    area_unit: areaUnit,
    plant_count: Number(plantCount || 1),
    start_date: startDate,
    experience_level: experienceLevel,
    plan_goal: planGoal,
    timezone: "Asia/Ho_Chi_Minh",
    ...(selectedLocationId
      ? { location_id: selectedLocationId }
      : {
          location_name: locationName,
          lat,
          lon,
          address_text: locationAddress,
        }),
  };

  async function handlePreview() {
    if (!accessToken) return;
    try {
      setError(null);
      setSubmitting(true);
      setScreen("analyzing");
      const result = await previewCropPlan(accessToken, payload);
      setPreview(result);
      setScreen("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("Không thể tạo bản xem trước.", "Could not create preview."));
      setScreen("details");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreate() {
    if (!accessToken) return;
    try {
      setSubmitting(true);
      const created = await createCropPlan(accessToken, payload);
      router.push(`/dashboard/crop-plans/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("Không thể lưu kế hoạch.", "Could not save plan."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fl-stagger mx-auto max-w-[1320px] space-y-6">
      <Card variant="raised" padding="lg" className="field-contours rounded-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-overline text-leaf-strong">
              {tr("Kế hoạch trồng cây tự động", "Automated crop planting plan")}
            </p>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.035em] text-ink sm:text-4xl">
              {tr("Tạo lịch trồng cây theo địa điểm", "Create a location-based planting schedule")}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-soft sm:text-base">
              {tr("Chọn cây, đặt vị trí trên bản đồ, nhập quy mô canh tác và để Agromind AI tạo lịch chăm cây chi tiết theo từng bước.", "Pick a crop, set the location on the map, enter your growing scale and let Agromind AI build a detailed step-by-step care schedule.")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "crop", label: tr("1. Chọn cây", "1. Choose crop") },
              { key: "location", label: tr("2. Chọn vị trí", "2. Choose location") },
              { key: "details", label: tr("3. Thông tin trồng", "3. Planting details") },
              { key: "preview", label: tr("4. Xem trước", "4. Preview") },
            ].map((item) => (
              <span
                key={item.key}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  screen === item.key || (screen === "analyzing" && item.key === "preview")
                    ? "bg-leaf text-on-leaf"
                    : "bg-surface text-ink-soft ring-1 ring-line"
                }`}
              >
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </Card>

      {error ? (
        <Card className="rounded-lg border-danger/30 bg-danger-soft text-sm leading-7 text-danger-ink">
          {error}
        </Card>
      ) : null}

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-[220px] rounded-xl bg-surface-soft" />
          <Skeleton className="h-[220px] rounded-xl bg-surface-soft lg:col-span-2" />
        </div>
      ) : null}

      {!loading && screen === "crop" ? (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-3">
            {crops.map((crop) => (
              <button
                key={crop.id}
                type="button"
                onClick={() => setSelectedCrop(crop.slug)}
                className={`text-left ${selectedCrop === crop.slug ? "scale-[1.01]" : ""}`}
              >
                <Card variant={selectedCrop === crop.slug ? "soft" : "default"} className="h-full rounded-xl p-6 transition duration-180 hover:-translate-y-[3px] hover:border-leaf/35 hover:shadow-md">
                  <div className="flex items-start justify-between gap-4">
                    <span className="rounded-md bg-surface-soft p-3 text-leaf-strong">
                      <Leaf size={20} />
                    </span>
                    {crop.is_beginner_friendly ? (
                      <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold text-leaf-strong">
                        {tr("Dễ bắt đầu", "Easy to start")}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-6 font-display text-3xl font-bold text-ink">{crop.name}</h3>
                  <p className="mt-3 text-sm leading-7 text-ink-soft">{crop.description}</p>
                </Card>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setScreen("location")} disabled={!selectedCrop}>
              {tr("Tiếp tục", "Continue")}
              <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      ) : null}

      {!loading && screen === "location" ? (
        <div className="space-y-5">
          {locations.length ? (
            <Card variant="default" className="rounded-xl">
              <p className="text-overline text-leaf-strong">
                {tr("Khu trồng đã lưu", "Saved growing areas")}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  variant={selectedLocationId === null ? "primary" : "secondary"}
                  onClick={() => setSelectedLocationId(null)}
                >
                  {tr("Tạo khu trồng mới", "Create new growing area")}
                </Button>
                {locations.map((location) => (
                  <Button
                    key={location.id}
                    variant={selectedLocationId === location.id ? "primary" : "secondary"}
                    onClick={() => {
                      setSelectedLocationId(location.id);
                      setLocationName(location.name);
                      setLocationAddress(location.address_text);
                      setLat(location.lat);
                      setLon(location.lon);
                    }}
                  >
                    {location.name}
                  </Button>
                ))}
              </div>
            </Card>
          ) : null}

          <LocationMapPicker
            name={locationName}
            address={locationAddress}
            lat={lat}
            lon={lon}
            onNameChange={(value) => {
              setSelectedLocationId(null);
              setLocationName(value);
            }}
            onAddressChange={(value) => {
              setSelectedLocationId(null);
              setLocationAddress(value);
            }}
            onPositionChange={(nextLat, nextLon) => {
              setSelectedLocationId(null);
              setLat(nextLat);
              setLon(nextLon);
            }}
          />
          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setScreen("crop")}>
              <ArrowLeft size={16} />
              {tr("Quay lại", "Back")}
            </Button>
            <Button onClick={() => setScreen("details")}>
              {tr("Tiếp tục", "Continue")}
              <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      ) : null}

      {!loading && screen === "details" ? (
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <Card variant="raised" padding="lg" className="rounded-xl">
            <p className="text-overline text-leaf-strong">
              {tr("Thông tin trồng", "Planting details")}
            </p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-ink">{tr("Hình thức trồng", "Planting method")}</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "pot", label: tr("Trồng chậu", "In pots") },
                    { value: "ground", label: tr("Trồng đất", "In ground") },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`rounded-md px-4 py-3 text-sm font-medium transition ${
                        plantingMode === item.value
                          ? "bg-leaf text-on-leaf"
                          : "bg-surface-soft text-ink ring-1 ring-line"
                      }`}
                      onClick={() => setPlantingMode(item.value as "pot" | "ground")}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-ink">{tr("Số lượng cây", "Number of plants")}</span>
                <input
                  value={plantCount}
                  onChange={(event) => setPlantCount(event.target.value)}
                  className="w-full rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-ink">{tr("Diện tích / quy mô", "Area / scale")}</span>
                <div className="grid grid-cols-[1fr_110px] gap-3">
                  <input
                    value={areaValue}
                    onChange={(event) => setAreaValue(event.target.value)}
                    className="w-full rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                  />
                  <input
                    value={areaUnit}
                    onChange={(event) => setAreaUnit(event.target.value)}
                    className="w-full rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-ink">{tr("Ngày dự kiến bắt đầu", "Expected start date")}</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-ink">{tr("Mức kinh nghiệm", "Experience level")}</span>
                <select
                  value={experienceLevel}
                  onChange={(event) => setExperienceLevel(event.target.value as "beginner" | "intermediate")}
                  className="w-full rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                >
                  <option value="beginner">{tr("Mới bắt đầu", "Just starting out")}</option>
                  <option value="intermediate">{tr("Đã từng trồng", "Have grown before")}</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-ink">{tr("Mục tiêu vụ trồng", "Planting goal")}</span>
                <select
                  value={planGoal}
                  onChange={(event) =>
                    setPlanGoal(
                      event.target.value as "home" | "trial" | "small_farm" | "commercial",
                    )
                  }
                  className="w-full rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                >
                  <option value="home">{tr("Ăn gia đình", "Family use")}</option>
                  <option value="trial">{tr("Trồng thử", "Trial planting")}</option>
                  <option value="small_farm">{tr("Vườn nhỏ", "Small garden")}</option>
                  <option value="commercial">{tr("Canh tác nhiều hơn", "Larger scale farming")}</option>
                </select>
              </label>
            </div>
          </Card>

          <Card variant="dark" padding="lg" className="rounded-xl">
            <div className="flex items-start gap-3">
              <span className="rounded-md bg-on-forest/10 p-3 text-on-forest">
                <Sparkles size={18} />
              </span>
              <div>
                <p className="text-overline text-on-forest-muted">{tr("Tóm tắt đầu vào", "Input summary")}</p>
                <h3 className="mt-3 font-display text-2xl font-bold text-on-forest">
                  {activeCrop?.name ?? tr("Chưa chọn cây", "No crop selected")}
                </h3>
              </div>
            </div>
            <div className="mt-6 space-y-3 text-sm leading-7 text-on-forest-muted">
              <p>{tr("- Khu trồng: ", "- Growing area: ")}{selectedLocationId ? locations.find((item) => item.id === selectedLocationId)?.name : locationName}</p>
              <p>{tr("- Hình thức: ", "- Method: ")}{plantingMode === "pot" ? tr("Trồng chậu", "In pots") : tr("Trồng đất", "In ground")}</p>
              <p>{tr(`- Số lượng: ${plantCount} cây`, `- Quantity: ${plantCount} plants`)}</p>
              <p>{tr("- Bắt đầu: ", "- Start: ")}{startDate}</p>
              <p>{tr("- Hệ thống sẽ tính nhiệt độ, độ ẩm, mưa và tạo lịch nhắc việc theo từng bước.", "- The system will factor in temperature, humidity and rainfall and create a step-by-step reminder schedule.")}</p>
            </div>
          </Card>

          <div className="flex justify-between xl:col-span-2">
            <Button variant="secondary" onClick={() => setScreen("location")}>
              <ArrowLeft size={16} />
              {tr("Quay lại", "Back")}
            </Button>
            <Button onClick={handlePreview} loading={submitting}>
              {tr("Phân tích và xem trước", "Analyze and preview")}
              <Sparkles size={16} />
            </Button>
          </div>
        </div>
      ) : null}

      {screen === "analyzing" ? (
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Card variant="default" className="rounded-xl">
            <div className="flex items-start gap-3">
              <span className="rounded-md bg-surface-soft p-3 text-leaf-strong">
                <LoaderCircle size={18} className="animate-spin" />
              </span>
              <div>
                <p className="text-overline text-leaf-strong">
                  {tr("Đang phân tích", "Analyzing")}
                </p>
                <h3 className="mt-3 font-display text-2xl font-bold text-ink">
                  {tr("Agromind AI đang tạo lịch trồng phù hợp", "Agromind AI is building a suitable planting schedule")}
                </h3>
                <p className="mt-3 text-sm leading-7 text-ink-soft">
                  {tr(loadingStages[loadingIndex], loadingStagesEn[loadingIndex])}
                </p>
              </div>
            </div>
          </Card>
          <Card variant="default" className="rounded-xl">
            <div className="space-y-4">
              <Skeleton className="h-10 rounded-md bg-surface-soft" />
              <Skeleton className="h-28 rounded-lg bg-surface-soft" />
              <Skeleton className="h-28 rounded-lg bg-surface-soft" />
              <Skeleton className="h-28 rounded-lg bg-surface-soft" />
            </div>
          </Card>
        </div>
      ) : null}

      {screen === "preview" && preview ? (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <Card variant="soft" padding="lg" className="rounded-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-overline text-leaf-strong">
                    {tr("Kết quả phân tích", "Analysis result")}
                  </p>
                  <h2 className="mt-3 font-display text-3xl font-bold text-ink">
                    {preview.crop.name}{tr(" tại ", " at ")}{preview.location.name}
                  </h2>
                </div>
                <span className="rounded-full bg-surface px-4 py-2 text-sm font-semibold text-leaf-strong shadow-sm">
                  {preview.summary.suitability_score}/100
                </span>
              </div>
              <div className="mt-5 space-y-3 text-sm leading-7 text-ink-soft">
                <p>{tr("- Bắt đầu đề xuất: ", "- Recommended start: ")}{preview.summary.recommended_start_date}</p>
                <p>{tr("- Mức phù hợp: ", "- Suitability: ")}{getSuitabilityLabel(preview.summary.suitability_level)}</p>
                <p>{tr("- Phân tích: ", "- Analysis: ")}{preview.summary.reasoning_summary}</p>
              </div>
              <div className="mt-5 grid gap-3">
                {preview.summary.key_warnings.map((warning) => (
                  <div key={warning} className="rounded-md border border-sun/30 bg-sun-soft px-4 py-3 text-sm text-ink">
                    {warning}
                  </div>
                ))}
              </div>
            </Card>

            <Card variant="default" padding="lg" className="rounded-xl">
              <p className="text-overline text-leaf-strong">
                {tr("Dòng thời gian xem trước", "Preview timeline")}
              </p>
              <div className="mt-5 space-y-3">
                {preview.steps.slice(0, 6).map((step: any) => (
                  <div key={step.step_number} className="grid grid-cols-[42px_minmax(0,1fr)] gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-leaf text-sm font-semibold text-on-leaf">
                        {step.step_number}
                      </div>
                      <div className="mt-2 h-full min-h-[56px] w-[2px] rounded-full bg-line" />
                    </div>
                    <div className="rounded-lg border border-line bg-surface-soft px-4 py-3">
                      <p className="font-medium text-ink">{step.title}</p>
                      <p className="mt-1 text-sm leading-6 text-ink-soft">
                        {new Date(step.suggested_start_time).toLocaleString("vi-VN")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setScreen("details")}>
              <ArrowLeft size={16} />
              {tr("Sửa thông tin", "Edit details")}
            </Button>
            <Button onClick={handleCreate} loading={submitting}>
              {tr("Lưu và bắt đầu kế hoạch", "Save and start plan")}
              <CalendarDays size={16} />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
