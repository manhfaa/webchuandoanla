"use client";

import type { CSSProperties } from "react";
import { useEffect } from "react";

import { HealthMetricsPanel } from "@/components/dashboard/health-metrics-panel";
import { GardenStatusPanel } from "@/components/dashboard/garden-status-panel";
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
    <div className="mx-auto max-w-[1480px] space-y-8">
      <div className="fl-rise">
        <GardenStatusPanel />
      </div>

      <div className="fl-rise" style={{ "--fl-i": 1 } as CSSProperties}>
        <OverviewStatGrid />
      </div>

      <div className="fl-rise grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]" style={{ "--fl-i": 2 } as CSSProperties}>
        <RecentDiagnosisPanel />
        <HealthMetricsPanel />
      </div>

      <div className="fl-rise" style={{ "--fl-i": 3 } as CSSProperties}>
        <QuickAccessPanel />
      </div>

      <div className="fl-rise" style={{ "--fl-i": 4 } as CSSProperties}>
        <UpgradeBanner currentPlan={user?.currentPlan ?? "seed"} />
      </div>
    </div>
  );
}
