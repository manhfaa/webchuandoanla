"use client";

import type { CSSProperties } from "react";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { StatusBadge, type StatusBadgeState } from "@/components/ui/badge";
import { PlateNumber } from "@/components/ui/field-notebook";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";
import type { DiagnosisStepKey, DiagnosisStepState } from "@/types";

/* V2 — STEPPER CHẨN ĐOÁN
   Sửa: 4 card cao 216px giống hệt nhau, mỗi card mở đầu bằng icon chip 40x40
        -> 4 cột trên dòng kẻ, dẫn bằng số hiệu mono 01–04, thấp hơn ~35%.
        Icon chỉ còn xuất hiện khi mang thông tin thật (hoàn tất / cần thử lại).
   Giữ: DiagnosisStepKey, DiagnosisStepState, StatusBadge, rail tiến trình,
        toàn bộ title/description/detail truyền từ trang chẩn đoán. */

type Tr = (vi: string, en: string) => string;

export interface StepItem {
  key: DiagnosisStepKey;
  title: string;
  description: string;
  state: DiagnosisStepState;
  detail: string;
}

function getStateMeta(
  state: DiagnosisStepState,
  tr: Tr,
): { label: string; status: StatusBadgeState } {
  if (state === "success") return { label: tr("Hoàn tất", "Done"), status: "healthy" };
  if (state === "warning") return { label: tr("Cần thử lại", "Try again"), status: "urgent" };
  if (state === "processing")
    return { label: tr("Đang thực hiện", "In progress"), status: "processing" };
  if (state === "queued") return { label: tr("Đang chờ", "Waiting"), status: "neutral" };
  if (state === "locked")
    return { label: tr("Chưa thể tiếp tục", "Cannot continue yet"), status: "neutral" };
  return { label: tr("Chưa bắt đầu", "Not started"), status: "neutral" };
}

export function AIProcessStepper({ steps }: { steps: StepItem[] }) {
  const tr = useTr();

  return (
    <section>
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-leaf-strong">
          {tr("Tiến trình kiểm tra", "Check progress")}
        </p>
        <h2 className="mt-2 font-display text-[20px] font-bold tracking-[-0.02em] text-ink">
          {tr("Từ ảnh lá đến việc nên làm", "From leaf photo to what to do")}
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => {
          const meta = getStateMeta(step.state, tr);
          const active = step.state === "success" || step.state === "processing";
          const warning = step.state === "warning";
          const railWidth =
            step.state === "success" || warning
              ? "100%"
              : step.state === "processing"
                ? "50%"
                : "0%";

          return (
            <article
              key={step.key}
              className={cn(
                "fl-rise flex min-h-[150px] flex-col rounded-[var(--r-lg)] border p-5 transition-colors duration-260",
                warning
                  ? "border-danger/30 bg-danger-soft"
                  : active
                    ? "border-leaf/35 bg-surface-soft"
                    : "border-line bg-surface",
              )}
              style={{ "--fl-i": index } as CSSProperties}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <PlateNumber
                    n={index + 1}
                    tone={active || warning ? "leaf" : "ink"}
                    size="sm"
                  />
                  {step.state === "success" ? (
                    <CheckCircle2 size={14} aria-hidden className="text-leaf" />
                  ) : null}
                  {warning ? (
                    <AlertTriangle size={14} aria-hidden className="text-danger-ink" />
                  ) : null}
                </span>
                <StatusBadge status={meta.status} label={meta.label} />
              </div>

              <div
                className="mt-3.5 h-[3px] w-full overflow-hidden rounded-full bg-line/70"
                aria-hidden
              >
                <span
                  key={step.state}
                  className={cn(
                    "fl-rail-x block h-full rounded-full transition-[width] duration-260",
                    warning ? "bg-danger" : "bg-leaf",
                  )}
                  style={{ width: railWidth }}
                />
              </div>

              <h3 className="mt-4 font-display text-[16.5px] font-bold tracking-[-0.015em] text-ink">
                {step.title}
              </h3>
              <p className="mt-1.5 text-[13.5px] leading-[1.6] text-ink-soft">
                {step.description}
              </p>
              <p className="mt-auto border-t border-paper-rule pt-3 text-[12px] font-medium leading-[1.55] text-ink-soft">
                {step.detail}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
