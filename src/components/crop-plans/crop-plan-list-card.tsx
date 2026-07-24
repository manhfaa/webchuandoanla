"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin, Sprout } from "lucide-react";

import type { CropPlan } from "@/types";
import { Card } from "@/components/ui/card";
import { useTr } from "@/lib/use-tr";

const planStatusTone: Record<string, string> = {
  active: "bg-surface-soft text-leaf-strong",
  completed: "bg-info-soft text-info-ink",
  needs_review: "bg-sun-soft text-warning-ink",
  paused: "bg-surface-soft text-ink-soft",
  draft: "bg-surface-soft text-leaf-strong",
  archived: "bg-surface-soft text-ink-soft",
};

export function CropPlanListCard({ plan }: { plan: CropPlan }) {
  const tr = useTr();
  const nextStep = plan.steps.find((step) => step.status === "current") ?? plan.steps[0];

  return (
    <Link href={`/dashboard/crop-plans/${plan.id}`}>
      <Card variant="default" padding="lg" className="group rounded-xl transition duration-180 hover:-translate-y-[3px] hover:border-leaf/35 hover:shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-leaf-strong">
                {plan.crop.name}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${planStatusTone[plan.status] ?? planStatusTone.active}`}
              >
                {plan.status}
              </span>
            </div>
            <h3 className="mt-4 font-display text-2xl font-bold text-ink">
              {plan.title}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-soft">{plan.summary}</p>
          </div>
          <span className="rounded-md bg-surface-soft p-3 text-ink-soft shadow-sm transition duration-180 group-hover:bg-leaf group-hover:text-on-leaf">
            <ArrowUpRight size={18} />
          </span>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-line bg-surface-soft px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-leaf-strong">
              <MapPin size={14} />
              {tr("Vị trí", "Location")}
            </div>
            <p className="mt-2 text-sm font-semibold text-ink">{plan.location.name}</p>
          </div>
          <div className="rounded-lg border border-line bg-surface-soft px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-leaf-strong">
              <CalendarDays size={14} />
              {tr("Bắt đầu đề xuất", "Recommended start")}
            </div>
            <p className="mt-2 text-sm font-semibold text-ink">{plan.recommended_start_date ?? plan.planned_start_date}</p>
          </div>
          <div className="rounded-lg border border-line bg-surface-soft px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-leaf-strong">
              <Sprout size={14} />
              {tr("Bước tiếp theo", "Next step")}
            </div>
            <p className="mt-2 text-sm font-semibold text-ink">
              {nextStep ? `${nextStep.step_number}. ${nextStep.title}` : tr("Đang cập nhật", "Updating")}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
