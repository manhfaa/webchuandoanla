"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
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
import { useLanguageStore } from "@/store/language-store";
import { useSessionStore } from "@/store/session-store";

const copy = {
  vi: {
    eyebrow: "Thời tiết & sâu bệnh",
    title: "Cảnh báo theo vị trí thực tế",
    intro:
      "Lấy vị trí hiện tại bằng GPS hoặc nhập địa chỉ thủ công. Khi có tọa độ, hệ thống dùng Open-Meteo để lấy dự báo thật 7 ngày và suy luận rủi ro sâu bệnh.",
    locationName: "Tên vị trí",
    province: "Tỉnh / thành phố",
    district: "Huyện / quận",
    ward: "Xã / phường",
    address: "Địa chỉ / ghi chú",
    crop: "Cây trồng",
    submit: "Lưu vị trí & xem cảnh báo",
    refresh: "Tải lại cảnh báo",
    useCurrent: "Lấy vị trí hiện tại",
    current: "Hiện tại",
    forecast3: "Dự báo 3 ngày",
    forecast7: "Dự báo 7 ngày",
    warnings: "Cảnh báo thời tiết",
    pest: "Cảnh báo sâu bệnh",
    recommendations: "Gợi ý thao tác hôm nay",
    disclaimer: "Lưu ý an toàn",
    noWarnings: "Chưa có cảnh báo thời tiết nghiêm trọng.",
    noAlerts: "Chưa có cảnh báo sâu bệnh nổi bật cho dữ liệu hiện tại.",
    login: "Cần đăng nhập dashboard bằng tài khoản backend Django để lưu vị trí và lấy cảnh báo.",
  },
  en: {
    eyebrow: "Weather & pests",
    title: "Field alerts by real location",
    intro:
      "Use browser GPS or enter a manual address. With coordinates, Agromind AI uses Open-Meteo for real 7-day forecasts and pest-risk rules.",
    locationName: "Location name",
    province: "Province",
    district: "District",
    ward: "Ward",
    address: "Address / note",
    crop: "Crop",
    submit: "Save location & view alerts",
    refresh: "Refresh alerts",
    useCurrent: "Use current location",
    current: "Current",
    forecast3: "3-day forecast",
    forecast7: "7-day forecast",
    warnings: "Weather warnings",
    pest: "Pest alerts",
    recommendations: "Today actions",
    disclaimer: "Safety note",
    noWarnings: "No severe weather warning in the current data.",
    noAlerts: "No major pest alert in the current data.",
    login: "Backend Django login is required to save locations and load alerts.",
  },
};

const defaultForm = {
  name: "Vườn chính",
  province: "Lâm Đồng",
  district: "Đức Trọng",
  ward: "Hiệp An",
  address_text: "Khu canh tác chính",
  crop_type: "Cà chua",
  latitude: null as number | null,
  longitude: null as number | null,
};

function sourceLabel(source?: string) {
  if (source === "open_meteo") return "Open-Meteo · dữ liệu thật";
  if (source === "rule_estimate") return "Ước tính nội bộ · thiếu tọa độ/API lỗi";
  return source || "Chưa có dữ liệu";
}

function riskLabel(risk?: string) {
  if (risk === "high") return "Rủi ro cao";
  if (risk === "medium") return "Cần theo dõi";
  if (risk === "low") return "Rủi ro thấp";
  return "Sẵn sàng";
}

