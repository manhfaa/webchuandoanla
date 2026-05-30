"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { RefreshCcw, Sprout } from "lucide-react";

import { CropPlanProgress } from "@/components/crop-plans/crop-plan-progress";
import { CropPlanStepPanel } from "@/components/crop-plans/crop-plan-step-panel";
import { CropPlanTimeline } from "@/components/crop-plans/crop-plan-timeline";
import { ReminderCenter } from "@/components/crop-plans/reminder-center";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  completeCropPlanStep,
  delayCropPlanStep,
  fetchCropPlanDetail,
  markReminderRead,
  refreshCropPlanWeather,
  regenerateCropPlan,
  saveCropPlanStepNote,
} from "@/lib/crop-plans-client";
import { useSessionStore } from "@/store/session-store";
import type { CropPlan } from "@/types";

export default function CropPlanDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { accessToken } = useSessionStore();
  const [plan, setPlan] = useState<CropPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadPlan = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      const data = await fetchCropPlanDetail(accessToken, params.id);
      setPlan(data);
      const requestedStep = Number(searchParams.get("step"));
      setSelectedStepId(
        requestedStep || (data.steps.find((item) => item.status === "current")?.id ?? data.steps[0]?.id ?? null),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được chi tiết kế hoạch.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, params.id, searchParams]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  const selectedStep = useMemo(
    () => plan?.steps.find((step) => step.id === selectedStepId) ?? null,
    [plan, selectedStepId],
  );

  async function handleComplete(stepId: number, note = "") {
    if (!accessToken) return;
    await completeCropPlanStep(accessToken, stepId, note);
    await loadPlan();
  }

  async function handleDelay(stepId: number, delayDays: number, reason: string) {
    if (!accessToken) return;
    await delayCropPlanStep(accessToken, stepId, delayDays, reason);
    await loadPlan();
  }

  async function handleSaveNote(stepId: number, note: string) {
    if (!accessToken) return;
    await saveCropPlanStepNote(accessToken, stepId, note);
    await loadPlan();
  }

  async function handleRefreshWeather() {
    if (!accessToken) return;
    try {
      setRefreshing(true);
      await refreshCropPlanWeather(accessToken, params.id);
      await loadPlan();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleRegenerate() {
    if (!accessToken) return;
    try {
      setRefreshing(true);
      const nextPlan = await regenerateCropPlan(accessToken, params.id);
      setPlan(nextPlan);
      setSelectedStepId(nextPlan.steps[0]?.id ?? null);
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-44 rounded-[30px]" />
        <Skeleton className="h-28 rounded-[30px]" />
        <Skeleton className="h-[540px] rounded-[30px]" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <Card className="rounded-[30px] border-rose-100 bg-rose-50/80 text-sm leading-7 text-rose-700">
        {error ?? "Không tìm thấy kế hoạch."}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-[32px] border-emerald-100/70 bg-gradient-to-br from-white via-[#f5fceb] to-emerald-50 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700/65">
              {plan.crop.name} | {plan.location.name}
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold text-slate-950 sm:text-4xl">
              {plan.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{plan.summary}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-emerald-800 shadow-soft">
              Phù hợp {plan.suitability_score}/100
            </span>
            <Button variant="secondary" onClick={handleRefreshWeather} loading={refreshing}>
              <RefreshCcw size={16} />
              Cập nhật thời tiết
            </Button>
            <Button onClick={handleRegenerate} loading={refreshing}>
              <Sprout size={16} />
              Tạo lại lịch
            </Button>
          </div>
        </div>
      </Card>

      <CropPlanProgress plan={plan} reminders={plan.reminders} />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card className="rounded-[30px] border-emerald-100/70 bg-white/90">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700/65">
              Dòng thời gian chăm sóc
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-slate-950">
              Từng bước theo dõi từ lúc bắt đầu đến khi thu hoạch
            </h2>
            <div className="mt-6">
              <CropPlanTimeline
                steps={plan.steps}
                selectedStepId={selectedStepId}
                onSelect={(step) => setSelectedStepId(step.id)}
                onComplete={(stepId) => handleComplete(stepId)}
              />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <CropPlanStepPanel
            step={selectedStep}
            onComplete={handleComplete}
            onDelay={handleDelay}
            onSaveNote={handleSaveNote}
          />
          <ReminderCenter
            reminders={plan.reminders}
            onMarkRead={async (reminderId) => {
              if (!accessToken) return;
              await markReminderRead(accessToken, reminderId);
              await loadPlan();
            }}
          />
        </div>
      </div>
    </div>
  );
}
