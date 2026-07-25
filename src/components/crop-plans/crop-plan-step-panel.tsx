"use client";

import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, Clock3, FileText, MoveRight, NotebookText, RotateCcw, TriangleAlert } from "lucide-react";

import type { CropPlanStep } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cropPlanStepEnglish, withViFallback, withViFallbackList } from "@/lib/crop-plan-labels";
import { useTr } from "@/lib/use-tr";
import { cropPlanStepStatusLabel } from "./crop-plan-status";

const DEFAULT_DELAY_REASON = "Dời 1 ngày để canh thời tiết tốt hơn";

type PendingAction = "note" | "delay" | "complete" | "reopen" | null;

export function CropPlanStepPanel({
  step,
  onComplete,
  onReopen,
  onDelay,
  onSaveNote,
}: {
  step: CropPlanStep | null;
  onComplete: (stepId: number, note: string) => Promise<void>;
  onReopen: (stepId: number) => Promise<void>;
  onDelay: (stepId: number, delayDays: number, reason: string) => Promise<void>;
  onSaveNote: (stepId: number, note: string) => Promise<void>;
}) {
  const tr = useTr();
  const [note, setNote] = useState("");
  const [delayDays, setDelayDays] = useState(1);
  const [delayReason, setDelayReason] = useState("");
  const [pending, setPending] = useState<PendingAction>(null);

  useEffect(() => {
    setNote(step?.user_notes ?? "");
    setDelayDays(1);
    setDelayReason("");
  }, [step]);

  if (!step) {
    return (
      <Card variant="soft" className="rounded-xl">
        <p className="text-sm leading-7 text-ink-soft">
          {tr("Chọn một bước trong timeline để xem hướng dẫn chi tiết, ghi chú và cập nhật tiến độ.", "Select a step in the timeline to see detailed guidance, notes and update progress.")}
        </p>
      </Card>
    );
  }

  const stepEn = cropPlanStepEnglish(step);
  const toolsNeededEn = withViFallbackList(step.tools_needed, stepEn.tools_needed_en);
  const riskNotesEn = withViFallbackList(step.risk_notes, stepEn.risk_notes_en);
  const isCompleted = step.status === "completed";

  async function run(action: Exclude<PendingAction, null>, task: () => Promise<void>) {
    setPending(action);
    try {
      await task();
    } finally {
      setPending(null);
    }
  }

  return (
    <Card variant="raised" padding="lg" className="rounded-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-overline text-leaf-strong">
            {tr("Bước ", "Step ")}{step.step_number}
          </p>
          <h3 className="mt-3 font-display text-2xl font-bold text-ink">
            {tr(step.title, withViFallback(step.title, stepEn.title_en))}
          </h3>
          <p className="mt-2 text-sm leading-7 text-ink-soft">
            {tr(step.description, withViFallback(step.description, stepEn.description_en))}
          </p>
        </div>
        <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold text-leaf-strong">
          {tr(...cropPlanStepStatusLabel(step.status))}
        </span>
      </div>

      <div className="mt-6 grid gap-3">
        <div className="rounded-lg border border-line bg-surface-soft p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <Clock3 size={16} className="text-leaf-strong" />
            {tr("Làm vào lúc nào", "When to do it")}
          </div>
          <p className="mt-2 text-sm leading-7 text-ink-soft">
            {tr("Bắt đầu: ", "Start: ")}{new Date(step.suggested_start_time).toLocaleString("vi-VN")}
            <br />
            {tr("Kết thúc: ", "End: ")}{new Date(step.suggested_end_time).toLocaleString("vi-VN")}
            {step.completed_at ? (
              <>
                <br />
                {tr("Đã hoàn thành lúc: ", "Completed at: ")}{new Date(step.completed_at).toLocaleString("vi-VN")}
              </>
            ) : null}
          </p>
          {step.delay_reason ? (
            <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-warning-ink">
              <CalendarClock size={16} className="mt-0.5 shrink-0" />
              {tr(`Lý do đổi lịch: ${step.delay_reason}`, `Reschedule reason: ${step.delay_reason}`)}
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <MoveRight size={16} className="text-leaf-strong" />
            {tr("Vì sao bước này quan trọng", "Why this step matters")}
          </div>
          <p className="mt-2 text-sm leading-7 text-ink-soft">
            {tr(
              step.why_this_step_matters,
              withViFallback(step.why_this_step_matters, stepEn.why_this_step_matters_en),
            )}
          </p>
        </div>

        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <FileText size={16} className="text-leaf-strong" />
            {tr("Cần chuẩn bị", "What to prepare")}
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-ink-soft">
            {step.tools_needed.map((tool, index) => (
              <li key={tool}>- {tr(tool, toolsNeededEn[index] ?? tool)}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <CheckCircle2 size={16} className="text-leaf-strong" />
            {tr("Dấu hiệu làm đúng", "Signs you did it right")}
          </div>
          <p className="mt-2 text-sm leading-7 text-ink-soft">
            {tr(step.completion_condition, withViFallback(step.completion_condition, stepEn.completion_condition_en))}
          </p>
        </div>

        <div className="rounded-lg border border-sun/30 bg-sun-soft p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <TriangleAlert size={16} className="text-warning-ink" />
            {tr("Lưu ý rủi ro", "Risk notes")}
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-ink-soft">
            {step.risk_notes.map((risk, index) => (
              <li key={risk}>- {tr(risk, riskNotesEn[index] ?? risk)}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-line bg-surface p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-ink">
          <NotebookText size={16} className="text-leaf-strong" />
          {tr("Ghi chú của bạn", "Your notes")}
        </div>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={2000}
          className="mt-3 min-h-[120px] w-full rounded-md border border-line bg-surface-soft px-4 py-3 text-sm leading-7 text-ink outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
          placeholder={tr("Ghi lại tình trạng cây, số lượng đã làm, điều cần nhớ...", "Record the plant's condition, how much you did, things to remember...")}
        />
        <p className="mt-2 text-xs text-ink-soft">
          {tr("Để trống rồi lưu nếu muốn xóa ghi chú.", "Clear the box and save to remove the note.")}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => void run("note", () => onSaveNote(step.id, note))}
            loading={pending === "note"}
            disabled={pending !== null}
          >
            {tr("Lưu ghi chú", "Save note")}
          </Button>
          {isCompleted ? (
            <Button
              variant="secondary"
              onClick={() => void run("reopen", () => onReopen(step.id))}
              loading={pending === "reopen"}
              disabled={pending !== null}
            >
              <RotateCcw size={16} />
              {tr("Bỏ đánh dấu hoàn thành", "Undo completion")}
            </Button>
          ) : (
            <Button
              onClick={() => void run("complete", () => onComplete(step.id, note))}
              loading={pending === "complete"}
              disabled={pending !== null}
            >
              {tr("Đánh dấu hoàn thành", "Mark as complete")}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-line bg-surface p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-ink">
          <CalendarClock size={16} className="text-leaf-strong" />
          {tr("Dời lịch bước này", "Reschedule this step")}
        </div>
        {isCompleted ? (
          <p className="mt-2 text-sm leading-7 text-ink-soft">
            {tr("Bước đã hoàn thành. Hãy bỏ đánh dấu hoàn thành trước nếu muốn dời lịch.", "This step is complete. Undo the completion first if you want to reschedule it.")}
          </p>
        ) : (
          <>
            <div className="mt-3 grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-ink-soft">{tr("Số ngày", "Days")}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={30}
                  value={delayDays}
                  onChange={(event) => setDelayDays(Number(event.target.value))}
                  className="w-full rounded-md border border-line bg-surface-soft px-4 py-3 text-sm text-ink outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-ink-soft">{tr("Lý do (tùy chọn)", "Reason (optional)")}</span>
                <input
                  value={delayReason}
                  onChange={(event) => setDelayReason(event.target.value)}
                  maxLength={255}
                  placeholder={tr(DEFAULT_DELAY_REASON, "Postponing to wait for better weather")}
                  className="w-full rounded-md border border-line bg-surface-soft px-4 py-3 text-sm text-ink outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                />
              </label>
            </div>
            <div className="mt-4">
              <Button
                variant="secondary"
                onClick={() =>
                  void run("delay", () =>
                    onDelay(step.id, delayDays, delayReason.trim() || DEFAULT_DELAY_REASON),
                  )
                }
                loading={pending === "delay"}
                disabled={pending !== null || !Number.isFinite(delayDays) || delayDays < 1 || delayDays > 30}
              >
                {tr(`Dời ${delayDays || 1} ngày`, `Postpone ${delayDays || 1} day(s)`)}
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
