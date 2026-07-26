"use client";

import { useCallback, useEffect } from "react";

import { planThatLifts, planThatUnlocks } from "@/lib/plan-catalogue";
import type { LimitKey } from "@/lib/plan-limit";
import { normalizePlan } from "@/lib/plans";
import type { PlanEntitlements, ServicePlanDto } from "@/lib/payments-client";
import { NO_LIMITS, readQuota, useEntitlementsStore, type QuotaReading } from "@/store/entitlements-store";
import { useSessionStore } from "@/store/session-store";

const NO_FEATURES: PlanEntitlements["features"] = {
  yolo: false,
  cnn: false,
  rag: false,
  expert_chat: false,
  reports: false,
};

/**
 * The caps and feature flags for the signed-in account.
 *
 * Loads itself the first time any screen asks, and re-reads after an upgrade
 * because the plan slug is part of the cache key. Nothing here re-states a
 * limit: `limits` is what the API answered and `upgradeFor` picks the plan out
 * of the live catalogue.
 */
export function useEntitlements() {
  const accessToken = useSessionStore((state) => state.accessToken);
  const currentPlan = useSessionStore((state) => state.user?.currentPlan ?? null);

  const summary = useEntitlementsStore((state) => state.summary);
  const catalogue = useEntitlementsStore((state) => state.catalogue);
  const status = useEntitlementsStore((state) => state.status);
  const error = useEntitlementsStore((state) => state.error);
  const usage = useEntitlementsStore((state) => state.usage);
  const load = useEntitlementsStore((state) => state.load);
  const reportUsage = useEntitlementsStore((state) => state.reportUsage);

  useEffect(() => {
    void load(accessToken, currentPlan);
  }, [accessToken, currentPlan, load]);

  const quota = useCallback(
    (key: LimitKey, usedOverride?: number | null): QuotaReading =>
      readQuota({ summary, status, usage }, key, usedOverride),
    [summary, status, usage],
  );

  const plan = normalizePlan(summary?.entitlements.plan ?? summary?.current_plan ?? currentPlan);

  /** The cheapest plan on sale that raises this cap; `null` when already at the top. */
  const upgradeFor = useCallback(
    (key: LimitKey): ServicePlanDto | null => planThatLifts(catalogue, key, plan),
    [catalogue, plan],
  );

  /** The cheapest plan on sale that includes a feature this one does not. */
  const unlockFor = useCallback(
    (includes: (candidate: ServicePlanDto) => boolean): ServicePlanDto | null =>
      planThatUnlocks(catalogue, includes),
    [catalogue],
  );

  return {
    status,
    error,
    loading: status === "loading" || status === "idle",
    ready: status === "ready" && summary !== null,
    summary,
    catalogue,
    plan,
    planName: summary?.entitlements.plan_name ?? "",
    limits: summary?.entitlements.limits ?? NO_LIMITS,
    features: summary?.entitlements.features ?? NO_FEATURES,
    quota,
    upgradeFor,
    unlockFor,
    reportUsage,
    refresh: () => load(accessToken, currentPlan, { force: true }),
  };
}
