import { AlertTriangle, CheckCircle2, Clock3, ImagePlus, ScanSearch } from "lucide-react";

import { StatusBadge, type StatusBadgeState } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DiagnosisStepKey, DiagnosisStepState } from "@/types";

export interface StepItem {
  key: DiagnosisStepKey;
  title: string;
  description: string;
  state: DiagnosisStepState;
  detail: string;
}

function getStateMeta(state: DiagnosisStepState): { label: string; status: StatusBadgeState } {
  if (state === "success") return { label: "Hoàn tất", status: "healthy" };
  if (state === "warning") return { label: "Cần thử lại", status: "urgent" };
  if (state === "processing") return { label: "Đang thực hiện", status: "processing" };
  if (state === "queued") return { label: "Đang chờ", status: "neutral" };
  if (state === "locked") return { label: "Chưa thể tiếp tục", status: "neutral" };
  return { label: "Chưa bắt đầu", status: "neutral" };
}

function getStepIcon(step: StepItem) {
  if (step.state === "warning") return AlertTriangle;
  if (step.state === "success") return CheckCircle2;
  if (step.key === "upload") return ImagePlus;
  if (step.state === "processing") return ScanSearch;
  return Clock3;
}

export function AIProcessStepper({ steps }: { steps: StepItem[] }) {
  return (
    <section>
      <div className="mb-4">
        <p className="text-overline text-leaf-strong">Tiến trình kiểm tra</p>
        <h2 className="mt-2 text-h2 font-bold text-ink">Từ ảnh lá đến việc nên làm</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = getStepIcon(step);
          const meta = getStateMeta(step.state);
          const active = step.state === "success" || step.state === "processing";

          return (
            <Card key={step.key} variant={active ? "soft" : "default"} padding="sm" className={cn("relative min-h-[216px] overflow-hidden rounded-lg", step.state === "warning" && "border-danger/25 bg-danger/10")}>
              <div className="flex items-center justify-between gap-3">
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-md", active ? "bg-surface text-leaf-strong" : "bg-surface-soft text-ink-soft", step.state === "warning" && "bg-surface text-danger")}>
                  <Icon size={18} aria-hidden />
                </span>
                <StatusBadge status={meta.status} label={meta.label} />
              </div>
              <p className="mt-5 text-overline text-leaf-strong">Bước {index + 1}</p>
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