function coordinateText(lat?: number | null, lon?: number | null) {
  if (lat == null || lon == null) return "Chưa có tọa độ";
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

function WeatherMetric({ icon: Icon, label, value }: { icon: typeof ThermometerSun; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border-dark bg-app-surface-2 p-4">
      <div className="flex items-center gap-2 text-muted-on-dark">
        <Icon strokeWidth={1.75} className="h-4 w-4" />
        <span className="text-caption uppercase tracking-[0.12em]">{label}</span>
      </div>
      <p className="mt-2 text-xl font-semibold text-on-dark-strong">{value}</p>
    </div>
  );
}

function WeatherDayCard({ day }: { day: WeatherDay }) {
  return (
    <div className="rounded-md border border-emerald-100/70 bg-white p-4 text-[#0C1410] shadow-sm">
      <p className="text-body-sm font-semibold">{new Date(day.date).toLocaleDateString("vi-VN")}</p>
      <p className="mt-1 text-caption text-[#2F3833]">{day.summary}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-caption text-[#2F3833]">
        <span>Nhiệt: {day.temperature_c}°C</span>
        <span>Ẩm: {day.humidity_percent}%</span>
        <span>Mưa: {day.rain_probability_percent}%</span>
        <span>Gió: {day.wind_kmh} km/h</span>
      </div>
    </div>
  );
}

export default function WeatherAlertsPage() {
  const { accessToken } = useSessionStore();
  const { language } = useLanguageStore();
  const text = copy[language];
  const loginUrl = "/login?next=/dashboard/weather-alerts";

  const [locations, setLocations] = useState<FarmLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [advisory, setAdvisory] = useState<FarmAdvisory | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationNote, setLocationNote] = useState<string | null>(null);

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === selectedLocationId) ?? locations[0] ?? null,
    [locations, selectedLocationId],
  );

  function applyLocationToForm(location: FarmLocation) {
    setForm({
      name: location.name || defaultForm.name,
      province: location.province || "",
      district: location.district || "",
      ward: location.ward || "",
      address_text: location.address_text || "",
      crop_type: location.crop_type || defaultForm.crop_type,
      latitude: location.latitude ?? null,
      longitude: location.longitude ?? null,
    });
  }

  async function loadLocations() {
    if (!accessToken) return;
    const data = await fetchFarmLocations(accessToken);
    setLocations(data);
    if (data[0]) {
      setSelectedLocationId(data[0].id);
      applyLocationToForm(data[0]);
    }
  }

  async function loadAdvisory(location: FarmLocation) {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFarmAdvisory(accessToken, location.id, location.crop_type || form.crop_type);
      setAdvisory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được cảnh báo.");
    } finally {
      setLoading(false);
    }
  }

  function handleUseCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Trình duyệt không hỗ trợ lấy vị trí hiện tại.");
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
          name: current.name || "Vị trí hiện tại",
          address_text: current.address_text || "Tọa độ GPS hiện tại",
          latitude,
          longitude,
        }));
        setLocationNote("Đã lấy tọa độ hiện tại. Bấm lưu để dùng Open-Meteo theo vị trí này.");
        setLocating(false);
      },
      (geoError) => {
        const message =
          geoError.code === geoError.PERMISSION_DENIED
            ? "Bạn cần cho phép trình duyệt truy cập vị trí."
            : "Không lấy được vị trí hiện tại. Bạn có thể nhập địa chỉ thủ công.";
        setError(message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  useEffect(() => {
    void loadLocations().catch((err) => {
      setError(err instanceof Error ? err.message : "Không tải được vị trí canh tác.");
    });
  }, [accessToken]);

  useEffect(() => {
    if (selectedLocation) {
      void loadAdvisory(selectedLocation);
    }
  }, [selectedLocationId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) {
      setError(text.login);
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
      if (location.latitude != null && location.longitude != null) {
        setLocationNote("Đã lưu tọa độ. Dự báo sẽ dùng dữ liệu thật từ Open-Meteo.");
      } else {
        setLocationNote("Chưa xác định được tọa độ từ địa chỉ, hệ thống sẽ dùng ước tính nội bộ.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được vị trí.");
    } finally {
      setLoading(false);
    }
  }

  const current = advisory?.weather.current;
  const weatherSource = advisory?.weather.source;

  return (
    <div className="space-y-6">
      <Card variant="dark" padding="lg" className="border-border-dark bg-app-surface text-on-dark">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-overline text-leaf-300">{text.eyebrow}</p>
            <h2 className="mt-2 text-h2 text-on-dark-strong">{text.title}</h2>
            <p className="mt-3 max-w-3xl text-body-sm leading-relaxed text-muted-on-dark">{text.intro}</p>
          </div>
          <Badge variant={advisory?.pest_alerts.risk_level === "high" ? "warning" : "success"}>
            {riskLabel(advisory?.pest_alerts.risk_level)}
          </Badge>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card variant="dark" padding="lg" className="border-border-dark">
          <div className="mb-5 rounded-md border border-border-dark bg-app-surface-2 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-leaf-500/15 p-2 text-leaf-300">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-on-dark-strong">Nguồn vị trí</p>
                <p className="mt-1 text-body-sm leading-relaxed text-muted-on-dark">
                  GPS sẽ chính xác nhất. Nếu nhập thủ công, backend sẽ geocode địa chỉ bằng Open-Meteo trước khi lấy thời tiết.
                </p>
                <p className="mt-2 text-caption text-leaf-200">
                  Tọa độ form: {coordinateText(form.latitude, form.longitude)}
                </p>
              </div>
            </div>
          </div>

          <form className="space-y-4 font-sans" onSubmit={handleSubmit}>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="secondary" onClick={handleUseCurrentLocation} disabled={locating || loading}>
                <LocateFixed strokeWidth={1.75} className="h-4 w-4" />
                {locating ? "Đang lấy vị trí..." : text.useCurrent}
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input label={text.locationName} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input label={text.crop} value={form.crop_type} onChange={(e) => setForm({ ...form, crop_type: e.target.value })} />
              <Input label={text.province} value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value, latitude: null, longitude: null })} />
              <Input label={text.district} value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value, latitude: null, longitude: null })} />
              <Input label={text.ward} value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value, latitude: null, longitude: null })} />
              <Input label={text.address} value={form.address_text} onChange={(e) => setForm({ ...form, address_text: e.target.value, latitude: null, longitude: null })} />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" loading={loading}>
                <MapPin strokeWidth={1.75} className="h-4 w-4" />
                {text.submit}
              </Button>
              <Button
                type="button"
                variant="secondaryOnLight"
                className="border-[#B8E9C8] bg-[#F0FAF4] !text-[#0C1410] disabled:border-[#B8E9C8] disabled:bg-[#F0FAF4] disabled:!text-[#0C1410] disabled:!opacity-100 disabled:[&>svg]:!text-[#2F3833]"
                disabled={!selectedLocation || loading}
                onClick={() => selectedLocation && void loadAdvisory(selectedLocation)}
              >
                <RefreshCcw strokeWidth={1.75} className="h-4 w-4" />
                {text.refresh}
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
                      ? "border-[#2FA664] bg-[#DCF5E4] text-[#0F4D2C]"
                      : "border-[#B8E9C8] bg-[#F7F9F8] text-[#2F3833] hover:bg-[#F0FAF4]"
                  }`}
                  title={coordinateText(location.latitude, location.longitude)}
                >
                  {location.name} · {location.crop_type || "Cây trồng"}
                </button>
              ))}
            </div>
          ) : null}

          {locationNote ? <p className="mt-4 text-body-sm text-leaf-200">{locationNote}</p> : null}
          {error ? <p className="mt-4 text-body-sm text-berry-500">{error}</p> : null}

          {!accessToken ? (
            <div className="mt-4 rounded-md border border-berry-500/30 bg-berry-500/10 p-4">
              <p className="text-body-sm text-berry-300">{text.login}</p>
              <Link
                href={loginUrl}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-md bg-leaf-500 px-5 text-body font-medium text-white transition hover:bg-leaf-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500/40"
              >
                {language === "en" ? "Sign in" : "Đăng nhập dashboard"}
              </Link>
            </div>
          ) : null}
        </Card>

        <Card variant="dark" padding="lg" className="border-border-dark bg-app-surface text-on-dark">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-overline text-muted-on-dark">{text.current}</p>
              <p className="mt-2 text-caption text-leaf-200">{sourceLabel(weatherSource)}</p>
              {selectedLocation ? (
                <p className="mt-1 text-caption text-muted-on-dark">
                  {selectedLocation.name} · {coordinateText(selectedLocation.latitude, selectedLocation.longitude)}
                </p>
              ) : null}
            </div>
            {weatherSource === "rule_estimate" ? (
              <Badge variant="warning">Cần tọa độ</Badge>
            ) : weatherSource === "open_meteo" ? (
              <Badge variant="success">Dữ liệu thật</Badge>
            ) : null}
          </div>

          {current ? (
            <>
              <h3 className="mt-4 text-h2 text-on-dark-strong">{current.summary}</h3>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                <WeatherMetric icon={ThermometerSun} label="Nhiệt độ" value={`${current.temperature_c}°C`} />
                <WeatherMetric icon={CloudRain} label="Mưa" value={`${current.rain_probability_percent}%`} />
                <WeatherMetric icon={Sprout} label="Độ ẩm" value={`${current.humidity_percent}%`} />
                <WeatherMetric icon={Wind} label="Gió" value={`${current.wind_kmh} km/h`} />
              </div>
              <p className="mt-5 rounded-md border border-border-dark bg-app-surface-2 p-4 text-body-sm leading-relaxed text-muted-on-dark">
                {advisory?.weather.message}
              </p>
            </>
          ) : (
            <p className="mt-3 text-body-sm text-muted-on-dark">
              Chưa có dữ liệu. Hãy lấy vị trí hiện tại hoặc nhập địa chỉ rồi bấm lưu.
            </p>
          )}
        </Card>
      </div>

      {advisory ? (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <Card variant="light" padding="lg" className="shadow-sm">
              <p className="text-overline text-leaf-700">{text.forecast3}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {advisory.weather.forecast_3d.map((day) => (
                  <WeatherDayCard key={day.date} day={day} />
                ))}
              </div>
            </Card>
            <Card variant="light" padding="lg" className="shadow-sm">
              <p className="text-overline text-leaf-700">{text.forecast7}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {advisory.weather.forecast_7d.slice(0, 6).map((day) => (
                  <WeatherDayCard key={day.date} day={day} />
                ))}
              </div>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card variant="dark" padding="lg" className="border-border-dark bg-app-surface text-on-dark">
              <div className="flex items-center gap-2 text-on-dark-strong">
                <ShieldAlert strokeWidth={1.75} className="h-5 w-5 text-sun-400" />
                <h3 className="text-h3">{text.warnings}</h3>
              </div>
              <ul className="mt-4 space-y-3 text-body-sm leading-relaxed text-muted-on-dark">
                {(advisory.weather.warnings.length ? advisory.weather.warnings : [text.noWarnings]).map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </Card>

            <Card variant="dark" padding="lg" className="border-border-dark bg-app-surface text-on-dark">
              <h3 className="text-h3 text-on-dark-strong">{text.pest}</h3>
              <div className="mt-4 space-y-3">
                {advisory.pest_alerts.alerts.length ? (
                  advisory.pest_alerts.alerts.map((alert) => (
                    <div key={alert.title} className="rounded-md border border-border-dark bg-app-surface-2 p-3">
                      <p className="font-semibold text-on-dark-strong">{alert.title}</p>
                      <p className="mt-1 text-body-sm leading-relaxed text-muted-on-dark">{alert.description}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-body-sm text-muted-on-dark">{text.noAlerts}</p>
                )}
              </div>
            </Card>

            <Card variant="dark" padding="lg" className="border-border-dark bg-app-surface text-on-dark">
              <h3 className="text-h3 text-on-dark-strong">{text.recommendations}</h3>
              <ul className="mt-4 space-y-3 text-body-sm leading-relaxed text-muted-on-dark">
                {advisory.recommendations.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
              <p className="mt-5 text-caption leading-relaxed text-muted-on-dark">
                {text.disclaimer}: {advisory.disclaimer}
              </p>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
