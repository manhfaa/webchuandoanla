"use client";

import { useState } from "react";

import { HealthMetricsPanel } from "@/components/dashboard/health-metrics-panel";
import { OverviewStatGrid } from "@/components/dashboard/overview-stat-grid";
import { QuickAccessPanel } from "@/components/dashboard/quick-access-panel";
import { RecentDiagnosisPanel } from "@/components/dashboard/recent-diagnosis-panel";
import { UpgradeBanner } from "@/components/dashboard/upgrade-banner";
import { UpgradeModal } from "@/components/pricing/upgrade-modal";
import { useSessionStore } from "@/store/session-store";

export default function DashboardOverviewPage() {
  const { user } = useSessionStore();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <OverviewStatGrid />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <RecentDiagnosisPanel />
        <HealthMetricsPanel />
      </div>

      <QuickAccessPanel />

      <UpgradeBanner currentPlan={String(user?.currentPlan ?? "free")} onOpenUpgrade={() => setOpen(true)} />

      <UpgradeModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
