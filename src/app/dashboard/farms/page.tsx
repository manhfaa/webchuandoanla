"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, PencilLine, QrCode, Sprout } from "lucide-react";
import { toast } from "sonner";

import type { Tr } from "@/components/farms/farm-fields";
import { CareTimeline } from "@/components/farms/care-timeline";
import { ConfirmDialog } from "@/components/farms/confirm-dialog";
import {
  deleteCultivationLog,
  deleteTraceability,
  fetchTraceabilityRecords,
  updateCultivationLog,
  updateFarmPlot,
  updateTraceability,
} from "@/components/farms/farmops-actions";
import { LogForm, logToFormValues, type DiagnosisOption, type LogFormValues } from "@/components/farms/log-form";
import { PlotForm, plotToFormValues, type PlotFormValues } from "@/components/farms/plot-form";
import { PlotSummary } from "@/components/farms/plot-summary";
import { TraceabilityPanel } from "@/components/farms/traceability-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { fetchDiagnosisRecords } from "@/lib/diagnoses-client";
import {
  createCultivationLog,
  createFarmPlot,
  createTraceability,
  deleteFarmPlot,
  fetchFarmLocations,
  fetchFarmPlots,
  type CultivationLog,
  type FarmLocation,
  type FarmPlot,
  type TraceabilityDisplaySettings,
  type TraceabilityRecord,
} from "@/lib/farmops-client";
import { useTr } from "@/lib/use-tr";
import { useLanguageStore } from "@/store/language-store";
import { useSessionStore } from "@/store/session-store";

/**
 * Same bilingual resolution as `useTr`, but readable outside of render
 * (async callbacks) so memoised handlers do not need `tr` as a dependency.
 */
function trOffRender(vi: string, en: string) {
  return useLanguageStore.getState().language === "en" ? en : vi;
}

/** A destructive or link-breaking action waiting for the grower to confirm it. */
type PendingAction =
  | { kind: "delete-plot"; plot: FarmPlot }
  | { kind: "delete-log"; log: CultivationLog }
  | { kind: "delete-trace"; record: TraceabilityRecord }
  | { kind: "unpublish-trace"; record: TraceabilityRecord }
  | { kind: "issue-trace"; productName: string; settings: TraceabilityDisplaySettings };

function createPlotDefaults(tr: Tr): PlotFormValues {
  return {
    name: tr("Lô cà chua 01", "Tomato plot 01"),
    crop_type: tr("Cà chua", "Tomato"),
    location: "",
    area_value: "500",
    area_unit: "m2",
    address_text: tr("Khu vườn chính", "Main garden"),
    planting_start_date: new Date().toISOString().slice(0, 10),
    growth_stage: tr("Sinh trưởng", "Vegetative"),
    note: "",
  };
}

