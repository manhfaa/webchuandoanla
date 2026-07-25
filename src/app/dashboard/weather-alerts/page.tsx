"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CloudRain,
  Compass,
  LocateFixed,
  MapPin,
  Plus,
  RefreshCcw,
  ShieldAlert,
  Sprout,
  ThermometerSun,
  Wind,
} from "lucide-react";

import {
  createFarmLocation,
  deleteFarmLocation,
  getFieldErrors,
  updateFarmLocation,
  type FarmLocationPayload,
  type FieldErrors,
} from "@/components/weather/farm-location-api";
import { SavedLocationList } from "@/components/weather/saved-location-list";
import { WeatherFreshness } from "@/components/weather/weather-freshness";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ListSkeleton, Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import {
  fetchFarmAdvisory,
  fetchFarmLocations,
  type FarmAdvisory,
  type FarmLocation,
  type WeatherDay,
} from "@/lib/farmops-client";
import { useTr } from "@/lib/use-tr";
import { useLanguageStore } from "@/store/language-store";
import { useSessionStore } from "@/store/session-store";

type Tr = (vi: string, en: string) => string;

/** A reading older than this is refetched when the tab comes back to the front. */
const REVALIDATE_AFTER_MS = 10 * 60 * 1000;

/**
 * Same bilingual resolution as `useTr`, but readable outside of render
 * (async callbacks) so memoised handlers do not need `tr` as a dependency.
 */
function trOffRender(vi: string, en: string) {
  return useLanguageStore.getState().language === "en" ? en : vi;
}

function createDefaultForm(tr: Tr) {
  return {
    name: tr("Vườn chính", "Main field"),
    province: "Lâm Đồng",
    district: "Đức Trọng",
    ward: "Hiệp An",
    address_text: tr("Khu canh tác chính", "Main growing area"),
    crop_type: tr("Cà chua", "Tomato"),
    latitude: null as number | null,
    longitude: null as number | null,
  };
}

type LocationForm = ReturnType<typeof createDefaultForm>;

function sourceLabel(source: string | undefined, tr: Tr) {
  if (source === "open_meteo") return tr("Dự báo đã cập nhật · Open-Meteo", "Forecast updated · Open-Meteo");
  return source || tr("Chưa có dữ liệu", "No data yet");
}

function riskLabel(risk: string | undefined, tr: Tr) {
  if (risk === "high") return tr("Rủi ro cao", "High risk");
  if (risk === "medium") return tr("Cần theo dõi", "Needs monitoring");
  if (risk === "low") return tr("Rủi ro thấp", "Low risk");
  return tr("Sẵn sàng", "Ready");
}

/**
 * Backend advisory text ships a Vietnamese value plus an optional `*_en` twin.
 * Older responses have no English data, so always fall back to Vietnamese.
 */
function bilingualText(vi: string | null | undefined, en: string | null | undefined, tr: Tr) {
  const viText = vi ?? "";
  return tr(viText, en || viText);
}

/** Pairs a Vietnamese list with its optional English twin, matched by index. */
function bilingualList(vi: string[] | null | undefined, en: string[] | null | undefined, tr: Tr) {
  return (vi ?? []).map((item, index) => ({
    key: `${index}-${item}`,
    text: bilingualText(item, en?.[index], tr),
  }));
}

