"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ExternalLink, QrCode, Sprout, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createCultivationLog,
  createFarmPlot,
  createTraceability,
  deleteFarmPlot,
  fetchFarmPlots,
  type CultivationLog,
  type FarmPlot,
  type TraceabilityRecord,
} from "@/lib/farmops-client";
import { useLanguageStore } from "@/store/language-store";
import { useSessionStore } from "@/store/session-store";

const copy = {
  vi: {
    eyebrow: "Nhật ký canh tác",
    title: "Quản lý từng lô vườn và nhật ký chăm sóc",
    intro: "Tạo khu trồng, ghi lại tưới nước, bón phân, kiểm tra sâu bệnh và tạo mã QR truy xuất khi cần.",
    createPlot: "Tạo lô/vườn mới",
    createLog: "Ghi nhật ký",
    qr: "Tạo QR truy xuất",
    login: "Cần đăng nhập để lưu lô vườn và nhật ký.",
    timeline: "Dòng thời gian chăm sóc",
    noPlot: "Chưa có lô vườn nào.",
    publicPage: "Mở trang công khai",
  },
  en: {
    eyebrow: "Farm journal",
    title: "Plots, care timeline and QR traceability",
    intro: "Create plots, log watering, fertilizing, spraying, disease checks and publish traceability QR.",
    createPlot: "Create plot",
    createLog: "Add log",
    qr: "Create QR",
    login: "Please sign in to save plots and care logs.",
    timeline: "Care timeline",
    noPlot: "No plot yet.",
    publicPage: "Mở trang công khai",
  },
};

const plotDefaults = {
  name: "Lô cà chua 01",
  crop_type: "Cà chua",
  area_value: "500",
  area_unit: "m2",
  address_text: "Khu vườn chính",
  planting_start_date: new Date().toISOString().slice(0, 10),
  growth_stage: "Sinh trưởng",
  note: "",
};

const logDefaults = {
  activity_type: "disease_check",
  activity_date: new Date().toISOString().slice(0, 10),
  title: "Kiểm tra sâu bệnh",
  description: "Quan sát lá, thân và mặt dưới lá.",
  diagnosis: "",
};

function activityLabel(type: string) {
  const labels: Record<string, string> = {
    watering: "Tưới nước",
    fertilizing: "Bón phân",
    pesticide: "Phun thuốc",
    disease_check: "Kiểm tra sâu bệnh",
    pruning: "Tỉa cành",
    harvest: "Thu hoạch",
    note: "Ghi chú",
  };
  return labels[type] ?? type;
}

function PlotSummary({ plot, active, onSelect }: { plot: FarmPlot; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border p-4 text-left transition ${
        active ? "border-leaf/35 bg-surface-soft text-ink" : "border-line bg-surface text-ink hover:bg-surface-soft"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{plot.name}</p>
          <p className="mt-1 text-body-sm text-ink-soft">{plot.crop_type} · {plot.growth_stage || "Đang theo dõi"}</p>
        </div>
        <Badge variant="locked">{plot.logs?.length ?? 0} nhật ký</Badge>
      </div>
      <p className="mt-3 text-caption text-ink-soft">{plot.address_text || "Chưa ghi vị trí"}</p>
    </button>
  );
}

function Timeline({ logs }: { logs: CultivationLog[] }) {
  if (!logs.length) {
    return <p className="text-body-sm text-ink-soft">Chưa có nhật ký cho lô này.</p>;
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="rounded-lg border border-line bg-surface-soft p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="locked">{activityLabel(log.activity_type)}</Badge>
            <span className="text-caption text-ink-soft">{new Date(log.activity_date).toLocaleDateString("vi-VN")}</span>
          </div>
          <p className="mt-3 font-semibold text-ink">{log.title}</p>
          <p className="mt-1 text-body-sm leading-relaxed text-ink-soft">{log.description}</p>
        </div>
      ))}
    </div>
  );
}

