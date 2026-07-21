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
    nodeClass: "bg-surface text-ink-soft ring-1 ring-line",
    lineClass: "bg-line",
  },
  current: {
    label: "Đang thực hiện",
    icon: Clock3,
    nodeClass: "bg-leaf text-on-leaf shadow-md",
    lineClass: "bg-leaf/45",
  },
  completed: {
    label: "Đã hoàn thành",
    icon: CheckCircle2,
    nodeClass: "bg-leaf-strong text-on-leaf",
    lineClass: "bg-leaf",
  },
  skipped: {
    label: "Bỏ qua",
    icon: PauseCircle,
    nodeClass: "bg-surface-soft text-ink-soft",
    lineClass: "bg-line",
  },
  delayed: {
    label: "Bị đổi lịch",
    icon: TriangleAlert,
    nodeClass: "bg-sun text-forest",
    lineClass: "bg-[linear-gradient(to_bottom,var(--sun)_50%,transparent_50%)] bg-[length:100%_12px]",
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
                <span className="rounded-full bg-surface-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-leaf-strong">
                  {step.phase_key}
                </span>
              </div>
            ) : null}

            <div className="grid grid-cols-[60px_minmax(0,1fr)] gap-4">
              <div className="relative flex flex-col items-center">
                <div className="text-2xl font-bold text-leaf-strong">{step.step_number}</div>
                <div className={cn("mt-3 flex h-12 w-12 items-center justify-center rounded-full", meta.nodeClass)}>
                  <Icon size={18} />
                </div>
                {index < steps.length - 1 ? (
                  <div className={cn("mt-2 h-full min-h-[88px] w-[3px] rounded-full", meta.lineClass)} />
                ) : null}
              </div>

              <Card
                className={cn(
                  "mb-5 rounded-lg border-line bg-surface p-5 transition duration-180",
                  selectedStepId === step.id && "ring-2 ring-leaf/35 shadow-md",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-leaf-strong">
                        {step.short_label || step.title}
                      </span>
                      <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-soft">
                        {meta.label}
                      </span>
                    </div>
                    <h3 className="mt-3 font-display text-2xl font-bold text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-soft">{step.description}</p>
                  </div>
                  <div className="rounded-lg bg-surface-soft px-4 py-3 text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-leaf-strong">Thời gian</p>
                    <p className="mt-1 text-sm font-medium text-ink">
                      {new Date(step.suggested_start_time).toLocaleString("vi-VN")}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-line bg-surface-soft px-4 py-3 text-sm text-ink-soft">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-leaf-strong">Thời lượng</p>
                    <p className="mt-2 font-medium text-ink">{step.estimated_duration_minutes} phút</p>
                  </div>
                  <div className="rounded-lg border border-line bg-surface-soft px-4 py-3 text-sm text-ink-soft">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-leaf-strong">Nước tưới</p>
                    <p className="mt-2 font-medium text-ink">
                      {step.water_amount ? `${step.water_amount.value} ${step.water_amount.unit}` : "Theo dõi ẩm đất"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-line bg-surface-soft px-4 py-3 text-sm text-ink-soft">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-leaf-strong">Nắng</p>
                    <p className="mt-2 font-medium text-ink">{step.sunlight_requirement_text || "Theo điều kiện thực tế"}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={() => onSelect(step)}>
                    Xem chi tiết
                  </Button>
                  {step.status !== "completed" ? (
                    <Button onClick={() => onComplete(step.id)}>Hoàn thành</Button>
                  ) : (
                    <span className="rounded-full bg-surface-soft px-4 py-3 text-sm font-medium text-leaf-strong">
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
