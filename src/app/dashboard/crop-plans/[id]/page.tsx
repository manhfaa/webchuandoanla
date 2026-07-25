"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Archive, CloudSun, RefreshCcw, Sprout, Trash2, Undo2 } from "lucide-react";

import { ConfirmDialog } from "@/components/crop-plans/confirm-dialog";
import { CropPlanProgress } from "@/components/crop-plans/crop-plan-progress";
import {
  climateConfidenceLabel,
  climateConfidenceNote,
  cropPlanStatusLabel,
  cropPlanStatusTone,
} from "@/components/crop-plans/crop-plan-status";
import { CropPlanStepPanel } from "@/components/crop-plans/crop-plan-step-panel";
import { CropPlanTimeline } from "@/components/crop-plans/crop-plan-timeline";
import { ReminderCenter } from "@/components/crop-plans/reminder-center";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/states";
import {
  completeCropPlanStep,
  delayCropPlanStep,
  deleteCropPlan,
  fetchCropPlanDetail,
  refreshCropPlanWeather,
  regenerateCropPlan,
  reopenCropPlanStep,
  saveCropPlanStepNote,
  updateCropPlan,
  type CropPlanDetail,
} from "@/lib/crop-plans-client";
import { withViFallback } from "@/lib/crop-plan-labels";
import { useTr } from "@/lib/use-tr";
import { useSessionStore } from "@/store/session-store";

type ConfirmKind = "regenerate" | "archive" | "delete" | null;

const climateMetricRows: Array<{ key: string; vi: string; en: string; unit: string }> = [
  { key: "avg_temp_14d", vi: "Nhiệt độ trung bình 14 ngày", en: "Average temperature, 14 days", unit: "°C" },
  { key: "rain_sum_14d", vi: "Tổng lượng mưa 14 ngày", en: "Total rainfall, 14 days", unit: "mm" },
  { key: "humidity_avg_14d", vi: "Độ ẩm trung bình 14 ngày", en: "Average humidity, 14 days", unit: "%" },
  { key: "sun_hours_proxy", vi: "Giờ nắng ước tính mỗi ngày", en: "Estimated sun hours per day", unit: "" },
];

interface WeatherRefreshRecord {
  derived_metrics?: Record<string, number | string | null>;
  warnings?: string[];
  warnings_en?: string[];
  refreshed_at?: string;
  confidence?: string;
}

