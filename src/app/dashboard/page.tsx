"use client";

import { useEffect } from "react";

import { HealthMetricsPanel } from "@/components/dashboard/health-metrics-panel";
import { OverviewStatGrid } from "@/components/dashboard/overview-stat-grid";
import { QuickAccessPanel } from "@/components/dashboard/quick-access-panel";
import { RecentDiagnosisPanel } from "@/components/dashboard/recent-diagnosis-panel";
import { UpgradeBanner } from "@/components/dashboard/upgrade-banner";
import { fetchDiagnosisRecords } from "@/lib/diagnoses-client";
import { useDiagnosisStore } from "@/store/diagnosis-store";
import { useSessionStore } from "@/store/session-store";

export default function DashboardOverviewPage() {
  const { user, accessToken } = useSessionStore();
  const { setRecords } = useDiagnosisStore();

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    void fetchDiagnosisRecords(accessToken)
      .then((items) => {
        if (!cancelled) setRecords(items);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [accessToken, setRecords]);

  return (
    <div className="space-y-6">
      <OverviewStatGrid />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <RecentDiagnosisPanel />
        <HealthMetricsPanel />
      </div>

      <QuickAccessPanel />

      <UpgradeBanner currentPlan={user?.currentPlan ?? "seed"} />
    </div>
  );
}
