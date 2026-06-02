"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CloudRain, MapPin, RefreshCcw, ShieldAlert, Sprout, ThermometerSun, Wind } from "lucide-react";

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
    title: "Cảnh báo theo vị trí canh tác",
    intro: "Chọn tỉnh, huyện, xã và cây trồng để xem dự báo 3 ngày, 7 ngày, rủi ro sâu bệnh và gợi ý thao tác hôm nay.",
    locationName: "Tên vị trí",
    province: "Tỉnh / thành phố",
    district: "Huyện / quận",
    ward: "Xã / phường",
    address: "Ghi chú vị trí",
    crop: "Cây trồng",
    submit: "Lưu vị trí & xem cảnh báo",
    refresh: "Tải lại cảnh báo",
    login: "Cần đăng nhập backend Django để lưu vị trí và lấy cảnh báo.",
    current: "Hiện tại",
    forecast3: "Dự báo 3 ngày",
    forecast7: "Dự báo 7 ngày",
    warnings: "Cảnh báo thời tiết",
    pest: "Cảnh báo sâu bệnh",
    recommendations: "Có nên tưới, bón phân, phun thuốc hôm nay không",
    disclaimer: "Lưu ý an toàn",
    noWarnings: "Chưa có cảnh báo thời tiết nghiêm trọng.",
    noAlerts: "Chưa có cảnh báo sâu bệnh nổi bật cho dữ liệu hiện tại.",
  },
  en: {
    eyebrow: "Weather & pests",
    title: "Field alerts by location",
    intro: "Select province, district, ward and crop to view 3-day and 7-day forecasts, pest risk and today actions.",
    locationName: "Location name",
    province: "Province",
    district: "District",
    ward: "Ward",
    address: "Location note",
    crop: "Crop",
    submit: "Save location & view alerts",
    refresh: "Refresh alerts",
    login: "Backend Django login is required to save locations and load alerts.",
    current: "Current",
    forecast3: "3-day forecast",
    forecast7: "7-day forecast",
    warnings: "Weather warnings",
    pest: "Pest alerts",
    recommendations: "Water, fertilize or spray today?",
    disclaimer: "Safety note",
    noWarnings: "No severe weather warning in the current data.",
    noAlerts: "No major pest alert in the current data.",
  },
};

const defaultForm = {
  name: "Vườn chính",
  province: "Lâm Đồng",
  district: "Đức Trọng",
  ward: "Hiệp An",
  address_text: "Khu canh tác chính",
  crop_type: "Cà chua",
};

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
    <div className="rounded-md border border-emerald-100/70 bg-white p-4 text-ink-900 shadow-sm">
      <p className="text-body-sm font-semibold">{new Date(day.date).toLocaleDateString("vi-VN")}</p>
      <p className="mt-1 text-caption text-ink-500">{day.summary}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-caption text-ink-700">
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
  const [error, setError] = useState<string | null>(null);

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === selectedLocationId) ?? locations[0] ?? null,
    [locations, selectedLocationId],
  );

  async function loadLocations() {
    if (!accessToken) return;
    const data = await fetchFarmLocations(accessToken);
    setLocations(data);
    if (data[0]) setSelectedLocationId(data[0].id);
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
    try {
      const location = await createFarmLocation(accessToken, form);
      setLocations((current) => [location, ...current.filter((item) => item.id !== location.id)]);
      setSelectedLocationId(location.id);
      await loadAdvisory(location);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được vị trí.");
    } finally {
      setLoading(false);
    }
  }

  const current = advisory?.weather.current;

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
            {advisory?.pest_alerts.risk_level ?? "Sẵn sàng"}
          </Badge>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card variant="dark" padding="lg" className="border-border-dark">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label={text.locationName} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input label={text.crop} value={form.crop_type} onChange={(e) => setForm({ ...form, crop_type: e.target.value })} />
              <Input label={text.province} value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
              <Input label={text.district} value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
              <Input label={text.ward} value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} />
              <Input label={text.address} value={form.address_text} onChange={(e) => setForm({ ...form, address_text: e.target.value })} />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" loading={loading}>
                <MapPin strokeWidth={1.75} className="h-4 w-4" />
                {text.submit}
              </Button>
              <Button
                type="button"
                variant="secondaryOnLight"
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
                  onClick={() => setSelectedLocationId(location.id)}
                  className={`rounded-full border px-3 py-1.5 text-body-sm transition ${
                    selectedLocationId === location.id
                      ? "border-leaf-500 bg-leaf-100 text-leaf-800"
                      : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50"
                  }`}
                >
                  {location.name} · {location.crop_type || "Cây trồng"}
                </button>
              ))}
            </div>
          ) : null}

          {!accessToken ? (
            <div className="mt-4 rounded-md border border-berry-500/30 bg-berry-500/10 p-4">
              <p className="text-body-sm text-berry-300">
                {language === "en"
                  ? "Sign in to the dashboard with your Django backend account to save locations and load alerts. Django admin login does not create a dashboard JWT session."
                  : "Hãy đăng nhập dashboard bằng tài khoản backend Django để lưu vị trí và lấy cảnh báo. Đăng nhập Django admin riêng không tạo phiên JWT cho dashboard."}
              </p>
              <Link
                href={loginUrl}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-md bg-leaf-500 px-5 text-body font-medium text-white transition hover:bg-leaf-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500/40"
              >
                {language === "en" ? "Sign in" : "Đăng nhập dashboard"}
              </Link>
            </div>
          ) : null}
          {error ? <p className="mt-4 text-body-sm text-berry-500">{error}</p> : null}
        </Card>

        <Card variant="dark" padding="lg" className="border-border-dark bg-app-surface text-on-dark">
          <p className="text-overline text-muted-on-dark">{text.current}</p>
          {current ? (
            <>
              <h3 className="mt-2 text-h2 text-on-dark-strong">{current.summary}</h3>
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
            <p className="mt-3 text-body-sm text-muted-on-dark">Chưa có dữ liệu. Hãy lưu vị trí canh tác trước.</p>
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
