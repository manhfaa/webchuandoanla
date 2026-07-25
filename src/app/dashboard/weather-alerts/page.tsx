"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CloudRain,
  Compass,
  LocateFixed,
  MapPin,
  RefreshCcw,
  ShieldAlert,
  Sprout,
  ThermometerSun,
  Wind,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createFarmLocation,
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
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [form, setForm] = useState(() => createDefaultForm(tr));
  const [advisory, setAdvisory] = useState<FarmAdvisory | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const cropTypeRef = useRef(form.crop_type);

  useEffect(() => {
    cropTypeRef.current = form.crop_type;
  }, [form.crop_type]);

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === selectedLocationId) ?? locations[0] ?? null,
    [locations, selectedLocationId],
  );

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
    if (!accessToken) return;
    const data = await fetchFarmLocations(accessToken);
    setLocations(data);
    if (data[0]) {
      setSelectedLocationId(data[0].id);
      applyLocationToForm(data[0]);
    }
  }, [accessToken, applyLocationToForm]);

  const loadAdvisory = useCallback(async (location: FarmLocation) => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFarmAdvisory(accessToken, location.id, location.crop_type || cropTypeRef.current);
      setAdvisory(data);
    } catch (err) {
      setAdvisory(null);
      setError(err instanceof Error ? err.message : trOffRender("Không tải được cảnh báo.", "Could not load the alerts."));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

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
    if (selectedLocation) {
      void loadAdvisory(selectedLocation);
    }
  }, [loadAdvisory, selectedLocation]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) {
      setError(loginMessage);
      return;
    }

    setLoading(true);
    setError(null);
    setLocationNote(null);
    try {
      const location = await createFarmLocation(accessToken, {
        ...form,
        latitude: form.latitude ?? undefined,
        longitude: form.longitude ?? undefined,
      });
      setLocations((current) => [location, ...current.filter((item) => item.id !== location.id)]);
      setSelectedLocationId(location.id);
      applyLocationToForm(location);
      await loadAdvisory(location);
      setLocationNote(
        tr(
          "Đã lưu tọa độ. Dự báo sẽ dùng dữ liệu thật từ Open-Meteo.",
          "Coordinates saved. The forecast will use live Open-Meteo data.",
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("Không lưu được vị trí.", "Could not save the location."));
    } finally {
      setLoading(false);
    }
  }

  const current = advisory?.weather.current;
  const weatherSource = advisory?.weather.source;

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
          <Badge variant={advisory?.pest_alerts.risk_level === "high" ? "warning" : "success"}>
            {riskLabel(advisory?.pest_alerts.risk_level, tr)}
          </Badge>
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
                <p className="font-bold text-ink">{tr("Chọn vị trí khu vườn", "Choose your field location")}</p>
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
              <Button type="button" variant="secondary" onClick={handleUseCurrentLocation} disabled={locating || loading}>
                <LocateFixed strokeWidth={1.75} className="h-4 w-4" />
                {locating
                  ? tr("Đang lấy vị trí...", "Getting location...")
                  : tr("Lấy vị trí hiện tại", "Use current location")}
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input label={tr("Tên vị trí", "Location name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input label={tr("Cây trồng", "Crop")} value={form.crop_type} onChange={(e) => setForm({ ...form, crop_type: e.target.value })} />
              <Input label={tr("Tỉnh / thành phố", "Province")} value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value, latitude: null, longitude: null })} />
              <Input label={tr("Huyện / quận", "District")} value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value, latitude: null, longitude: null })} />
              <Input label={tr("Xã / phường", "Ward")} value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value, latitude: null, longitude: null })} />
              <Input label={tr("Địa chỉ / ghi chú", "Address / note")} value={form.address_text} onChange={(e) => setForm({ ...form, address_text: e.target.value, latitude: null, longitude: null })} />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" loading={loading}>
                <MapPin strokeWidth={1.75} className="h-4 w-4" />
                {tr("Lưu vị trí & xem cảnh báo", "Save location & view alerts")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!selectedLocation || loading}
                onClick={() => selectedLocation && void loadAdvisory(selectedLocation)}
              >
                <RefreshCcw strokeWidth={1.75} className="h-4 w-4" />
                {tr("Tải lại cảnh báo", "Refresh alerts")}
              </Button>
            </div>
          </form>

          {locations.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {locations.map((location) => (
                <button
                  key={location.id}
                  type="button"
                  onClick={() => {
                    setSelectedLocationId(location.id);
                    applyLocationToForm(location);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-body-sm transition ${
                    selectedLocationId === location.id
                      ? "border-leaf/40 bg-surface-soft text-leaf-strong"
                      : "border-line bg-surface text-ink-soft hover:bg-surface-soft"
                  }`}
                  title={coordinateText(location.latitude, location.longitude, tr)}
                >
                  {location.name} · {location.crop_type || tr("Cây trồng", "Crop")}
                </button>
              ))}
            </div>
          ) : null}

          {locationNote ? <p className="mt-4 text-body-sm font-medium text-leaf-strong">{locationNote}</p> : null}
          {error ? <p className="mt-4 text-body-sm text-danger-ink">{error}</p> : null}

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
              <p className="text-overline text-leaf-strong">{tr("Hiện tại", "Current")}</p>
              <p className="mt-2 text-caption font-semibold text-leaf-strong">{sourceLabel(weatherSource, tr)}</p>
              {selectedLocation ? (
                <p className="mt-1 text-caption text-ink-soft">
                  {selectedLocation.name} · {coordinateText(selectedLocation.latitude, selectedLocation.longitude, tr)}
                </p>
              ) : null}
            </div>
            {weatherSource === "open_meteo" ? (
              <Badge variant="success">{tr("Dữ liệu thật", "Live data")}</Badge>
            ) : null}
          </div>

          {current ? (
            <>
              <h3 className="mt-4 text-h2 font-bold text-ink">{bilingualText(current.summary, current.summary_en, tr)}</h3>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                <WeatherMetric icon={ThermometerSun} label={tr("Nhiệt độ", "Temperature")} value={`${current.temperature_c}°C`} />
                <WeatherMetric icon={CloudRain} label={tr("Mưa", "Rain")} value={`${current.rain_probability_percent}%`} />
                <WeatherMetric icon={Sprout} label={tr("Độ ẩm", "Humidity")} value={`${current.humidity_percent}%`} />
                <WeatherMetric icon={Wind} label={tr("Gió", "Wind")} value={`${current.wind_kmh} km/h`} />
              </div>
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

      {advisory ? (
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
                {advisory.weather.forecast_7d.slice(0, 6).map((day) => (
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
