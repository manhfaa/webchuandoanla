"use client";

import { create } from "zustand";

import {
  fetchServicePlans,
  fetchSubscriptionSummary,
  type PlanEntitlements,
  type ServicePlanDto,
  type SubscriptionSummary,
} from "@/lib/payments-client";
import { onPlanLimit, type LimitKey } from "@/lib/plan-limit";

/**
 * What the account is entitled to, and how much of it is already spent.
 *
 * `GET /api/payments/subscription/` is the only place the caps are read from,
 * so a screen can say "còn 2/5 lượt hôm nay" without a single number being
 * typed into the frontend. The catalogue is loaded alongside it to answer
 * "which plan lifts this cap?" the same way.
 */

export type UsageMap = Partial<Record<LimitKey, number>>;

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface EntitlementsState {
  summary: SubscriptionSummary | null;
  catalogue: ServicePlanDto[] | null;
  status: LoadStatus;
  error: string | null;
  /** Merged from the API, from screens that count their own rows, and from 402s. */
  usage: UsageMap;
  /** Guards against re-fetching on every render of every screen. */
  loadedKey: string | null;

  load: (accessToken: string | null, planHint?: string | null, options?: { force?: boolean }) => Promise<void>;
  /** A screen reporting a count the server just gave it (e.g. the plan list total). */
  reportUsage: (key: LimitKey, used: number) => void;
  reset: () => void;
}

export const useEntitlementsStore = create<EntitlementsState>()((set, get) => ({
  summary: null,
  catalogue: null,
  status: "idle",
  error: null,
  usage: {},
  loadedKey: null,

  load: async (accessToken, planHint = null, options = {}) => {
    if (!accessToken) {
      get().reset();
      return;
    }
    // Re-read after an upgrade: the plan slug is part of the key, so activating
    // a plan refreshes the caps without anyone having to remember to call this.
    const key = `${accessToken}:${planHint ?? ""}`;
    if (!options.force && get().loadedKey === key && get().status !== "error") return;
    if (get().status === "loading" && get().loadedKey === key) return;

    set({ status: "loading", error: null, loadedKey: key });
    const [summaryResult, catalogueResult] = await Promise.allSettled([
      fetchSubscriptionSummary(accessToken),
      fetchServicePlans(),
    ]);

    if (get().loadedKey !== key) return; // a newer load already took over

    if (summaryResult.status === "rejected") {
      set({
        status: "error",
        error: "Chưa đọc được hạn mức của gói hiện tại.",
        // Keep whatever was already loaded: a failed refresh must not blank out
        // a quota the user can still see.
        catalogue: catalogueResult.status === "fulfilled" ? catalogueResult.value : get().catalogue,
      });
      return;
    }

    const summary = summaryResult.value;
    set({
      summary,
      catalogue: catalogueResult.status === "fulfilled" ? catalogueResult.value : get().catalogue,
      status: "ready",
      error: null,
      // Server-reported usage wins over anything a screen counted locally.
      usage: { ...get().usage, ...(summary.usage ?? {}) },
    });
  },

  reportUsage: (key, used) =>
    set((state) => (state.usage[key] === used ? state : { usage: { ...state.usage, [key]: used } })),

  reset: () => set({ summary: null, catalogue: null, status: "idle", error: null, usage: {}, loadedKey: null }),
}));

/**
 * A 402 is the most accurate usage reading there is — the server just refused
 * the write and said exactly how many the account has. Record it so the hint on
 * screen stops promising a quota that is gone.
 */
onPlanLimit((error) => {
  const { limitKey, used } = error.info;
  if (limitKey && typeof used === "number") {
    useEntitlementsStore.getState().reportUsage(limitKey, used);
  }
});

/* ------------------------------------------------------------- selectors --- */

export const NO_LIMITS: PlanEntitlements["limits"] = {
  daily_diagnoses: null,
  monthly_diagnoses: null,
  history_days: null,
  daily_chat_messages: null,
  crop_plans: null,
};

export type QuotaReading = {
  /** `null` means the plan has no cap for this key. */
  limit: number | null;
  used: number | null;
  remaining: number | null;
  unlimited: boolean;
  exhausted: boolean;
  /** False until the caps have actually been read; screens stay quiet until then. */
  known: boolean;
};

export function readQuota(
  state: Pick<EntitlementsState, "summary" | "status" | "usage">,
  key: LimitKey,
  usedOverride?: number | null,
): QuotaReading {
  const known = state.status === "ready" && state.summary !== null;
  const limit = known ? (state.summary?.entitlements.limits[key] ?? null) : null;
  const used = usedOverride ?? state.usage[key] ?? null;
  const unlimited = known && limit === null;
  const remaining = limit === null || used === null ? null : Math.max(0, limit - used);
  return {
    limit,
    used,
    remaining,
    unlimited,
    // A cap of 0 (Seed sells no crop plans) is exhausted before anything exists.
    exhausted: known && limit !== null && (limit === 0 || (used !== null && used >= limit)),
    known,
  };
}
