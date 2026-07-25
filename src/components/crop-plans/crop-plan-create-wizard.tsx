"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Leaf,
  LoaderCircle,
  Plus,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";

import type { CreateCropPlanPayload, CropCatalogItem, CropLocation, CropPlanPreview } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchCropCatalog,
  fetchCropLocations,
  previewCropPlan,
  createCropPlan,
  deleteCropLocation,
  updateCropLocation,
  type ClimateConfidence,
} from "@/lib/crop-plans-client";
import { getSuitabilityLabel, withViFallback } from "@/lib/crop-plan-labels";
import { useTr } from "@/lib/use-tr";
import { useSessionStore } from "@/store/session-store";

import { ConfirmDialog } from "./confirm-dialog";
import { climateConfidenceLabel, climateConfidenceNote } from "./crop-plan-status";
import { LocationMapPicker } from "./location-map-picker";

/** Fields the preview endpoint returns on top of the shared CropPlanPreview type. */
type PreviewSummaryExtras = {
  suitability_score: number | null;
  climate_confidence?: ClimateConfidence;
  key_warnings_en?: string[];
  reasoning_summary_en?: string;
};

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
  const [locationBusy, setLocationBusy] = useState(false);
  const [deletingLocation, setDeletingLocation] = useState<CropLocation | null>(null);

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

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === selectedLocationId) ?? null,
    [locations, selectedLocationId],
  );

  // Dragging the pin used to silently drop the selection and mint a duplicate
  // area on save; now the difference is shown and the grower decides.
  const hasLocationEdits = Boolean(
    selectedLocation &&
      (selectedLocation.name !== locationName ||
        (selectedLocation.address_text ?? "") !== locationAddress ||
        Math.abs(selectedLocation.lat - lat) > 1e-6 ||
        Math.abs(selectedLocation.lon - lon) > 1e-6),
  );

  function applySavedLocation(location: CropLocation) {
    setSelectedLocationId(location.id);
    setLocationName(location.name);
    setLocationAddress(location.address_text ?? "");
    setLat(location.lat);
    setLon(location.lon);
  }

  function startNewLocation() {
    setSelectedLocationId(null);
  }

  async function refreshLocations() {
    if (!accessToken) return [] as CropLocation[];
    const data = await fetchCropLocations(accessToken);
    setLocations(data);
    return data;
  }

  async function handleUpdateSelectedLocation() {
    if (!accessToken || !selectedLocation) return;
    try {
      setLocationBusy(true);
      setError(null);
      const updated = await updateCropLocation(accessToken, selectedLocation.id, {
        name: locationName,
        address_text: locationAddress,
        lat,
        lon,
      });
      await refreshLocations();
      applySavedLocation(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("Không cập nhật được khu trồng.", "Could not update the growing area."));
    } finally {
      setLocationBusy(false);
    }
  }

  async function handleSetDefaultLocation(location: CropLocation) {
    if (!accessToken) return;
    try {
      setLocationBusy(true);
      setError(null);
      await updateCropLocation(accessToken, location.id, { is_default: true });
      await refreshLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("Không đặt được khu trồng mặc định.", "Could not set the default growing area."));
    } finally {
      setLocationBusy(false);
    }
  }

  async function handleDeleteLocation() {
    if (!accessToken || !deletingLocation) return;
    try {
      setLocationBusy(true);
      setError(null);
      await deleteCropLocation(accessToken, deletingLocation.id);
      const remaining = await refreshLocations();
      if (selectedLocationId === deletingLocation.id) {
        if (remaining[0]) {
          applySavedLocation(remaining[0]);
        } else {
          startNewLocation();
        }
      }
      setDeletingLocation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("Không xóa được khu trồng.", "Could not delete the growing area."));
      setDeletingLocation(null);
    } finally {
      setLocationBusy(false);
    }
  }

  const previewSummary = (preview?.summary ?? {}) as CropPlanPreview["summary"] & PreviewSummaryExtras;
  const previewConfidenceLabel = climateConfidenceLabel(previewSummary.climate_confidence ?? "");
  const previewConfidenceNote = climateConfidenceNote(previewSummary.climate_confidence ?? "");

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
    const parsedCount = Number(plantCount);
    if (!Number.isInteger(parsedCount) || parsedCount < 1) {
      setError(tr("Số lượng cây phải là số nguyên từ 1 trở lên.", "The number of plants must be a whole number of at least 1."));
      return;
    }
    if (areaValue && (!Number.isFinite(Number(areaValue)) || Number(areaValue) < 0)) {
      setError(tr("Diện tích phải là số không âm.", "The area must be a number that is not negative."));
      return;
    }
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
                  <h3 className="mt-6 font-display text-3xl font-bold text-ink">{tr(crop.name, withViFallback(crop.name, crop.name_en))}</h3>
                  <p className="mt-3 text-sm leading-7 text-ink-soft">{tr(crop.description, withViFallback(crop.description, crop.description_en))}</p>
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-overline text-leaf-strong">
                  {tr("Khu trồng đã lưu", "Saved growing areas")}
                </p>
                <Button
                  size="sm"
                  variant={selectedLocationId === null ? "primary" : "secondary"}
                  onClick={startNewLocation}
                  disabled={locationBusy}
                >
                  <Plus size={14} />
                  {tr("Tạo khu trồng mới", "Create new growing area")}
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                {locations.map((location) => (
                  <div
                    key={location.id}
                    className={`rounded-lg border p-4 ${
                      selectedLocationId === location.id ? "border-leaf/45 bg-surface-soft" : "border-line bg-surface"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <button type="button" className="text-left" onClick={() => applySavedLocation(location)}>
                        <span className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                          {location.name}
                          {location.is_default ? (
                            <span className="rounded-full bg-surface-soft px-2 py-0.5 text-xs font-medium text-leaf-strong">
                              {tr("Mặc định", "Default")}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block text-sm text-ink-soft">
                          {location.address_text || `${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}`}
                        </span>
                      </button>
                      <div className="flex flex-wrap gap-2">
                        {!location.is_default ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => void handleSetDefaultLocation(location)}
                            disabled={locationBusy}
                          >
                            <Star size={14} />
                            {tr("Đặt mặc định", "Set as default")}
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setDeletingLocation(location)}
                          disabled={locationBusy}
                        >
                          <Trash2 size={14} />
                          {tr("Xóa", "Delete")}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <LocationMapPicker
            name={locationName}
            address={locationAddress}
            lat={lat}
            lon={lon}
            onNameChange={setLocationName}
            onAddressChange={setLocationAddress}
            onPositionChange={(nextLat, nextLon) => {
              setLat(nextLat);
              setLon(nextLon);
            }}
          />

          {selectedLocation && hasLocationEdits ? (
            <Card variant="warning" className="rounded-xl">
              <p className="text-sm leading-7 text-ink">
                {tr(
                  `Bạn vừa sửa khu trồng đã lưu “${selectedLocation.name}”. Chọn cập nhật khu trồng đó, hoặc lưu thành khu trồng mới để giữ nguyên bản cũ.`,
                  `You have edited the saved area "${selectedLocation.name}". Update that area, or keep the original and save this as a new one.`,
                )}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button onClick={() => void handleUpdateSelectedLocation()} loading={locationBusy} disabled={locationBusy}>
                  {tr("Cập nhật khu trồng này", "Update this area")}
                </Button>
                <Button variant="secondary" onClick={startNewLocation} disabled={locationBusy}>
                  {tr("Lưu thành khu trồng mới", "Save as a new area")}
                </Button>
                <Button variant="tertiary" onClick={() => applySavedLocation(selectedLocation)} disabled={locationBusy}>
                  {tr("Hoàn tác thay đổi", "Undo changes")}
                </Button>
              </div>
            </Card>
          ) : null}
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
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={plantCount}
                  onChange={(event) => setPlantCount(event.target.value)}
                  className="w-full rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-ink">{tr("Diện tích / quy mô", "Area / scale")}</span>
                <div className="grid grid-cols-[1fr_110px] gap-3">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
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
                    {tr(preview.crop.name, withViFallback(preview.crop.name, preview.crop.name_en))}{tr(" tại ", " at ")}{preview.location.name}
                  </h2>
                </div>
                <span className="rounded-full bg-surface px-4 py-2 text-sm font-semibold text-leaf-strong shadow-sm">
                  {previewSummary.suitability_score === null
                    ? tr("Chưa chấm điểm", "Not scored")
                    : `${previewSummary.suitability_score}/100`}
                </span>
              </div>
              <div className="mt-5 space-y-3 text-sm leading-7 text-ink-soft">
                <p>{tr("- Bắt đầu đề xuất: ", "- Recommended start: ")}{preview.summary.recommended_start_date}</p>
                <p>{tr("- Mức phù hợp: ", "- Suitability: ")}{getSuitabilityLabel(preview.summary.suitability_level)}</p>
                <p>
                  {tr("- Phân tích: ", "- Analysis: ")}
                  {tr(
                    preview.summary.reasoning_summary,
                    withViFallback(preview.summary.reasoning_summary, previewSummary.reasoning_summary_en),
                  )}
                </p>
                {previewConfidenceLabel ? (
                  <p>{tr("- Nguồn đánh giá: ", "- Assessment basis: ")}{tr(...previewConfidenceLabel)}</p>
                ) : null}
              </div>
              {previewConfidenceNote ? (
                <p className="mt-4 rounded-md border border-line bg-surface px-4 py-3 text-sm leading-6 text-ink-soft">
                  {tr(...previewConfidenceNote)}
                </p>
              ) : null}
              <div className="mt-5 grid gap-3">
                {preview.summary.key_warnings.map((warning, index) => (
                  <div key={warning} className="rounded-md border border-sun/30 bg-sun-soft px-4 py-3 text-sm text-ink">
                    {tr(warning, withViFallback(warning, previewSummary.key_warnings_en?.[index]))}
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

      <ConfirmDialog
        open={deletingLocation !== null}
        danger
        title={tr("Xóa khu trồng này?", "Delete this growing area?")}
        description={
          deletingLocation
            ? tr(
                `“${deletingLocation.name}” sẽ bị xóa khỏi danh sách khu trồng đã lưu.`,
                `"${deletingLocation.name}" will be removed from your saved growing areas.`,
              )
            : ""
        }
        consequences={[
          tr(
            "Nếu còn kế hoạch đang dùng khu trồng này, hệ thống sẽ từ chối xóa và cho bạn biết kế hoạch nào.",
            "If any plan still uses this area, the deletion is refused and you are told which plans they are.",
          ),
          tr("Dữ liệu thời tiết đã lưu cho khu trồng này cũng sẽ bị xóa.", "The saved weather data for this area is removed too."),
        ]}
        confirmLabel={tr("Xóa khu trồng", "Delete area")}
        pending={locationBusy}
        onConfirm={() => void handleDeleteLocation()}
        onCancel={() => setDeletingLocation(null)}
      />
    </div>
  );
}
