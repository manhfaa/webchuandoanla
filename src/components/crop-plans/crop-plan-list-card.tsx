"use client";

import Link from "next/link";
import { Archive, ArrowUpRight, CalendarDays, MapPin, Sprout, Trash2, Undo2 } from "lucide-react";

import type { CropPlanListItem } from "@/lib/crop-plans-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { withViFallback } from "@/lib/crop-plan-labels";
import { useTr } from "@/lib/use-tr";
import { cropPlanStatusLabel, cropPlanStatusTone } from "./crop-plan-status";

export function CropPlanListCard({
  plan,
  onArchive,
  onUnarchive,
  onDelete,
  pending = false,
}: {
  plan: CropPlanListItem;
  onArchive: (plan: CropPlanListItem) => void;
  onUnarchive: (plan: CropPlanListItem) => void;
  onDelete: (plan: CropPlanListItem) => void;
  pending?: boolean;
}) {
  const tr = useTr();
  const nextStep = plan.current_step;
  const isArchived = plan.status === "archived";

  return (
    <Card variant="default" padding="lg" className="group rounded-xl transition duration-180 hover:-translate-y-[3px] hover:border-leaf/35 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-leaf-strong">
              {tr(plan.crop.name, withViFallback(plan.crop.name, plan.crop.name_en))}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cropPlanStatusTone(plan.status)}`}>
              {tr(...cropPlanStatusLabel(plan.status))}
            </span>
          </div>
          <Link href={`/dashboard/crop-plans/${plan.id}`} className="no-underline">
            <h3 className="mt-4 font-display text-2xl font-bold text-ink">
              {tr(plan.title, withViFallback(plan.title, plan.title_en))}
            </h3>
          </Link>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-soft">{tr(plan.summary, withViFallback(plan.summary, plan.summary_en))}</p>
        </div>
        <Link href={`/dashboard/crop-plans/${plan.id}`} className="no-underline" aria-label={tr("Mở kế hoạch", "Open plan")}>
          <span className="rounded-md bg-surface-soft p-3 text-ink-soft shadow-sm transition duration-180 group-hover:bg-leaf group-hover:text-on-leaf">
            <ArrowUpRight size={18} />
          </span>
        </Link>
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
            {nextStep
              ? `${nextStep.step_number}. ${tr(nextStep.title, withViFallback(nextStep.title, nextStep.title_en))}`
              : tr("Đã xong tất cả các bước", "All steps are done")}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-soft">
          {tr(
            `${plan.completed_step_count}/${plan.step_count} bước đã xong`,
            `${plan.completed_step_count}/${plan.step_count} steps done`,
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          {isArchived ? (
            <Button size="sm" variant="secondary" onClick={() => onUnarchive(plan)} disabled={pending}>
              <Undo2 size={14} />
              {tr("Khôi phục", "Restore")}
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => onArchive(plan)} disabled={pending}>
              <Archive size={14} />
              {tr("Lưu trữ", "Archive")}
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => onDelete(plan)} disabled={pending}>
            <Trash2 size={14} />
            {tr("Xóa", "Delete")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
