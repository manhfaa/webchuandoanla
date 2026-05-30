import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin, Sprout } from "lucide-react";

import type { CropPlan } from "@/types";
import { Card } from "@/components/ui/card";

const planStatusTone: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  completed: "bg-sky-100 text-sky-800",
  needs_review: "bg-amber-100 text-amber-800",
  paused: "bg-slate-200 text-slate-700",
  draft: "bg-lime-100 text-lime-800",
  archived: "bg-slate-200 text-slate-700",
};

export function CropPlanListCard({ plan }: { plan: CropPlan }) {
  const nextStep = plan.steps.find((step) => step.status === "current") ?? plan.steps[0];

  return (
    <Link href={`/dashboard/crop-plans/${plan.id}`}>
      <Card className="group rounded-[30px] border-emerald-100/70 bg-gradient-to-br from-white via-white to-emerald-50/70 transition duration-300 hover:-translate-y-1 hover:shadow-float">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">
                {plan.crop.name}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${planStatusTone[plan.status] ?? planStatusTone.active}`}
              >
                {plan.status}
              </span>
            </div>
            <h3 className="mt-4 font-display text-2xl font-semibold text-slate-950">
              {plan.title}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{plan.summary}</p>
          </div>
          <span className="rounded-full bg-white p-3 text-slate-700 shadow-soft transition duration-300 group-hover:bg-emerald-600 group-hover:text-white">
            <ArrowUpRight size={18} />
          </span>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-100 bg-white/85 px-4 py-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-emerald-700/65">
              <MapPin size={14} />
              Vị trí
            </div>
            <p className="mt-2 text-sm font-medium text-slate-900">{plan.location.name}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white/85 px-4 py-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-emerald-700/65">
              <CalendarDays size={14} />
              Bắt đầu đề xuất
            </div>
            <p className="mt-2 text-sm font-medium text-slate-900">{plan.recommended_start_date ?? plan.planned_start_date}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white/85 px-4 py-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-emerald-700/65">
              <Sprout size={14} />
              Bước tiếp theo
            </div>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {nextStep ? `${nextStep.step_number}. ${nextStep.title}` : "Đang cập nhật"}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