export default function CropPlanDetailPage() {
  const tr = useTr();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { accessToken } = useSessionStore();
  const [plan, setPlan] = useState<CropPlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [confirming, setConfirming] = useState<ConfirmKind>(null);
  const [statusPending, setStatusPending] = useState(false);
  const [reminderKey, setReminderKey] = useState(0);

  // `silent` keeps the page in place while an action refreshes it, instead of
  // swapping the whole screen back to the loading state on every tap.
  const loadPlan = useCallback(async (silent = false) => {
    if (!accessToken) return;
    try {
      if (!silent) setLoading(true);
      setError(null);
      const data = await fetchCropPlanDetail(accessToken, params.id);
      setPlan(data);
      const requestedStep = Number(searchParams.get("step"));
      setSelectedStepId(
        requestedStep || (data.steps.find((item) => item.status === "current")?.id ?? data.steps[0]?.id ?? null),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("Không tải được chi tiết kế hoạch.", "Could not load plan details."));
    } finally {
      setLoading(false);
    }
  }, [accessToken, params.id, searchParams]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  const selectedStep = useMemo(
    () => plan?.steps.find((step) => step.id === selectedStepId) ?? null,
    [plan, selectedStepId],
  );

  /** Every step action shares this: report failures, never fail silently. */
  async function runStepAction(task: () => Promise<unknown>, successMessage: string) {
    if (!accessToken) return;
    try {
      await task();
      await loadPlan(true);
      setReminderKey((current) => current + 1);
      toast.success(successMessage);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tr("Thao tác không thành công.", "The action did not go through."));
    }
  }

  async function handleComplete(stepId: number, note = "") {
    await runStepAction(
      () => completeCropPlanStep(accessToken, stepId, note),
      tr("Đã đánh dấu hoàn thành.", "Marked as complete."),
    );
  }

  async function handleReopen(stepId: number) {
    await runStepAction(
      () => reopenCropPlanStep(accessToken, stepId),
      tr("Đã bỏ đánh dấu hoàn thành.", "Completion undone."),
    );
  }

  async function handleDelay(stepId: number, delayDays: number, reason: string) {
    await runStepAction(
      () => delayCropPlanStep(accessToken, stepId, delayDays, reason),
      tr(`Đã dời lịch ${delayDays} ngày.`, `Rescheduled by ${delayDays} day(s).`),
    );
  }

  async function handleSaveNote(stepId: number, note: string) {
    await runStepAction(
      () => saveCropPlanStepNote(accessToken, stepId, note),
      note.trim() ? tr("Đã lưu ghi chú.", "Note saved.") : tr("Đã xóa ghi chú.", "Note cleared."),
    );
  }

  async function handleRefreshWeather() {
    if (!accessToken) return;
    try {
      setRefreshing(true);
      const result = await refreshCropPlanWeather(accessToken, params.id);
      await loadPlan(true);
      if (result.warnings.length) {
        toast.warning(tr(`Đã cập nhật thời tiết: ${result.warnings.length} cảnh báo cần xem.`, `Weather updated: ${result.warnings.length} warning(s) to review.`));
      } else {
        toast.success(tr("Đã cập nhật thời tiết, chưa có cảnh báo nào.", "Weather updated, no warnings."));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tr("Không cập nhật được thời tiết.", "Could not update the weather."));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleRegenerate() {
    if (!accessToken) return;
    try {
      setRegenerating(true);
      const next = await regenerateCropPlan(accessToken, params.id);
      setPlan(next);
      setSelectedStepId(next.steps[0]?.id ?? null);
      setConfirming(null);
      setReminderKey((current) => current + 1);
      toast.success(tr("Đã tạo lại lịch chăm cây.", "Care schedule rebuilt."));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tr("Không tạo lại được lịch.", "Could not rebuild the schedule."));
    } finally {
      setRegenerating(false);
    }
  }

  async function handleStatusChange(nextStatus: "active" | "archived") {
    if (!accessToken) return;
    try {
      setStatusPending(true);
      const next = await updateCropPlan(accessToken, params.id, { status: nextStatus });
      setPlan(next);
      setConfirming(null);
      toast.success(nextStatus === "archived" ? tr("Đã lưu trữ kế hoạch.", "Plan archived.") : tr("Đã khôi phục kế hoạch.", "Plan restored."));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tr("Không đổi được trạng thái kế hoạch.", "Could not change the plan status."));
    } finally {
      setStatusPending(false);
    }
  }

  async function handleDelete() {
    if (!accessToken) return;
    try {
      setStatusPending(true);
      await deleteCropPlan(accessToken, params.id);
      toast.success(tr("Đã xóa kế hoạch.", "Plan deleted."));
      router.push("/dashboard/crop-plans");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tr("Không xóa được kế hoạch.", "Could not delete the plan."));
      setStatusPending(false);
    }
  }

  if (loading) {
    return <LoadingState title={tr("Đang mở kế hoạch trồng", "Opening crop plan")} description={tr("Agromind AI đang lấy tiến độ, bước chăm sóc và nhắc việc.", "Agromind AI is loading progress, care steps, and reminders.")} />;
  }

  if (error || !plan) {
    return <ErrorState title={tr("Không mở được kế hoạch", "Could not open plan")} description={error ?? tr("Không tìm thấy kế hoạch này.", "This plan was not found.")} onRetry={() => void loadPlan()} />;
  }

  const confidenceLabel = climateConfidenceLabel(plan.climate_confidence);
  const confidenceNote = climateConfidenceNote(plan.climate_confidence);
  const weatherRefresh = (plan.metadata?.weather_refresh ?? null) as WeatherRefreshRecord | null;
  const refreshWarnings = weatherRefresh?.warnings ?? [];
  const refreshWarningsEn = weatherRefresh?.warnings_en ?? [];
  const completedSteps = plan.steps.filter((step) => step.status === "completed").length;

  return (
    <div className="fl-stagger mx-auto max-w-[1420px] space-y-6">
      <Card variant="raised" padding="lg" className="field-contours rounded-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-overline text-leaf-strong">
              {tr(plan.crop.name, withViFallback(plan.crop.name, plan.crop.name_en))} | {plan.location.name}
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.035em] text-ink sm:text-4xl">
              {tr(plan.title, withViFallback(plan.title, plan.title_en))}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cropPlanStatusTone(plan.status)}`}>
                {tr(...cropPlanStatusLabel(plan.status))}
              </span>
              <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold text-ink-soft">
                {tr(`Phiên bản lịch ${plan.plan_version}`, `Schedule version ${plan.plan_version}`)}
              </span>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-soft">{tr(plan.summary, withViFallback(plan.summary, plan.summary_en))}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-lg bg-surface px-4 py-3 text-sm shadow-sm">
              <p className="font-semibold text-leaf-strong">
                {plan.suitability_score === null
                  ? tr("Chưa chấm được mức phù hợp", "Suitability not scored yet")
                  : tr(`Phù hợp ${plan.suitability_score}/100`, `Suitability ${plan.suitability_score}/100`)}
              </p>
              {confidenceLabel ? (
                <p className="mt-1 text-xs text-ink-soft">{tr(...confidenceLabel)}</p>
              ) : null}
            </div>
            <Button variant="secondary" onClick={() => void handleRefreshWeather()} loading={refreshing} disabled={refreshing || regenerating}>
              <RefreshCcw size={16} />
              {tr("Cập nhật thời tiết", "Update weather")}
            </Button>
            <Button onClick={() => setConfirming("regenerate")} disabled={refreshing || regenerating}>
              <Sprout size={16} />
              {tr("Tạo lại lịch", "Regenerate schedule")}
            </Button>
            {plan.status === "archived" ? (
              <Button variant="secondary" onClick={() => void handleStatusChange("active")} loading={statusPending} disabled={statusPending}>
                <Undo2 size={16} />
                {tr("Khôi phục", "Restore")}
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setConfirming("archive")} disabled={statusPending}>
                <Archive size={16} />
                {tr("Lưu trữ", "Archive")}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setConfirming("delete")} disabled={statusPending}>
              <Trash2 size={16} />
              {tr("Xóa", "Delete")}
            </Button>
          </div>
        </div>
        {confidenceNote ? (
          <p className="mt-4 rounded-lg border border-line bg-surface-soft px-4 py-3 text-sm leading-6 text-ink-soft">
            {tr(...confidenceNote)}
          </p>
        ) : null}
      </Card>

      <CropPlanProgress plan={plan} reminderCount={plan.reminder_count} />

      {weatherRefresh ? (
        <Card variant={refreshWarnings.length ? "warning" : "default"} padding="lg" className="rounded-xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-overline text-leaf-strong">{tr("Kết quả cập nhật thời tiết", "Weather update result")}</p>
              <h3 className="mt-3 font-display text-2xl font-bold text-ink">
                {refreshWarnings.length
                  ? tr("Có điểm cần lưu ý cho 14 ngày tới", "Points to watch over the next 14 days")
                  : tr("Chưa có cảnh báo nào cho 14 ngày tới", "No warnings for the next 14 days")}
              </h3>
              {weatherRefresh.refreshed_at ? (
                <p className="mt-2 text-sm text-ink-soft">
                  {tr("Cập nhật lúc ", "Updated at ")}
                  {new Date(weatherRefresh.refreshed_at).toLocaleString("vi-VN")}
                </p>
              ) : null}
            </div>
            <span className="rounded-md bg-surface-soft p-3 text-leaf-strong">
              <CloudSun size={18} />
            </span>
          </div>

          {refreshWarnings.length ? (
            <ul className="mt-5 space-y-2 text-sm leading-7 text-ink">
              {refreshWarnings.map((warning, index) => (
                <li key={warning}>- {tr(warning, withViFallback(warning, refreshWarningsEn[index]))}</li>
              ))}
            </ul>
          ) : null}

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {climateMetricRows.map((row) => {
              const value = weatherRefresh.derived_metrics?.[row.key];
              return (
                <div key={row.key} className="rounded-lg border border-line bg-surface px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-leaf-strong">{tr(row.vi, row.en)}</p>
                  <p className="mt-2 text-sm font-semibold text-ink">
                    {value === null || value === undefined
                      ? tr("Chưa đủ dữ liệu", "Not enough data")
                      : `${value}${row.unit ? ` ${row.unit}` : ""}`}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card variant="default" padding="lg" className="rounded-xl">
            <p className="text-overline text-leaf-strong">
              {tr("Dòng thời gian chăm sóc", "Care timeline")}
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.03em] text-ink">
              {tr("Từng bước theo dõi từ lúc bắt đầu đến khi thu hoạch", "Track each step from planting to harvest")}
            </h2>
            <div className="mt-6">
              <CropPlanTimeline
                steps={plan.steps}
                selectedStepId={selectedStepId}
                onSelect={(step) => setSelectedStepId(step.id)}
                onComplete={(stepId) => handleComplete(stepId)}
              />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <CropPlanStepPanel
            step={selectedStep}
            onComplete={handleComplete}
            onReopen={handleReopen}
            onDelay={handleDelay}
            onSaveNote={handleSaveNote}
          />
          <ReminderCenter accessToken={accessToken} planId={plan.id} refreshKey={reminderKey} />
        </div>
      </div>

      <ConfirmDialog
        open={confirming === "regenerate"}
        title={tr("Tạo lại toàn bộ lịch chăm cây?", "Rebuild the whole care schedule?")}
        description={tr(
          "Hệ thống sẽ lấy lại dữ liệu khí hậu và dựng lại các bước cho kế hoạch này.",
          "The system will fetch the climate data again and rebuild every step of this plan.",
        )}
        consequences={[
          tr(
            `Tiến độ hiện tại bị đặt lại: ${completedSteps}/${plan.steps.length} bước đã hoàn thành sẽ trở về trạng thái chưa làm.`,
            `Current progress is reset: ${completedSteps} of ${plan.steps.length} completed steps go back to not started.`,
          ),
          tr(
            `${plan.reminder_count} nhắc việc hiện tại sẽ bị xóa và thay bằng lịch nhắc mới.`,
            `The current ${plan.reminder_count} reminders are removed and replaced with a new schedule.`,
          ),
          tr("Ghi chú bạn đã viết trong từng bước sẽ không còn.", "Notes you wrote on individual steps will be gone."),
          tr("Đường dẫn kế hoạch không đổi nên bạn vẫn ở đúng trang này.", "The plan link does not change, so you stay on this page."),
        ]}
        confirmLabel={tr("Tạo lại lịch", "Regenerate schedule")}
        pending={regenerating}
        onConfirm={() => void handleRegenerate()}
        onCancel={() => setConfirming(null)}
      />

      <ConfirmDialog
        open={confirming === "archive"}
        title={tr("Lưu trữ kế hoạch này?", "Archive this plan?")}
        description={tr(
          "Kế hoạch sẽ được ẩn khỏi danh sách chính nhưng dữ liệu vẫn còn nguyên.",
          "The plan is hidden from the main list, but all its data is kept.",
        )}
        consequences={[
          tr("Toàn bộ bước chăm cây, ghi chú và nhắc việc vẫn được giữ.", "All care steps, notes and reminders are kept."),
          tr("Bạn có thể khôi phục lại bất cứ lúc nào.", "You can restore it at any time."),
        ]}
        confirmLabel={tr("Lưu trữ", "Archive")}
        pending={statusPending}
        onConfirm={() => void handleStatusChange("archived")}
        onCancel={() => setConfirming(null)}
      />

      <ConfirmDialog
        open={confirming === "delete"}
        danger
        title={tr("Xóa vĩnh viễn kế hoạch này?", "Permanently delete this plan?")}
        description={tr(
          `“${plan.title}” sẽ bị xóa khỏi tài khoản và không khôi phục được.`,
          `"${plan.title}" will be removed from your account and cannot be recovered.`,
        )}
        consequences={[
          tr(
            `${plan.steps.length} bước chăm cây sẽ bị xóa, bao gồm ${completedSteps} bước đã hoàn thành.`,
            `${plan.steps.length} care steps will be removed, including ${completedSteps} already completed.`,
          ),
          tr(`${plan.reminder_count} nhắc việc của kế hoạch sẽ bị xóa.`, `${plan.reminder_count} reminders for this plan will be removed.`),
          tr("Nếu chỉ muốn ẩn kế hoạch, hãy chọn “Lưu trữ” thay vì xóa.", "Choose \"Archive\" instead if you only want to hide the plan."),
        ]}
        confirmLabel={tr("Xóa kế hoạch", "Delete plan")}
        pending={statusPending}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
