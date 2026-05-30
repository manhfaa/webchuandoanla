"use client";

import { CheckCircle2, CircleDashed, Clock3, PauseCircle, TriangleAlert } from "lucide-react";

import type { CropPlanStep, CropPlanStepStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const statusMeta: Record<
  CropPlanStepStatus,
  {
    label: string;
    icon: typeof CircleDashed;
    nodeClass: string;
    lineClass: string;
  }
> = {
  pending: {
    label: "Sắp tới",
    icon: CircleDashed,
    nodeClass: "bg-white text-slate-400 ring-1 ring-slate-200",
    lineClass: "bg-slate-200",
  },
  current: {
    label: "Đang thực hiện",
    icon: Clock3,
    nodeClass: "bg-emerald-600 text-white shadow-float",
    lineClass: "bg-emerald-300",
  },
  completed: {
    label: "Đã hoàn thành",
    icon: CheckCircle2,
    nodeClass: "bg-brand-600 text-white",
    lineClass: "bg-brand-500",
  },
  skipped: {
    label: "Bỏ qua",
    icon: PauseCircle,
    nodeClass: "bg-slate-300 text-slate-700",
    lineClass: "bg-slate-300",
  },
  delayed: {
    label: "Bị đổi lịch",
    icon: TriangleAlert,
    nodeClass: "bg-amber-500 text-white",
    lineClass: "bg-[linear-gradient(to_bottom,#f59e0b_50%,transparent_50%)] bg-[length:100%_12px]",
  },
};

export function CropPlanTimeline({
  steps,
  selectedStepId,
  onSelect,
  onComplete,
}: {
  steps: CropPlanStep[];
  selectedStepId: number | null;
  onSelect: (step: CropPlanStep) => void;
  onComplete: (stepId: number) => Promise<void>;
}) {
  let previousPhase = "";

  return (
    <div className="space-y-5">
      {steps.map((step, index) => {
        const meta = statusMeta[step.status];
        const Icon = meta.icon;
        const showPhase = step.phase_key !== previousPhase;
        previousPhase = step.phase_key;

        return (
          <div key={step.id}>
            {showPhase ? (
              <div className="mb-4 flex items-center gap-3">
                <span className="rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-800">
                  {step.phase_key}
                </span>
              </div>
            ) : null}

            <div className="grid grid-cols-[60px_minmax(0,1fr)] gap-4">
              <div className="relative flex flex-col items-center">
                <div className="text-2xl font-semibold text-emerald-900/80">{step.step_number}</div>
                <div className={cn("mt-3 flex h-12 w-12 items-center justify-center rounded-full", meta.nodeClass)}>
                  <Icon size={18} />
                </div>
                {index < steps.length - 1 ? (
                  <div className={cn("mt-2 h-full min-h-[88px] w-[3px] rounded-full", meta.lineClass)} />
                ) : null}
              </div>

              <Card
                className={cn(
                  "mb-5 rounded-[28px] border-emerald-100/70 bg-white/92 p-5 transition duration-200",
                  selectedStepId === step.id && "ring-2 ring-emerald-300 shadow-float",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                        {step.short_label || step.title}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        {meta.label}
                      </span>
                    </div>
                    <h3 className="mt-3 font-display text-2xl font-semibold text-slate-950">
                      {step.title}
                    </h3>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{step.description}</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50/80 px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-[0.18em] text-emerald-700/65">Thời gian</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {new Date(step.suggested_start_time).toLocaleString("vi-VN")}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-slate-700">
                    <p className="text-xs uppercase tracking-[0.18em] text-emerald-700/65">Thời lượng</p>
                    <p className="mt-2 font-medium text-slate-900">{step.estimated_duration_minutes} phút</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-slate-700">
                    <p className="text-xs uppercase tracking-[0.18em] text-emerald-700/65">Nước tưới</p>
                    <p className="mt-2 font-medium text-slate-900">
                      {step.water_amount ? `${step.water_amount.value} ${step.water_amount.unit}` : "Theo dõi ẩm đất"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-slate-700">
                    <p className="text-xs uppercase tracking-[0.18em] text-emerald-700/65">Nắng</p>
                    <p className="mt-2 font-medium text-slate-900">{step.sunlight_requirement_text || "Theo điều kiện thực tế"}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={() => onSelect(step)}>
                    Xem chi tiết
                  </Button>
                  {step.status !== "completed" ? (
                    <Button onClick={() => onComplete(step.id)}>Hoàn thành</Button>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-4 py-3 text-sm font-medium text-emerald-800">
                      Bước này đã xong
                    </span>
                  )}
                </div>
              </Card>
            </div>
          </div>
        );
      })}
    </div>
  );
}