function createLogDefaults(tr: Tr): LogFormValues {
  return {
    activity_type: "disease_check",
    activity_date: new Date().toISOString().slice(0, 10),
    title: tr("Kiểm tra sâu bệnh", "Pest and disease check"),
    description: tr("Quan sát lá, thân và mặt dưới lá.", "Inspect leaves, stems and leaf undersides."),
    diagnosis: "",
  };
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export default function FarmsPage() {
  const tr = useTr();
  const { accessToken } = useSessionStore();

  const loginMessage = tr(
    "Cần đăng nhập để lưu lô vườn và nhật ký.",
    "Please sign in to save plots and care logs.",
  );
  const createPlotLabel = tr("Tạo lô/vườn mới", "Create plot");
  const createLogLabel = tr("Ghi nhật ký", "Add log");
  const qrLabel = tr("Tạo QR truy xuất", "Create QR");
  const selectPlotMessage = tr("Hãy chọn một lô vườn trước.", "Please select a plot first.");

  const [plots, setPlots] = useState<FarmPlot[]>([]);
  const [locations, setLocations] = useState<FarmLocation[]>([]);
  const [records, setRecords] = useState<TraceabilityRecord[]>([]);
  const [diagnoses, setDiagnoses] = useState<DiagnosisOption[]>([]);
  const [diagnosesUnavailable, setDiagnosesUnavailable] = useState(false);
  const [selectedPlotId, setSelectedPlotId] = useState<number | null>(null);
  const [editingPlot, setEditingPlot] = useState<FarmPlot | null>(null);
  const [editingLog, setEditingLog] = useState<CultivationLog | null>(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [plotSubmitting, setPlotSubmitting] = useState(false);
  const [plotError, setPlotError] = useState<string | null>(null);
  const [logSubmitting, setLogSubmitting] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [qrSubmitting, setQrSubmitting] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [busyRecordId, setBusyRecordId] = useState<number | null>(null);
  // Bumped after a rename lands so the QR form leaves edit mode.
  const [qrFormToken, setQrFormToken] = useState(0);

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [pendingBusy, setPendingBusy] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);

  // No fallback to plots[0] here: every destructive action names the plot it
  // targets, so the selection must be exactly what the grower clicked.
  const selectedPlot = useMemo(
    () => plots.find((plot) => plot.id === selectedPlotId) ?? null,
    [plots, selectedPlotId],
  );

  const plotRecords = useMemo(
    () => (selectedPlot ? records.filter((record) => record.plot === selectedPlot.id) : []),
    [records, selectedPlot],
  );

  const recordCountByPlot = useMemo(() => {
    const counts = new Map<number, number>();
    records.forEach((record) => counts.set(record.plot, (counts.get(record.plot) ?? 0) + 1));
    return counts;
  }, [records]);

  const refreshAll = useCallback(async (nextSelectedId?: number) => {
    if (!accessToken) return;
    const [nextPlots, nextRecords, nextLocations] = await Promise.all([
      fetchFarmPlots(accessToken),
      fetchTraceabilityRecords(accessToken),
      fetchFarmLocations(accessToken),
    ]);
    setPlots(nextPlots);
    setRecords(nextRecords);
    setLocations(nextLocations);
    setSelectedPlotId((current) => {
      const wanted = nextSelectedId ?? current;
      // A deleted plot must not stay selected, otherwise the log and QR forms
      // would keep pointing at a row that no longer exists.
      return nextPlots.some((plot) => plot.id === wanted) ? wanted! : nextPlots[0]?.id ?? null;
    });
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      setInitialLoading(false);
      return;
    }
    let cancelled = false;
    setInitialLoading(true);
    setListError(null);
    refreshAll()
      .catch((err) => {
        if (!cancelled) setListError(errorMessage(err, trOffRender("Không tải được lô vườn.", "Could not load your plots.")));
      })
      .finally(() => {
        if (!cancelled) setInitialLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, refreshAll]);

  // The log form links an activity to a saved image check, so it needs the
  // grower's own results to pick from instead of a raw id.
  useEffect(() => {
    if (!accessToken) {
      setDiagnoses([]);
      return;
    }
    let cancelled = false;
    fetchDiagnosisRecords(accessToken)
      .then((items) => {
        if (cancelled) return;
        setDiagnoses(
          items.map((item) => ({
            id: item.id,
            label: `${item.plant} · ${item.disease} · ${new Date(item.createdAt).toLocaleDateString("vi-VN")}`,
          })),
        );
        setDiagnosesUnavailable(false);
      })
      .catch(() => {
        if (cancelled) return;
        setDiagnoses([]);
        setDiagnosesUnavailable(true);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const diagnosisLabel = useCallback(
    (id: number) => diagnoses.find((item) => item.id === String(id))?.label ?? null,
    [diagnoses],
  );

  async function handleSubmitPlot(values: PlotFormValues) {
    if (!accessToken) {
      setPlotError(loginMessage);
      return;
    }
    setPlotSubmitting(true);
    setPlotError(null);
    const payload = {
      ...values,
      location: values.location ? Number(values.location) : null,
      area_value: values.area_value ? Number(values.area_value) : null,
      planting_start_date: values.planting_start_date || null,
    };
    try {
      if (editingPlot) {
        const updated = await updateFarmPlot(accessToken, editingPlot.id, payload);
        setEditingPlot(null);
        await refreshAll(updated.id);
        toast.success(tr("Đã cập nhật lô vườn.", "Plot updated."));
      } else {
        const created = await createFarmPlot(accessToken, payload);
        await refreshAll(created.id);
        toast.success(tr("Đã tạo lô vườn mới.", "Plot created."));
      }
    } catch (err) {
      setPlotError(errorMessage(err, editingPlot
        ? tr("Không cập nhật được lô vườn.", "Could not update the plot.")
        : tr("Không tạo được lô vườn.", "Could not create the plot.")));
    } finally {
      setPlotSubmitting(false);
    }
  }

  async function handleSubmitLog(values: LogFormValues) {
    if (!accessToken || !selectedPlot) {
      setLogError(accessToken ? selectPlotMessage : loginMessage);
      return;
    }
    setLogSubmitting(true);
    setLogError(null);
    const payload = {
      activity_type: values.activity_type,
      activity_date: values.activity_date,
      title: values.title,
      description: values.description,
      diagnosis: values.diagnosis ? Number(values.diagnosis) : null,
    };
    try {
      if (editingLog) {
        await updateCultivationLog(accessToken, editingLog.id, payload);
        setEditingLog(null);
        toast.success(tr("Đã cập nhật nhật ký.", "Log updated."));
      } else {
        await createCultivationLog(accessToken, { ...payload, plot: selectedPlot.id });
        toast.success(tr("Đã ghi nhật ký.", "Log saved."));
      }
      await refreshAll(selectedPlot.id);
    } catch (err) {
      setLogError(errorMessage(err, editingLog
        ? tr("Không cập nhật được nhật ký.", "Could not update the log.")
        : tr("Không ghi được nhật ký.", "Could not save the log.")));
    } finally {
      setLogSubmitting(false);
    }
  }

  function handleCreateTraceability(productName: string, settings: TraceabilityDisplaySettings) {
    if (!accessToken || !selectedPlot) {
      setQrError(accessToken ? selectPlotMessage : loginMessage);
      return;
    }
    // Every code carries its own public link, so a second one is a deliberate
    // act rather than a side effect of pressing the button twice.
    if (plotRecords.length) {
      setPendingError(null);
      setPending({ kind: "issue-trace", productName, settings });
      return;
    }
    void issueTraceability(productName, settings).catch(() => {
      // The reason is already rendered under the QR form.
    });
  }

  async function issueTraceability(productName: string, settings: TraceabilityDisplaySettings) {
    if (!accessToken || !selectedPlot) return;
    setQrSubmitting(true);
    setQrError(null);
    try {
      await createTraceability(accessToken, {
        plot: selectedPlot.id,
        product_name: productName || selectedPlot.crop_type,
        is_public: true,
        public_settings: settings,
      });
      await refreshAll(selectedPlot.id);
      toast.success(tr("Đã tạo mã QR truy xuất.", "Traceability QR code created."));
    } catch (err) {
      setQrError(errorMessage(err, tr("Không tạo được QR.", "Could not create the QR code.")));
      throw err;
    } finally {
      setQrSubmitting(false);
    }
  }

  async function handleUpdateTraceability(
    record: TraceabilityRecord,
    productName: string,
    settings: TraceabilityDisplaySettings,
  ) {
    if (!accessToken) {
      setQrError(loginMessage);
      return;
    }
    setQrSubmitting(true);
    setQrError(null);
    try {
      await updateTraceability(accessToken, record.id, { product_name: productName, public_settings: settings });
      await refreshAll(selectedPlot?.id);
      setQrFormToken((current) => current + 1);
      toast.success(tr("Đã cập nhật mã QR.", "QR code updated."));
    } catch (err) {
      setQrError(errorMessage(err, tr("Không cập nhật được mã QR.", "Could not update the QR code.")));
    } finally {
      setQrSubmitting(false);
    }
  }

  async function handleTogglePublic(record: TraceabilityRecord) {
    if (record.is_public) {
      setPendingError(null);
      setPending({ kind: "unpublish-trace", record });
      return;
    }
    if (!accessToken) {
      setQrError(loginMessage);
      return;
    }
    setBusyRecordId(record.id);
    setQrError(null);
    try {
      await updateTraceability(accessToken, record.id, { is_public: true });
      await refreshAll(selectedPlot?.id);
      toast.success(tr("Mã QR đã được công khai lại.", "The QR code is published again."));
    } catch (err) {
      setQrError(errorMessage(err, tr("Không cập nhật được trạng thái công khai.", "Could not update the publish state.")));
    } finally {
      setBusyRecordId(null);
    }
  }

  async function runPendingAction() {
    if (!pending || !accessToken) return;
    setPendingBusy(true);
    setPendingError(null);
    try {
      if (pending.kind === "delete-plot") {
        await deleteFarmPlot(accessToken, pending.plot.id);
        if (editingPlot?.id === pending.plot.id) setEditingPlot(null);
        setEditingLog(null);
        await refreshAll();
        toast.success(tr("Đã xóa lô vườn.", "Plot deleted."));
      } else if (pending.kind === "delete-log") {
        await deleteCultivationLog(accessToken, pending.log.id);
        if (editingLog?.id === pending.log.id) setEditingLog(null);
        await refreshAll(selectedPlot?.id);
        toast.success(tr("Đã xóa nhật ký.", "Log deleted."));
      } else if (pending.kind === "delete-trace") {
        await deleteTraceability(accessToken, pending.record.id);
        await refreshAll(selectedPlot?.id);
        toast.success(tr("Đã xóa mã QR.", "QR code deleted."));
      } else if (pending.kind === "unpublish-trace") {
        await updateTraceability(accessToken, pending.record.id, { is_public: false });
        await refreshAll(selectedPlot?.id);
        toast.success(tr("Đã ngừng công khai mã QR.", "The QR code is no longer public."));
      } else {
        await issueTraceability(pending.productName, pending.settings);
      }
      setPending(null);
    } catch (err) {
      setPendingError(errorMessage(err, tr("Không thực hiện được thao tác.", "Could not complete the action.")));
    } finally {
      setPendingBusy(false);
    }
  }

  const confirmCopy = useMemo(() => {
    if (!pending) return null;

    if (pending.kind === "delete-plot") {
      const logCount = pending.plot.logs?.length ?? 0;
      const qrCount = recordCountByPlot.get(pending.plot.id) ?? 0;
      return {
        tone: "danger" as const,
        title: tr(`Xóa lô “${pending.plot.name}”?`, `Delete the plot “${pending.plot.name}”?`),
        description: tr(
          "Thao tác này không thể hoàn tác.",
          "This cannot be undone.",
        ),
        consequences: [
          tr(`${logCount} nhật ký chăm sóc của lô này`, `${logCount} care log(s) recorded for this plot`),
          qrCount
            ? tr(
                `${qrCount} mã QR truy xuất: các mã đã in sẽ không mở được nữa`,
                `${qrCount} traceability QR code(s): codes already printed will stop working`,
              )
            : tr("Lô này chưa phát hành mã QR truy xuất nào", "This plot has not issued any traceability QR code"),
        ],
        confirmLabel: tr("Xóa lô vườn", "Delete plot"),
      };
    }

    if (pending.kind === "delete-log") {
      return {
        tone: "danger" as const,
        title: tr(`Xóa nhật ký “${pending.log.title}”?`, `Delete the log “${pending.log.title}”?`),
        description: tr("Thao tác này không thể hoàn tác.", "This cannot be undone."),
        consequences: [
          tr(
            `Bản ghi ngày ${new Date(pending.log.activity_date).toLocaleDateString("vi-VN")} sẽ biến mất khỏi dòng thời gian và khỏi trang truy xuất công khai`,
            `The entry dated ${new Date(pending.log.activity_date).toLocaleDateString("vi-VN")} disappears from the timeline and from the public traceability page`,
          ),
          tr("Kết quả kiểm tra ảnh đã lưu vẫn được giữ nguyên", "The saved image check itself is kept"),
        ],
        confirmLabel: tr("Xóa nhật ký", "Delete log"),
      };
    }

    if (pending.kind === "delete-trace") {
      return {
        tone: "danger" as const,
        title: tr(`Xóa mã QR “${pending.record.product_name}”?`, `Delete the QR code “${pending.record.product_name}”?`),
        description: tr("Thao tác này không thể hoàn tác.", "This cannot be undone."),
        consequences: [
          tr(
            "Mọi mã QR đã in hoặc đã gửi cho khách sẽ báo không tìm thấy trang",
            "Every printed or shared copy of this code will show a page-not-found message",
          ),
          tr("Nhật ký và lô vườn vẫn được giữ nguyên", "The plot and its care logs are kept"),
        ],
        confirmLabel: tr("Xóa mã QR", "Delete QR code"),
      };
    }

    if (pending.kind === "unpublish-trace") {
      return {
        tone: "danger" as const,
        title: tr(
          `Ngừng công khai “${pending.record.product_name}”?`,
          `Unpublish “${pending.record.product_name}”?`,
        ),
        description: tr(
          "Bạn có thể bật lại bất cứ lúc nào bằng nút “Công khai lại”.",
          "You can turn it back on at any time with “Publish again”.",
        ),
        consequences: [
          tr(
            "Mã QR đã in sẽ tạm thời không mở được trang truy xuất",
            "Printed copies of this code will temporarily stop opening the traceability page",
          ),
        ],
        confirmLabel: tr("Ngừng công khai", "Unpublish"),
      };
    }

    return {
      tone: "neutral" as const,
      title: tr("Phát hành thêm một mã QR?", "Issue another QR code?"),
      description: tr(
        "Lô này đã có mã QR truy xuất.",
        "This plot already has a traceability QR code.",
      ),
      consequences: [
        tr(
          "Mã mới có đường dẫn công khai riêng, khác với mã cũ",
          "The new code gets its own public link, different from the existing one",
        ),
        tr("Các mã cũ vẫn hoạt động cho tới khi bạn xóa hoặc ngừng công khai", "Existing codes keep working until you delete or unpublish them"),
      ],
      confirmLabel: tr("Phát hành mã mới", "Issue the new code"),
    };
  }, [pending, recordCountByPlot, tr]);

  return (
    <div className="fl-stagger mx-auto max-w-[1380px] space-y-6">
      <Card variant="dark" padding="lg" className="field-contours rounded-xl">
        <p className="text-overline text-on-forest-muted">{tr("Nhật ký canh tác", "Farm journal")}</p>
        <h2 className="mt-2 text-h2 font-bold text-on-forest">
          {tr("Quản lý từng lô vườn và nhật ký chăm sóc", "Plots, care timeline and QR traceability")}
        </h2>
        <p className="mt-3 max-w-3xl text-body-sm leading-relaxed text-on-forest-muted">
          {tr(
            "Tạo khu trồng, ghi lại tưới nước, bón phân, kiểm tra sâu bệnh và tạo mã QR truy xuất khi cần.",
            "Create plots, log watering, fertilizing, spraying, disease checks and publish traceability QR codes.",
          )}
        </p>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <Card variant="raised" padding="lg" className="rounded-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-h3 font-bold text-ink">
                {editingPlot ? tr(`Sửa lô “${editingPlot.name}”`, `Edit plot “${editingPlot.name}”`) : createPlotLabel}
              </h3>
              {editingPlot ? (
                <span className="inline-flex items-center gap-1.5 text-caption font-semibold text-leaf-strong">
                  <PencilLine strokeWidth={1.75} className="h-3.5 w-3.5" aria-hidden />
                  {tr("Đang chỉnh sửa", "Editing")}
                </span>
              ) : null}
            </div>
            <PlotForm
              key={editingPlot ? `plot-${editingPlot.id}` : "plot-new"}
              mode={editingPlot ? "edit" : "create"}
              initialValues={editingPlot ? plotToFormValues(editingPlot) : createPlotDefaults(tr)}
              locations={locations}
              submitting={plotSubmitting}
              error={plotError}
              onSubmit={handleSubmitPlot}
              onCancel={editingPlot ? () => {
                setEditingPlot(null);
                setPlotError(null);
              } : undefined}
            />
          </Card>

          <Card variant="default" padding="lg" className="rounded-xl">
            <h3 className="text-h3 font-bold text-ink">{tr("Danh sách lô vườn", "Plot list")}</h3>
            <div className="mt-4">
              {!accessToken ? (
                <p className="text-body-sm text-danger-ink">{loginMessage}</p>
              ) : initialLoading ? (
                <ListSkeleton count={3} itemClassName="h-[132px]" />
              ) : listError ? (
                <ErrorState
                  description={listError}
                  onRetry={() => {
                    setListError(null);
                    setInitialLoading(true);
                    refreshAll()
                      .catch((err) => setListError(errorMessage(err, trOffRender("Không tải được lô vườn.", "Could not load your plots."))))
                      .finally(() => setInitialLoading(false));
                  }}
                />
              ) : plots.length ? (
                <div className="space-y-3">
                  {plots.map((plot) => (
                    <PlotSummary
                      key={plot.id}
                      plot={plot}
                      active={selectedPlot?.id === plot.id}
                      qrCount={recordCountByPlot.get(plot.id) ?? 0}
                      locationName={locations.find((location) => location.id === plot.location)?.name ?? null}
                      tr={tr}
                      onSelect={() => {
                        setSelectedPlotId(plot.id);
                        setEditingLog(null);
                        setLogError(null);
                        setQrError(null);
                      }}
                      onEdit={() => {
                        setSelectedPlotId(plot.id);
                        setEditingPlot(plot);
                        setPlotError(null);
                      }}
                      onDelete={() => {
                        setPendingError(null);
                        setPending({ kind: "delete-plot", plot });
                      }}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={tr("Chưa có lô vườn nào.", "No plot yet.")}
                  description={tr(
                    "Tạo lô đầu tiên để bắt đầu ghi nhật ký chăm sóc và phát hành mã QR truy xuất.",
                    "Create your first plot to start a care timeline and publish traceability QR codes.",
                  )}
                  icon={Sprout}
                />
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card variant="raised" padding="lg" className="rounded-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CalendarDays strokeWidth={1.75} className="h-5 w-5 text-leaf-strong" />
                <h3 className="text-h3 font-bold text-ink">{editingLog ? tr("Sửa nhật ký", "Edit log") : createLogLabel}</h3>
              </div>
              <p className="text-caption text-ink-soft">
                {selectedPlot
                  ? tr(`Lô đang chọn: ${selectedPlot.name}`, `Selected plot: ${selectedPlot.name}`)
                  : selectPlotMessage}
              </p>
            </div>
            <LogForm
              key={editingLog ? `log-${editingLog.id}` : `log-new-${selectedPlot?.id ?? "none"}`}
              mode={editingLog ? "edit" : "create"}
              initialValues={editingLog ? logToFormValues(editingLog) : createLogDefaults(tr)}
              diagnoses={diagnoses}
              diagnosesUnavailable={diagnosesUnavailable}
              submitting={logSubmitting}
              disabled={!selectedPlot}
              error={logError}
              onSubmit={handleSubmitLog}
              onCancel={editingLog ? () => {
                setEditingLog(null);
                setLogError(null);
              } : undefined}
            />
          </Card>

          <Card variant="default" padding="lg" className="rounded-xl">
            <div className="flex items-center gap-2">
              <QrCode strokeWidth={1.75} className="h-5 w-5 text-leaf-strong" />
              <h3 className="text-h3 font-bold text-ink">{qrLabel}</h3>
            </div>
            <TraceabilityPanel
              key={`trace-${selectedPlot?.id ?? "none"}-${qrFormToken}`}
              records={plotRecords}
              defaultProductName={tr("Nông sản Agromind", "Agromind produce")}
              plotSelected={Boolean(selectedPlot)}
              submitting={qrSubmitting}
              busyRecordId={busyRecordId}
              error={qrError}
              tr={tr}
              onCreate={handleCreateTraceability}
              onUpdate={(record, productName, settings) => void handleUpdateTraceability(record, productName, settings)}
              onTogglePublic={(record) => void handleTogglePublic(record)}
              onDelete={(record) => {
                setPendingError(null);
                setPending({ kind: "delete-trace", record });
              }}
            />
          </Card>

          <Card variant="default" padding="lg" className="rounded-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-h3 font-bold text-ink">{tr("Dòng thời gian chăm sóc", "Care timeline")}</h3>
              {editingLog ? (
                <Button type="button" variant="secondary" size="sm" onClick={() => { setEditingLog(null); setLogError(null); }}>
                  {tr("Thoát chế độ sửa", "Leave edit mode")}
                </Button>
              ) : null}
            </div>
            <div className="mt-5">
              {initialLoading && accessToken ? (
                <ListSkeleton count={2} itemClassName="h-[110px]" />
              ) : !selectedPlot ? (
                <p className="text-body-sm text-ink-soft">{accessToken ? selectPlotMessage : loginMessage}</p>
              ) : (
                <CareTimeline
                  logs={selectedPlot?.logs ?? []}
                  editingLogId={editingLog?.id ?? null}
                  diagnosisLabel={diagnosisLabel}
                  tr={tr}
                  onEdit={(log) => {
                    setEditingLog(log);
                    setLogError(null);
                  }}
                  onDelete={(log) => {
                    setPendingError(null);
                    setPending({ kind: "delete-log", log });
                  }}
                />
              )}
            </div>
          </Card>
        </div>
      </div>

      {confirmCopy ? (
        <ConfirmDialog
          open={Boolean(pending)}
          tone={confirmCopy.tone}
          title={confirmCopy.title}
          description={confirmCopy.description}
          consequences={confirmCopy.consequences}
          confirmLabel={confirmCopy.confirmLabel}
          loading={pendingBusy}
          error={pendingError}
          onConfirm={() => void runPendingAction()}
          onCancel={() => {
            if (pendingBusy) return;
            setPending(null);
            setPendingError(null);
          }}
        />
      ) : null}
    </div>
  );
}
