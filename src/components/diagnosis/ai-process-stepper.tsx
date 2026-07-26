"use client";

import type { CSSProperties } from "react";

import { AlertTriangle, CheckCircle2, Clock3, ImagePlus, ScanSearch } from "lucide-react";

import { StatusBadge, type StatusBadgeState } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";
import type { DiagnosisStepKey, DiagnosisStepState } from "@/types";

type Tr = (vi: string, en: string) => string;

export interface StepItem {
  key: DiagnosisStepKey;
  title: string;
  description: string;
  state: DiagnosisStepState;
  detail: string;
}

function getStateMeta(state: DiagnosisStepState, tr: Tr): { label: string; status: StatusBadgeState } {
  if (state === "success") return { label: tr("Hoàn tất", "Done"), status: "healthy" };
  if (state === "warning") return { label: tr("Cần thử lại", "Try again"), status: "urgent" };
  if (state === "processing") return { label: tr("Đang thực hiện", "In progress"), status: "processing" };
  if (state === "queued") return { label: tr("Đang chờ", "Waiting"), status: "neutral" };
  if (state === "locked") return { label: tr("Chưa thể tiếp tục", "Cannot continue yet"), status: "neutral" };
  return { label: tr("Chưa bắt đầu", "Not started"), status: "neutral" };
}

function getStepIcon(step: StepItem) {
  if (step.state === "warning") return AlertTriangle;
  if (step.state === "success") return CheckCircle2;
  if (step.key === "upload") return ImagePlus;
  if (step.state === "processing") return ScanSearch;
  return Clock3;
}

export function AIProcessStepper({ steps }: { steps: StepItem[] }) {
  const tr = useTr();
  return (
    <section>
      <div className="mb-4">
        <p className="text-overline text-leaf-strong">{tr("Tiến trình kiểm tra", "Check progress")}</p>
        <h2 className="mt-2 text-h2 font-bold text-ink">{tr("Từ ảnh lá đến việc nên làm", "From leaf photo to what to do")}</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = getStepIcon(step);
          const meta = getStateMeta(step.state, tr);
          const active = step.state === "success" || step.state === "processing";
          const railFill =
            step.state === "success"
              ? "w-full bg-leaf"
              : step.state === "warning"
                ? "w-full bg-danger"
                : step.state === "processing"
                  ? "w-1/2 bg-leaf"
                  : null;

          return (
            <Card
              key={step.key}
              variant={active ? "soft" : "default"}
              padding="sm"
              className={cn("fl-rise relative min-h-[216px] overflow-hidden rounded-lg", step.state === "warning" && "border-danger/30 bg-danger-soft")}
              style={{ "--fl-i": index } as CSSProperties}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-md transition-colors duration-260",
                    active ? "bg-surface text-leaf-strong" : "bg-surface-soft text-ink-soft",
                    step.state === "warning" && "bg-surface text-danger-ink",
                    step.state === "processing" && "fl-pulse",
                  )}
                >
                  <span key={step.state} className={cn(step.state === "success" && "fl-check", "flex items-center justify-center")}>
                    <Icon size={18} aria-hidden />
                  </span>
                </span>
                <StatusBadge status={meta.status} label={meta.label} />
              </div>
              <div className="mt-4 h-[3px] w-full overflow-hidden rounded-full bg-line/70" aria-hidden>
                {railFill ? <span key={step.state} className={cn("block h-full rounded-full", railFill, "fl-rail-x")} /> : null}
              </div>
              <p className="mt-4 text-overline text-leaf-strong">{tr(`Bước ${index + 1}`, `Step ${index + 1}`)}</p>
              <h3 className="mt-2 text-base font-bold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{step.description}</p>
              <p className="mt-4 border-t border-line pt-3 text-xs font-medium leading-6 text-ink-soft">{step.detail}</p>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