export default function FarmsPage() {
  const { accessToken } = useSessionStore();
  const { language } = useLanguageStore();
  const text = copy[language];

  const [plots, setPlots] = useState<FarmPlot[]>([]);
  const [selectedPlotId, setSelectedPlotId] = useState<number | null>(null);
  const [plotForm, setPlotForm] = useState(plotDefaults);
  const [logForm, setLogForm] = useState(logDefaults);
  const [productName, setProductName] = useState("Nông sản Agromind");
  const [traceability, setTraceability] = useState<TraceabilityRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlot = useMemo(
    () => plots.find((plot) => plot.id === selectedPlotId) ?? plots[0] ?? null,
    [plots, selectedPlotId],
  );

  const refreshPlots = useCallback(async (nextSelectedId?: number) => {
    if (!accessToken) return;
    const data = await fetchFarmPlots(accessToken);
    setPlots(data);
    setSelectedPlotId((current) => nextSelectedId ?? current ?? data[0]?.id ?? null);
  }, [accessToken]);

  useEffect(() => {
    void refreshPlots().catch((err) => {
      setError(err instanceof Error ? err.message : "Không tải được lô vườn.");
    });
  }, [refreshPlots]);

  async function handleCreatePlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) {
      setError(text.login);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const plot = await createFarmPlot(accessToken, {
        ...plotForm,
        area_value: plotForm.area_value ? Number(plotForm.area_value) : null,
      });
      await refreshPlots(plot.id);
      setTraceability(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được lô vườn.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !selectedPlot) {
      setError(accessToken ? "Hãy chọn một lô vườn trước." : text.login);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createCultivationLog(accessToken, {
        plot: selectedPlot.id,
        activity_type: logForm.activity_type,
        activity_date: logForm.activity_date,
        title: logForm.title,
        description: logForm.description,
        diagnosis: logForm.diagnosis ? Number(logForm.diagnosis) : null,
      });
      await refreshPlots(selectedPlot.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không ghi được nhật ký.");
    } finally {
      setLoading(false);
    }
  }

  async function handleTraceability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !selectedPlot) {
      setError(accessToken ? "Hãy chọn một lô vườn trước." : text.login);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const record = await createTraceability(accessToken, {
        plot: selectedPlot.id,
        product_name: productName || selectedPlot.crop_type,
        is_public: true,
        public_settings: { show_logs: true },
      });
      setTraceability(record);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được QR.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSelected() {
    if (!accessToken || !selectedPlot) return;
    setLoading(true);
    setError(null);
    try {
      await deleteFarmPlot(accessToken, selectedPlot.id);
      setSelectedPlotId(null);
      setTraceability(null);
      await refreshPlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được lô vườn.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fl-stagger mx-auto max-w-[1380px] space-y-6">
      <Card variant="dark" padding="lg" className="field-contours rounded-xl">
        <p className="text-overline text-on-forest-muted">{text.eyebrow}</p>
        <h2 className="mt-2 text-h2 font-bold text-on-forest">{text.title}</h2>
        <p className="mt-3 max-w-3xl text-body-sm leading-relaxed text-on-forest-muted">{text.intro}</p>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <Card variant="raised" padding="lg" className="rounded-xl">
            <h3 className="text-h3 font-bold text-ink">{text.createPlot}</h3>
            <form className="mt-5 space-y-4" onSubmit={handleCreatePlot}>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Tên lô/vườn/ruộng" value={plotForm.name} onChange={(e) => setPlotForm({ ...plotForm, name: e.target.value })} />
                <Input label="Cây trồng" value={plotForm.crop_type} onChange={(e) => setPlotForm({ ...plotForm, crop_type: e.target.value })} />
                <Input label="Diện tích" type="number" value={plotForm.area_value} onChange={(e) => setPlotForm({ ...plotForm, area_value: e.target.value })} />
                <Input label="Đơn vị" value={plotForm.area_unit} onChange={(e) => setPlotForm({ ...plotForm, area_unit: e.target.value })} />
                <Input label="Ngày xuống giống" type="date" value={plotForm.planting_start_date} onChange={(e) => setPlotForm({ ...plotForm, planting_start_date: e.target.value })} />
                <Input label="Giai đoạn" value={plotForm.growth_stage} onChange={(e) => setPlotForm({ ...plotForm, growth_stage: e.target.value })} />
              </div>
              <Input label="Vị trí" value={plotForm.address_text} onChange={(e) => setPlotForm({ ...plotForm, address_text: e.target.value })} />
              <Button type="submit" loading={loading}>
                <Sprout strokeWidth={1.75} className="h-4 w-4" />
                {text.createPlot}
              </Button>
            </form>
          </Card>

          <Card variant="default" padding="lg" className="rounded-xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-h3 font-bold text-ink">Danh sách lô vườn</h3>
              {selectedPlot ? (
                <button
                  type="button"
                  onClick={() => void handleDeleteSelected()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-danger/30 px-3 text-caption font-semibold text-danger-ink transition hover:bg-danger-soft"
                >
                  <Trash2 strokeWidth={1.75} className="h-3.5 w-3.5" />
                  Xóa
                </button>
              ) : null}
            </div>
            <div className="mt-4 space-y-3">
              {plots.length ? (
                plots.map((plot) => (
                  <PlotSummary
                    key={plot.id}
                    plot={plot}
                    active={selectedPlot?.id === plot.id}
                    onSelect={() => {
                      setSelectedPlotId(plot.id);
                      setTraceability(null);
                    }}
                  />
                ))
              ) : (
                <p className="text-body-sm text-ink-soft">{text.noPlot}</p>
              )}
            </div>
            {!accessToken ? <p className="mt-4 text-body-sm text-danger-ink">{text.login}</p> : null}
            {error ? <p className="mt-4 text-body-sm text-danger-ink">{error}</p> : null}
          </Card>
        </div>

        <div className="space-y-6">
          <Card variant="raised" padding="lg" className="rounded-xl">
            <div className="flex items-center gap-2">
              <CalendarDays strokeWidth={1.75} className="h-5 w-5 text-leaf-strong" />
              <h3 className="text-h3 font-bold text-ink">{text.createLog}</h3>
            </div>
            <form className="mt-5 space-y-4" onSubmit={handleCreateLog}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-body-sm font-semibold text-ink">Loại hoạt động</span>
                  <select
                    value={logForm.activity_type}
                    onChange={(e) => setLogForm({ ...logForm, activity_type: e.target.value })}
                    className="h-11 w-full rounded-md border border-line bg-surface px-3.5 text-body text-ink outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                  >
                    <option value="watering">Tưới nước</option>
                    <option value="fertilizing">Bón phân</option>
                    <option value="pesticide">Phun thuốc</option>
                    <option value="disease_check">Kiểm tra sâu bệnh</option>
                    <option value="pruning">Tỉa cành</option>
                    <option value="harvest">Thu hoạch</option>
                    <option value="note">Ghi chú</option>
                  </select>
                </label>
                <Input label="Ngày ghi" type="date" value={logForm.activity_date} onChange={(e) => setLogForm({ ...logForm, activity_date: e.target.value })} />
                <Input label="Tiêu đề" value={logForm.title} onChange={(e) => setLogForm({ ...logForm, title: e.target.value })} />
                <Input
                  label="Mã kết quả đã lưu"
                  type="number"
                  value={logForm.diagnosis}
                  hint="Nhập mã kết quả nếu bạn muốn liên kết hoạt động này với một lần kiểm tra ảnh."
                  onChange={(e) => setLogForm({ ...logForm, diagnosis: e.target.value })}
                />
              </div>
              <label className="block space-y-1.5">
                <span className="text-body-sm font-semibold text-ink">Mô tả</span>
                <textarea
                  value={logForm.description}
                  onChange={(e) => setLogForm({ ...logForm, description: e.target.value })}
                  className="min-h-[120px] w-full rounded-md border border-line bg-surface-soft px-3.5 py-3 text-body text-ink outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                />
              </label>
              <Button type="submit" loading={loading} disabled={!selectedPlot}>
                {text.createLog}
              </Button>
            </form>
          </Card>

          <Card variant="default" padding="lg" className="rounded-xl">
            <div className="flex items-center gap-2">
              <QrCode strokeWidth={1.75} className="h-5 w-5 text-leaf-strong" />
              <h3 className="text-h3 font-bold text-ink">{text.qr}</h3>
            </div>
            <form className="mt-5 flex flex-col gap-4 sm:flex-row" onSubmit={handleTraceability}>
              <Input label="Tên sản phẩm công khai" value={productName} onChange={(e) => setProductName(e.target.value)} />
              <div className="flex items-end">
                <Button type="submit" loading={loading} disabled={!selectedPlot}>
                  {text.qr}
                </Button>
              </div>
            </form>
            {traceability ? (
              <div className="mt-5 grid gap-4 md:grid-cols-[220px_1fr]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={traceability.qr_image_url} alt="QR truy xuất" className="h-[220px] w-[220px] rounded-md bg-qr-paper p-2" />
                <div>
                  <p className="font-semibold text-ink">{traceability.product_name}</p>
                  <p className="mt-2 break-all text-body-sm leading-relaxed text-ink-soft">{traceability.public_url}</p>
                  <a
                    href={traceability.public_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-line px-3 text-body-sm font-medium text-ink transition hover:bg-surface-soft"
                  >
                    <ExternalLink strokeWidth={1.75} className="h-4 w-4" />
                    {text.publicPage}
                  </a>
                </div>
              </div>
            ) : null}
          </Card>

          <Card variant="default" padding="lg" className="rounded-xl">
            <h3 className="text-h3 font-bold text-ink">{text.timeline}</h3>
            <div className="mt-5">
              <Timeline logs={selectedPlot?.logs ?? []} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
