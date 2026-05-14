import { AlertTriangle, CheckCircle2, Clock3, LockKeyhole, ScanSearch } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DiagnosisStepKey, DiagnosisStepState } from "@/types";
import { cn } from "@/lib/utils";

export interface StepItem {
  key: DiagnosisStepKey;
  title: string;
  description: string;
  state: DiagnosisStepState;
  detail: string;
}

function getStateIcon(state: DiagnosisStepState) {
  if (state === "success") return CheckCircle2;
  if (state === "warning") return AlertTriangle;
  if (state === "locked") return LockKeyhole;
  if (state === "processing") return ScanSearch;
  return Clock3;
}

function getStateLabel(state: DiagnosisStepState) {
  if (state === "success") return "Hoàn tất";
  if (state === "warning") return "Cần thử lại";
  if (state === "locked") return "Đang khóa";
  if (state === "processing") return "Đang chạy";
  if (state === "queued") return "Đang chờ";
  return "Chưa bắt đầu";
}

export function AIProcessStepper({ steps }: { steps: StepItem[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {steps.map((step, index) => {
        const Icon = getStateIcon(step.state);
        const active = step.state === "success" || step.state === "processing";

        return (
          <Card
            key={step.key}
            className={cn(
              "rounded-[30px] border-emerald-100 bg-white/90",
              active && "ring-1 ring-emerald-200 shadow-float",
              step.state === "locked" && "bg-slate-50/90",
            )}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-brand-700">
                <Icon size={20} />
              </div>
              <Badge
                variant={
                  step.state === "success"
                    ? "success"
                    : step.state === "warning"
                      ? "warning"
                      : step.state === "locked"
                        ? "muted"
                        : "brand"
                }
              >
                {getStateLabel(step.state)}
              </Badge>
            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
              Bước {index + 1}
            </p>
            <h3 className="mt-2 font-display text-2xl font-semibold text-ink">{step.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
            <div className="mt-5 rounded-[24px] bg-emerald-50 px-4 py-3 text-sm leading-6 text-slate-700">
              {step.detail}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