function coordinateText(lat: number | null | undefined, lon: number | null | undefined, tr: Tr) {
  if (lat == null || lon == null) return tr("Chưa có tọa độ", "No coordinates yet");
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

/**
 * The reading time the server reports, when it reports one. Read defensively:
 * responses in the wild still ship without any timestamp, and the caller then
 * falls back to the moment the browser received the payload.
 */
function readServerFetchedAt(advisory: FarmAdvisory | null): string | null {
  if (!advisory) return null;
  const payload = advisory as unknown as Record<string, unknown>;
  const weather = payload.weather as Record<string, unknown> | undefined;
  for (const candidate of [weather?.fetched_at, weather?.observed_at, payload.fetched_at]) {
    if (typeof candidate === "string" && !Number.isNaN(Date.parse(candidate))) return candidate;
  }
  return null;
}

function addressKey(value: { province: string; district: string; ward: string; address_text: string }) {
  return [value.province, value.district, value.ward, value.address_text]
    .map((part) => (part || "").trim().toLowerCase())
    .join("|");
}

/** ~11 m of precision: enough to spot the same field saved twice. */
function coordinateKey(lat: number | null | undefined, lon: number | null | undefined) {
  if (lat == null || lon == null) return null;
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

/** The saved location this form would duplicate, if any. */
function findDuplicate(form: LocationForm, locations: FarmLocation[]) {
  const key = addressKey(form);
  const hasAddress = key.replace(/\|/g, "").length > 0;
  const name = form.name.trim().toLowerCase();
  const coordinates = coordinateKey(form.latitude, form.longitude);

  return (
    locations.find(
      (location) =>
        (hasAddress && addressKey(location) === key) ||
        location.name.trim().toLowerCase() === name ||
        (coordinates !== null && coordinateKey(location.latitude, location.longitude) === coordinates),
    ) ?? null
  );
}

/**
 * Address and coordinates of a saved location. Every partial update has to carry
 * them: the serializer re-geocodes whenever a request arrives without
 * coordinates, which drops the pin at the geographic centre of Vietnam.
 */
function locationPatchBase(location: FarmLocation): FarmLocationPayload {
  return {
    province: location.province,
    district: location.district,
    ward: location.ward,
    address_text: location.address_text,
    ...(location.latitude != null && location.longitude != null
      ? { latitude: location.latitude, longitude: location.longitude }
      : {}),
  };
}

function formPayload(form: LocationForm): FarmLocationPayload {
  return {
    name: form.name.trim(),
    province: form.province.trim(),
    district: form.district.trim(),
    ward: form.ward.trim(),
    address_text: form.address_text.trim(),
    crop_type: form.crop_type.trim(),
    ...(form.latitude != null && form.longitude != null
      ? { latitude: form.latitude, longitude: form.longitude }
      : {}),
  };
}

function WeatherMetric({ icon: Icon, label, value }: { icon: typeof ThermometerSun; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-soft p-4">
      <div className="flex items-center gap-2 text-ink-soft">
        <Icon strokeWidth={1.75} className="h-4 w-4" />
        <span className="text-caption uppercase tracking-[0.12em]">{label}</span>
      </div>
      <p className="mt-2 text-xl font-bold text-ink">{value}</p>
    </div>
  );
}

function WeatherDayCard({ day, tr }: { day: WeatherDay; tr: Tr }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4 text-ink shadow-sm">
      <p className="text-body-sm font-bold">{new Date(day.date).toLocaleDateString("vi-VN")}</p>
      <p className="mt-1 text-caption text-ink-soft">{bilingualText(day.summary, day.summary_en, tr)}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-caption text-ink-soft">
        <span>{tr("Nhiệt", "Temp")}: {day.temperature_c}°C</span>
        <span>{tr("Ẩm", "Humidity")}: {day.humidity_percent}%</span>
        <span>{tr("Mưa", "Rain")}: {day.rain_probability_percent}%</span>
        <span>{tr("Gió", "Wind")}: {day.wind_kmh} km/h</span>
      </div>
    </div>
  );
}

export default function WeatherAlertsPage() {
  const tr = useTr();
  const { accessToken } = useSessionStore();
  const loginUrl = "/login?next=/dashboard/weather-alerts";

  const loginMessage = tr(
    "Cần đăng nhập để lưu vị trí và xem cảnh báo theo khu vườn.",
    "Please sign in to save locations and view field alerts.",
  );

  const [locations, setLocations] = useState<FarmLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [editingLocationId, setEditingLocationId] = useState<number | null>(null);
  const [form, setForm] = useState(() => createDefaultForm(tr));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [duplicateOf, setDuplicateOf] = useState<FarmLocation | null>(null);
  const [advisory, setAdvisory] = useState<FarmAdvisory | null>(null);
  const [advisoryLoading, setAdvisoryLoading] = useState(false);
  const [advisoryError, setAdvisoryError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<{ iso: string; fromServer: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationNote, setLocationNote] = useState<string | null>(null);

  const cropTypeRef = useRef(form.crop_type);
  const advisoryRequestRef = useRef(0);
  const advisoryLoadingRef = useRef(false);
  const lastAttemptRef = useRef(0);
  const formPrefilledRef = useRef(false);

  useEffect(() => {
    cropTypeRef.current = form.crop_type;
  }, [form.crop_type]);

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === selectedLocationId) ?? locations[0] ?? null,
    [locations, selectedLocationId],
  );
  const editingLocation = useMemo(
    () => locations.find((location) => location.id === editingLocationId) ?? null,
    [locations, editingLocationId],
  );
  const activeLocationId = selectedLocation?.id ?? null;
  const activeCrop = selectedLocation?.crop_type ?? "";

  const applyLocationToForm = useCallback((location: FarmLocation) => {
    const fallback = createDefaultForm(trOffRender);
    setForm({
      name: location.name || fallback.name,
      province: location.province || "",
      district: location.district || "",
      ward: location.ward || "",
      address_text: location.address_text || "",
      crop_type: location.crop_type || fallback.crop_type,
      latitude: location.latitude ?? null,
      longitude: location.longitude ?? null,
    });
  }, []);

  const loadLocations = useCallback(async () => {
    if (!accessToken) {
      setLocationsLoading(false);
      return;
    }
    setLocationsLoading(true);
    try {
      const data = await fetchFarmLocations(accessToken);
      setLocations(data);
      setSelectedLocationId((current) => current ?? data[0]?.id ?? null);
      // Only the first load may fill the form: this also re-runs when the access
      // token is refreshed, and that must not overwrite what the grower is typing.
      if (!formPrefilledRef.current && data[0]) {
        formPrefilledRef.current = true;
        setEditingLocationId(data[0].id);
        applyLocationToForm(data[0]);
      }
    } finally {
      setLocationsLoading(false);
    }
  }, [accessToken, applyLocationToForm]);

  const loadAdvisory = useCallback(
    async (locationId: number, crop: string) => {
      if (!accessToken) return;
      const requestId = advisoryRequestRef.current + 1;
      advisoryRequestRef.current = requestId;
      advisoryLoadingRef.current = true;
      setAdvisoryLoading(true);
      setAdvisoryError(null);
      try {
        const data = await fetchFarmAdvisory(accessToken, locationId, crop || cropTypeRef.current);
        if (requestId !== advisoryRequestRef.current) return;
        const serverIso = readServerFetchedAt(data);
        setAdvisory(data);
        setFetchedAt({ iso: serverIso ?? new Date().toISOString(), fromServer: Boolean(serverIso) });
      } catch (err) {
        if (requestId !== advisoryRequestRef.current) return;
        // Keep whatever reading is already on screen and flag it instead of
        // blanking the cards: an empty card reads as "nothing to report here".
        setAdvisoryError(
          err instanceof Error ? err.message : trOffRender("Không tải được cảnh báo.", "Could not load the alerts."),
        );
      } finally {
        if (requestId === advisoryRequestRef.current) {
          advisoryLoadingRef.current = false;
          lastAttemptRef.current = Date.now();
          setAdvisoryLoading(false);
        }
      }
    },
    [accessToken],
  );

  useEffect(() => {
    void loadLocations().catch((err) => {
      setError(
        err instanceof Error
          ? err.message
          : trOffRender("Không tải được vị trí canh tác.", "Could not load your farm locations."),
      );
    });
  }, [loadLocations]);

  useEffect(() => {
    if (activeLocationId == null) {
      setAdvisory(null);
      setAdvisoryError(null);
      setFetchedAt(null);
      return;
    }
    // Another field (or another crop) means the reading on screen no longer applies.
    setAdvisory(null);
    setFetchedAt(null);
    void loadAdvisory(activeLocationId, activeCrop);
  }, [activeCrop, activeLocationId, loadAdvisory]);

  useEffect(() => {
    if (activeLocationId == null) return;

    const revalidate = () => {
      if (document.visibilityState !== "visible") return;
      if (advisoryLoadingRef.current) return;
      if (Date.now() - lastAttemptRef.current < REVALIDATE_AFTER_MS) return;
      void loadAdvisory(activeLocationId, activeCrop);
    };

    window.addEventListener("focus", revalidate);
    document.addEventListener("visibilitychange", revalidate);
    const timer = window.setInterval(revalidate, 60_000);
    return () => {
      window.removeEventListener("focus", revalidate);
      document.removeEventListener("visibilitychange", revalidate);
      window.clearInterval(timer);
    };
  }, [activeCrop, activeLocationId, loadAdvisory]);

  function handleRefreshAdvisory() {
    if (activeLocationId == null) return;
    void loadAdvisory(activeLocationId, activeCrop);
  }

  function updateForm(patch: Partial<LocationForm>, changedFields: string[]) {
    setForm((current) => ({ ...current, ...patch }));
    setFieldErrors((current) => {
      const next = { ...current };
      changedFields.forEach((field) => delete next[field]);
      return next;
    });
    setDuplicateOf(null);
  }

  function handleUseCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError(tr("Trình duyệt không hỗ trợ lấy vị trí hiện tại.", "This browser does not support current location."));
      return;
    }

    setLocating(true);
    setError(null);
    setLocationNote(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        setForm((current) => ({
          ...current,
          name: current.name || tr("Vị trí hiện tại", "Current location"),
          address_text: current.address_text || tr("Tọa độ GPS hiện tại", "Current GPS coordinates"),
          latitude,
          longitude,
        }));
        setLocationNote(
          tr(
            "Đã lấy tọa độ hiện tại. Bấm lưu để dùng Open-Meteo theo vị trí này.",
            "Current coordinates captured. Save to use Open-Meteo for this location.",
          ),
        );
        setLocating(false);
      },
      (geoError) => {
        const message =
          geoError.code === geoError.PERMISSION_DENIED
            ? tr("Bạn cần cho phép trình duyệt truy cập vị trí.", "You need to allow the browser to access your location.")
            : tr(
                "Không lấy được vị trí hiện tại. Bạn có thể nhập địa chỉ thủ công.",
                "Could not get your current location. You can enter the address manually.",
              );
        setError(message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  function applySaveError(err: unknown) {
    setFieldErrors(getFieldErrors(err));
    setError(err instanceof Error ? err.message : tr("Không lưu được vị trí.", "Could not save the location."));
  }

  async function createNewLocation() {
    if (!accessToken) {
      setError(loginMessage);
      return;
    }
    setSaving(true);
    setError(null);
    setFieldErrors({});
    setLocationNote(null);
    try {
      const location = await createFarmLocation(accessToken, formPayload(form));
      setLocations((current) => [location, ...current.filter((item) => item.id !== location.id)]);
      setSelectedLocationId(location.id);
      setEditingLocationId(location.id);
      applyLocationToForm(location);
      setDuplicateOf(null);
      setLocationNote(
        tr(
          "Đã lưu tọa độ. Dự báo sẽ dùng dữ liệu thật từ Open-Meteo.",
          "Coordinates saved. The forecast will use live Open-Meteo data.",
        ),
      );
    } catch (err) {
      applySaveError(err);
    } finally {
      setSaving(false);
    }
  }

  async function saveExistingLocation(target: FarmLocation) {
    if (!accessToken) {
      setError(loginMessage);
      return;
    }
    setSaving(true);
    setError(null);
    setFieldErrors({});
    setLocationNote(null);
    try {
      const updated = await updateFarmLocation(accessToken, target.id, formPayload(form));
      setLocations((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      applyLocationToForm(updated);
      setLocationNote(tr("Đã cập nhật vị trí đã lưu.", "The saved location has been updated."));
      // The advisory reloads by itself when the crop changes; an address or
      // coordinate edit keeps the same key, so ask for it explicitly.
      if (updated.id === activeLocationId && updated.crop_type === target.crop_type) {
        void loadAdvisory(updated.id, updated.crop_type);
      }
    } catch (err) {
      applySaveError(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) {
      setError(loginMessage);
      return;
    }

    if (editingLocation) {
      await saveExistingLocation(editingLocation);
      return;
    }

    const duplicate = findDuplicate(form, locations);
    if (duplicate) {
      // Saving the same field twice used to silently add another row.
      setDuplicateOf(duplicate);
      setError(null);
      setLocationNote(null);
      return;
    }
    await createNewLocation();
  }

  function handleSelectLocation(location: FarmLocation) {
    setSelectedLocationId(location.id);
    setEditingLocationId(location.id);
    applyLocationToForm(location);
    setFieldErrors({});
    setDuplicateOf(null);
    setError(null);
    setLocationNote(null);
  }

  function handleStartNewLocation() {
    setEditingLocationId(null);
    setForm(createDefaultForm(tr));
    setFieldErrors({});
    setDuplicateOf(null);
    setError(null);
    setLocationNote(
      tr(
        "Đang nhập một vị trí mới. Cảnh báo bên phải vẫn là của vị trí đang chọn.",
        "Entering a new location. The alerts on the right still belong to the selected location.",
      ),
    );
  }

  function handleEditDuplicateInstead(duplicate: FarmLocation) {
    // Keep what the grower just typed; the next submit writes it onto the saved row.
    setSelectedLocationId(duplicate.id);
    setEditingLocationId(duplicate.id);
    setDuplicateOf(null);
    setLocationNote(
      tr(
        `Đang sửa vị trí "${duplicate.name}". Bấm "Cập nhật vị trí" để lưu thay đổi.`,
        `Editing "${duplicate.name}". Press "Update location" to save the changes.`,
      ),
    );
  }

  async function handleRenameLocation(location: FarmLocation, name: string) {
    if (!accessToken) throw new Error(loginMessage);
    const updated = await updateFarmLocation(accessToken, location.id, { ...locationPatchBase(location), name });
    setLocations((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    if (editingLocationId === updated.id) applyLocationToForm(updated);
  }

  async function handleSetDefaultLocation(location: FarmLocation) {
    if (!accessToken) throw new Error(loginMessage);
    const updated = await updateFarmLocation(accessToken, location.id, {
      ...locationPatchBase(location),
      is_default: true,
    });
    // Nothing on the server unsets the previous default, and the whole app falls
    // back to the first "-is_default" row, so clear the others from here.
    const cleared = await Promise.all(
      locations
        .filter((item) => item.is_default && item.id !== updated.id)
        .map((item) => updateFarmLocation(accessToken, item.id, { ...locationPatchBase(item), is_default: false })),
    );

    const byId = new Map<number, FarmLocation>();
    byId.set(updated.id, updated);
    cleared.forEach((item) => byId.set(item.id, item));
    setLocations((current) => current.map((item) => byId.get(item.id) ?? item));
    setLocationNote(
      tr(`Đã đặt "${updated.name}" làm vị trí mặc định.`, `"${updated.name}" is now the default location.`),
    );
  }

  async function handleDeleteLocation(location: FarmLocation) {
    if (!accessToken) throw new Error(loginMessage);
    await deleteFarmLocation(accessToken, location.id);

    const remaining = locations.filter((item) => item.id !== location.id);
    setLocations(remaining);
    if (selectedLocationId === location.id || selectedLocationId == null) {
      setSelectedLocationId(remaining[0]?.id ?? null);
    }
    if (editingLocationId === location.id) {
      setEditingLocationId(remaining[0]?.id ?? null);
      if (remaining[0]) applyLocationToForm(remaining[0]);
      else setForm(createDefaultForm(tr));
    }
    setError(null);
    setLocationNote(tr(`Đã xóa vị trí "${location.name}".`, `Deleted the location "${location.name}".`));
  }

  const current = advisory?.weather.current;
  const weatherSource = advisory?.weather.source;
  const showStaleNotice = Boolean(advisoryError && advisory);
  // Responses without `is_current` carry the daily aggregate in `current` (its
  // wind is the day's maximum), so only an explicit flag counts as a live reading.
  const showsDailyAggregate =
    Boolean(current) && (current as unknown as { is_current?: boolean } | undefined)?.is_current !== true;

  const statusBadge: { variant: BadgeVariant; label: string } = (() => {
    if (advisoryError && !advisory) {
      return { variant: "danger", label: tr("Không lấy được dữ liệu", "Data unavailable") };
    }
    if (!advisory) {
      return advisoryLoading
        ? { variant: "muted", label: tr("Đang cập nhật...", "Updating...") }
        : { variant: "muted", label: tr("Chưa có dữ liệu", "No data yet") };
    }
    const risk = advisory.pest_alerts.risk_level;
    if (risk === "high") return { variant: "danger", label: riskLabel(risk, tr) };
    if (risk === "medium") return { variant: "warning", label: riskLabel(risk, tr) };
    return { variant: "success", label: riskLabel(risk, tr) };
  })();

  return (
    <div className="fl-stagger mx-auto max-w-[1380px] space-y-6">
      <Card variant="dark" padding="lg" className="field-contours rounded-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-overline text-on-forest-muted">{tr("Thời tiết & sâu bệnh", "Weather & pests")}</p>
            <h2 className="mt-2 text-h2 font-bold text-on-forest">
              {tr("Thời tiết tại vườn và việc cần chú ý", "Field alerts by real location")}
            </h2>
            <p className="mt-3 max-w-3xl text-body-sm leading-relaxed text-on-forest-muted">
              {tr(
                "Dùng vị trí hiện tại hoặc nhập khu vực trồng để xem dự báo 7 ngày, cảnh báo thời tiết và nguy cơ sâu bệnh có thể liên quan.",
                "Use your current location or enter your growing area to see the 7-day forecast, weather warnings and possible pest risks.",
              )}
            </p>
          </div>
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card variant="raised" padding="lg" className="rounded-xl">
          <div className="mb-5 rounded-lg border border-line bg-surface-soft p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-surface p-2 text-leaf-strong">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-ink">
                  {editingLocation
                    ? tr(`Đang sửa: ${editingLocation.name}`, `Editing: ${editingLocation.name}`)
                    : tr("Chọn vị trí khu vườn", "Choose your field location")}
                </p>
                <p className="mt-1 text-body-sm leading-relaxed text-ink-soft">
                  {tr(
                    "Vị trí hiện tại thường cho kết quả sát nhất. Bạn cũng có thể nhập tỉnh, huyện và xã/phường để lưu khu vực trồng.",
                    "Your current location usually gives the closest result. You can also enter province, district and ward to save the growing area.",
                  )}
                </p>
                <p className="mt-2 text-caption font-semibold text-leaf-strong">
                  {tr("Tọa độ đang chọn", "Selected coordinates")}: {coordinateText(form.latitude, form.longitude, tr)}
                </p>
              </div>
            </div>
          </div>

          <form className="space-y-4 font-sans" onSubmit={handleSubmit}>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="secondary" onClick={handleUseCurrentLocation} disabled={locating || saving}>
                <LocateFixed strokeWidth={1.75} className="h-4 w-4" />
                {locating
                  ? tr("Đang lấy vị trí...", "Getting location...")
                  : tr("Lấy vị trí hiện tại", "Use current location")}
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label={tr("Tên vị trí", "Location name")}
                value={form.name}
                error={fieldErrors.name}
                onChange={(e) => updateForm({ name: e.target.value }, ["name"])}
              />
              <Input
                label={tr("Cây trồng", "Crop")}
                value={form.crop_type}
                error={fieldErrors.crop_type}
                onChange={(e) => updateForm({ crop_type: e.target.value }, ["crop_type"])}
              />
              <Input
                label={tr("Tỉnh / thành phố", "Province")}
                value={form.province}
                error={fieldErrors.province}
                onChange={(e) =>
                  updateForm({ province: e.target.value, latitude: null, longitude: null }, ["province"])
                }
              />
              <Input
                label={tr("Huyện / quận", "District")}
                value={form.district}
                error={fieldErrors.district}
                onChange={(e) =>
                  updateForm({ district: e.target.value, latitude: null, longitude: null }, ["district"])
                }
              />
              <Input
                label={tr("Xã / phường", "Ward")}
                value={form.ward}
                error={fieldErrors.ward}
                onChange={(e) => updateForm({ ward: e.target.value, latitude: null, longitude: null }, ["ward"])}
              />
              <Input
                label={tr("Địa chỉ / ghi chú", "Address / note")}
                value={form.address_text}
                error={fieldErrors.address_text}
                onChange={(e) =>
                  updateForm({ address_text: e.target.value, latitude: null, longitude: null }, ["address_text"])
                }
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" loading={saving} disabled={saving}>
                <MapPin strokeWidth={1.75} className="h-4 w-4" />
                {editingLocation
                  ? tr("Cập nhật vị trí", "Update location")
                  : tr("Lưu vị trí & xem cảnh báo", "Save location & view alerts")}
              </Button>
              {editingLocation ? (
                <Button type="button" variant="secondary" disabled={saving} onClick={handleStartNewLocation}>
                  <Plus strokeWidth={1.75} className="h-4 w-4" />
                  {tr("Thêm vị trí mới", "Add a new location")}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                disabled={!selectedLocation || advisoryLoading}
                onClick={handleRefreshAdvisory}
              >
                <RefreshCcw strokeWidth={1.75} className="h-4 w-4" />
                {tr("Tải lại cảnh báo", "Refresh alerts")}
              </Button>
            </div>
          </form>

          {error ? <p className="mt-4 text-body-sm text-danger-ink">{error}</p> : null}

          {duplicateOf ? (
            <div className="mt-4 rounded-lg border border-sun/40 bg-sun-soft p-4">
              <p className="text-body-sm leading-relaxed text-warning-ink">
                {tr(
                  `Vị trí "${duplicateOf.name}" đã được lưu với thông tin này. Cập nhật vị trí đó thay vì tạo thêm một bản trùng?`,
                  `"${duplicateOf.name}" is already saved with these details. Update it instead of creating a duplicate?`,
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button type="button" size="sm" onClick={() => handleEditDuplicateInstead(duplicateOf)}>
                  {tr("Cập nhật vị trí đã lưu", "Update the saved location")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  loading={saving}
                  disabled={saving}
                  onClick={() => void createNewLocation()}
                >
                  {tr("Vẫn lưu thành vị trí mới", "Save as a new location anyway")}
                </Button>
              </div>
            </div>
          ) : null}

          {locationNote ? <p className="mt-4 text-body-sm font-medium text-leaf-strong">{locationNote}</p> : null}

          <SavedLocationList
            locations={locations}
            loading={locationsLoading}
            selectedId={selectedLocation?.id ?? null}
            editingId={editingLocationId}
            accessToken={accessToken}
            onSelect={handleSelectLocation}
            onRename={handleRenameLocation}
            onSetDefault={handleSetDefaultLocation}
            onDelete={handleDeleteLocation}
          />

          {!accessToken ? (
            <div className="mt-4 rounded-lg border border-danger/30 bg-danger-soft p-4">
              <p className="text-body-sm text-danger-ink">{loginMessage}</p>
              <Link
                href={loginUrl}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-md bg-leaf px-5 text-body font-medium text-on-leaf transition hover:bg-leaf-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40"
              >
                {tr("Đăng nhập", "Sign in")}
              </Link>
            </div>
          ) : null}
        </Card>

        <Card variant="default" padding="lg" className="rounded-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-overline text-leaf-strong">
                {showsDailyAggregate ? tr("Hôm nay", "Today") : tr("Hiện tại", "Current")}
              </p>
              <p className="mt-2 text-caption font-semibold text-leaf-strong">{sourceLabel(weatherSource, tr)}</p>
              {selectedLocation ? (
                <p className="mt-1 text-caption text-ink-soft">
                  {selectedLocation.name} · {coordinateText(selectedLocation.latitude, selectedLocation.longitude, tr)}
                </p>
              ) : null}
            </div>
            {weatherSource === "open_meteo" && !advisoryError ? (
              <Badge variant="success">{tr("Dữ liệu thật", "Live data")}</Badge>
            ) : null}
          </div>

          {selectedLocation && (advisory || advisoryLoading) ? (
            <div className="mt-4">
              <WeatherFreshness
                fetchedAt={fetchedAt?.iso ?? null}
                fromServer={Boolean(fetchedAt?.fromServer)}
                loading={advisoryLoading}
                onRefresh={handleRefreshAdvisory}
              />
            </div>
          ) : null}

          {showStaleNotice ? (
            <p className="mt-4 rounded-lg border border-sun/40 bg-sun-soft p-3 text-body-sm leading-relaxed text-warning-ink" role="status">
              {tr(
                "Không lấy được số liệu mới, đang hiển thị lần cập nhật gần nhất.",
                "Could not fetch a new reading; showing the most recent one.",
              )}{" "}
              {advisoryError}
            </p>
          ) : null}

          {advisoryLoading && !advisory ? (
            <div className="mt-4">
              <Skeleton className="h-8 w-2/3" />
              <div className="mt-5 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                {[0, 1, 2, 3].map((index) => (
                  <Skeleton key={index} className="h-[92px]" />
                ))}
              </div>
              <Skeleton className="mt-5 h-[76px]" />
            </div>
          ) : advisoryError && !advisory ? (
            <ErrorState
              className="mt-4"
              title={tr("Chưa lấy được dữ liệu thời tiết", "Weather data unavailable")}
              description={advisoryError}
              onRetry={handleRefreshAdvisory}
            />
          ) : current ? (
            <>
              <h3 className="mt-4 text-h2 font-bold text-ink">{bilingualText(current.summary, current.summary_en, tr)}</h3>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                <WeatherMetric icon={ThermometerSun} label={tr("Nhiệt độ", "Temperature")} value={`${current.temperature_c}°C`} />
                <WeatherMetric icon={CloudRain} label={tr("Mưa", "Rain")} value={`${current.rain_probability_percent}%`} />
                <WeatherMetric icon={Sprout} label={tr("Độ ẩm", "Humidity")} value={`${current.humidity_percent}%`} />
                <WeatherMetric icon={Wind} label={tr("Gió", "Wind")} value={`${current.wind_kmh} km/h`} />
              </div>
              {showsDailyAggregate ? (
                <p className="mt-3 text-caption leading-relaxed text-ink-soft">
                  {tr(
                    "Đây là số liệu tổng hợp cả ngày, không phải số đo ngay lúc này.",
                    "These are whole-day figures, not a reading taken right now.",
                  )}
                </p>
              ) : null}
              <p className="mt-5 rounded-lg border border-line bg-surface-soft p-4 text-body-sm leading-relaxed text-ink-soft">
                {bilingualText(advisory?.weather.message, advisory?.weather.message_en, tr)}
              </p>
            </>
          ) : (
            <p className="mt-3 text-body-sm text-ink-soft">
              {tr(
                "Chưa có dữ liệu. Hãy lấy vị trí hiện tại hoặc nhập địa chỉ rồi bấm lưu.",
                "No data yet. Get your current location or enter an address, then save.",
              )}
            </p>
          )}
        </Card>
      </div>

      {advisoryLoading && !advisory ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card variant="default" padding="lg" className="rounded-xl shadow-sm">
            <p className="text-overline text-leaf-strong">{tr("Dự báo 3 ngày", "3-day forecast")}</p>
            <ListSkeleton count={3} itemClassName="h-[110px]" className="mt-4 md:grid-cols-3" />
          </Card>
          <Card variant="default" padding="lg" className="rounded-xl shadow-sm">
            <p className="text-overline text-leaf-strong">{tr("Dự báo 7 ngày", "7-day forecast")}</p>
            <ListSkeleton count={4} itemClassName="h-[110px]" className="mt-4 md:grid-cols-2" />
          </Card>
        </div>
      ) : advisory ? (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <Card variant="default" padding="lg" className="rounded-xl shadow-sm">
              <p className="text-overline text-leaf-strong">{tr("Dự báo 3 ngày", "3-day forecast")}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {advisory.weather.forecast_3d.map((day) => (
                  <WeatherDayCard key={day.date} day={day} tr={tr} />
                ))}
              </div>
            </Card>
            <Card variant="default" padding="lg" className="rounded-xl shadow-sm">
              <p className="text-overline text-leaf-strong">{tr("Dự báo 7 ngày", "7-day forecast")}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {advisory.weather.forecast_7d.map((day) => (
                  <WeatherDayCard key={day.date} day={day} tr={tr} />
                ))}
              </div>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card variant="warning" padding="lg" className="rounded-xl">
              <div className="flex items-center gap-2 text-ink">
                <ShieldAlert strokeWidth={1.75} className="h-5 w-5 text-warning-ink" />
                <h3 className="text-h3 font-bold">{tr("Cảnh báo thời tiết", "Weather warnings")}</h3>
              </div>
              <ul className="mt-4 space-y-3 text-body-sm leading-relaxed text-ink-soft">
                {(advisory.weather.warnings.length
                  ? bilingualList(advisory.weather.warnings, advisory.weather.warnings_en, tr)
                  : [
                      {
                        key: "no-warning",
                        text: tr(
                          "Chưa có cảnh báo thời tiết nghiêm trọng.",
                          "No severe weather warning in the current data.",
                        ),
                      },
                    ]
                ).map((item) => (
                  <li key={item.key}>- {item.text}</li>
                ))}
              </ul>
            </Card>

            <Card variant="default" padding="lg" className="rounded-xl">
              <h3 className="text-h3 font-bold text-ink">{tr("Cảnh báo sâu bệnh", "Pest alerts")}</h3>
              <div className="mt-4 space-y-3">
                {advisory.pest_alerts.alerts.length ? (
                  advisory.pest_alerts.alerts.map((alert) => (
                    <div key={alert.title} className="rounded-lg border border-line bg-surface-soft p-3">
                      <p className="font-semibold text-ink">{bilingualText(alert.title, alert.title_en, tr)}</p>
                      <p className="mt-1 text-body-sm leading-relaxed text-ink-soft">
                        {bilingualText(alert.description, alert.description_en, tr)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-body-sm text-ink-soft">
                    {tr(
                      "Chưa có cảnh báo sâu bệnh nổi bật cho dữ liệu hiện tại.",
                      "No major pest alert in the current data.",
                    )}
                  </p>
                )}
              </div>
            </Card>

            <Card variant="soft" padding="lg" className="rounded-xl">
              <h3 className="text-h3 font-bold text-ink">{tr("Gợi ý thao tác hôm nay", "Today actions")}</h3>
              <ul className="mt-4 space-y-3 text-body-sm leading-relaxed text-ink-soft">
                {bilingualList(advisory.recommendations, advisory.recommendations_en, tr).map((item) => (
                  <li key={item.key}>- {item.text}</li>
                ))}
              </ul>
              <p className="mt-5 border-t border-line pt-4 text-caption leading-relaxed text-ink-soft">
                {tr("Lưu ý an toàn", "Safety note")}: {bilingualText(advisory.disclaimer, advisory.disclaimer_en, tr)}
              </p>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
