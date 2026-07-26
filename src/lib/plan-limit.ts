/**
 * One place that understands HTTP 402 from the backend.
 *
 * `backend/payments/entitlements.py` answers every exhausted cap with the same
 * structured body, so the caps never have to be restated here:
 *
 *   { detail, code: "plan_limit_exceeded", plan, limit, used, upgrade_to }
 *
 * Each API client turns that into a `PlanLimitError` and publishes it, so the
 * screens keep their own error copy while a single listener explains the cap
 * and offers the plan that lifts it. Before this, a 402 surfaced as a bare
 * "HTTP 402" (or nothing at all) because the clients only ever read `detail`.
 */

/** The caps `resolve_entitlements` returns, keyed exactly as the API keys them. */
export type LimitKey =
  | "daily_diagnoses"
  | "monthly_diagnoses"
  | "history_days"
  | "daily_chat_messages"
  | "crop_plans";

export const PLAN_LIMIT_STATUS = 402;

/** Backend `code`: a spent quota, or a feature the plan never included. */
export const FEATURE_LOCKED_CODE = "plan_feature_locked";

export type PlanLimitInfo = {
  /** Backend Vietnamese sentence; already names the cap and the next plan. */
  message: string;
  /**
   * `plan_limit_exceeded` (hết hạn mức) or `plan_feature_locked` (gói chưa có
   * tính năng). Both answer 402 and both need the upgrade path, but only the
   * first one has a counter to show.
   */
  code: string;
  plan: string;
  /** `null` when the body did not carry a number (never means "unlimited"). */
  limit: number | null;
  used: number | null;
  upgradeTo: string | null;
  /** Which cap was hit. The body cannot say, so the calling client names it. */
  limitKey: LimitKey | null;
};

export class PlanLimitError extends Error {
  readonly status = PLAN_LIMIT_STATUS;
  readonly info: PlanLimitInfo;

  constructor(info: PlanLimitInfo) {
    super(info.message);
    this.name = "PlanLimitError";
    this.info = info;
  }
}

export function isPlanLimitError(error: unknown): error is PlanLimitError {
  return error instanceof PlanLimitError;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  // DRF stringifies nested values in some renderers; a numeric string is still
  // a number the user can be shown.
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function readText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    for (const entry of value) {
      const text = readText(entry);
      if (text) return text;
    }
  }
  return "";
}

const FALLBACK_MESSAGE =
  "Bạn đã dùng hết hạn mức của gói hiện tại. Vui lòng nâng cấp để tiếp tục.";

/**
 * Reads the 402 body. Only the status decides that this is a plan limit — a
 * proxy or gateway can answer 402 with something that is not the DRF shape, and
 * the user still deserves the upgrade prompt rather than a raw status code.
 */
export function readPlanLimit(body: unknown, limitKey: LimitKey | null = null): PlanLimitInfo {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return {
    message: readText(record.detail) || readText(record.error) || readText(record.message) || FALLBACK_MESSAGE,
    code: readText(record.code),
    plan: readText(record.plan),
    limit: readNumber(record.limit),
    used: readNumber(record.used),
    upgradeTo: readText(record.upgrade_to) || null,
    limitKey,
  };
}

type PlanLimitListener = (error: PlanLimitError) => void;

const listeners = new Set<PlanLimitListener>();

/** Subscribe to every 402 the app receives; returns the unsubscribe function. */
export function onPlanLimit(listener: PlanLimitListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitPlanLimit(error: PlanLimitError) {
  // Copy first: a listener may unsubscribe itself while being notified.
  for (const listener of [...listeners]) listener(error);
}

/**
 * Called by every API client on a non-OK response. Throws (and publishes) a
 * `PlanLimitError` for 402 and does nothing otherwise, so the caller keeps its
 * existing error handling for every other status.
 */
export function raiseIfPlanLimited(status: number, body: unknown, limitKey: LimitKey | null = null): void {
  if (status !== PLAN_LIMIT_STATUS) return;
  const error = new PlanLimitError(readPlanLimit(body, limitKey));
  emitPlanLimit(error);
  throw error;
}
