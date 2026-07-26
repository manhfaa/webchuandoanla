"use client";

import Link from "next/link";
import { ArrowUpRight, Gauge, Infinity as InfinityIcon } from "lucide-react";

import type { HistoryWindow } from "@/lib/diagnoses-client";
import { capLabel, catalogueCap } from "@/lib/plan-catalogue";
import type { LimitKey } from "@/lib/plan-limit";
import { useEntitlements } from "@/lib/use-entitlements";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";

/**
 * "Where you stand" for one cap, shown next to the action it applies to.
 *
 * Every number is read from the account's entitlements; this file only owns the
 * sentence around them. When the server has not told us how much is already
 * used, the chip states the cap instead of guessing a remainder.
 */

type Phrases = {
  /** Both counts known: what is left. */
  remaining: (remaining: number, limit: number) => { vi: string; en: string };
  /** Only the cap is known. */
  capOnly: (plan: string, cap: string, capEn: string) => { vi: string; en: string };
  /** Nothing left (or the plan sells none of it). */
  empty: (limit: number) => { vi: string; en: string };
};

const PHRASES: Record<LimitKey, Phrases> = {
  daily_diagnoses: {
    remaining: (remaining, limit) => ({
      vi: `Còn ${remaining}/${limit} lượt kiểm tra hôm nay`,
      en: `${remaining} of ${limit} checks left today`,
    }),
    capOnly: (plan, cap, capEn) => ({ vi: `Gói ${plan}: ${cap}`, en: `${plan} plan: ${capEn}` }),
    empty: (limit) => ({
      vi: `Đã dùng hết ${limit} lượt kiểm tra hôm nay`,
      en: `All ${limit} checks for today have been used`,
    }),
  },
  monthly_diagnoses: {
    remaining: (remaining, limit) => ({
      vi: `Còn ${remaining}/${limit} lượt trong tháng`,
      en: `${remaining} of ${limit} checks left this month`,
    }),
    capOnly: (plan, cap, capEn) => ({ vi: `Gói ${plan}: ${cap}`, en: `${plan} plan: ${capEn}` }),
    empty: (limit) => ({
      vi: `Đã dùng hết ${limit} lượt của tháng này`,
      en: `All ${limit} checks for this month have been used`,
    }),
  },
  history_days: {
    remaining: (_remaining, limit) => ({
      vi: `Hiển thị ${limit} ngày gần nhất`,
      en: `Showing the last ${limit} days`,
    }),
    capOnly: (plan, cap, capEn) => ({ vi: `Gói ${plan} lưu ${cap}`, en: `${plan} plan keeps ${capEn}` }),
    empty: (limit) => ({ vi: `Hiển thị ${limit} ngày gần nhất`, en: `Showing the last ${limit} days` }),
  },
  daily_chat_messages: {
    remaining: (remaining, limit) => ({
      vi: `Còn ${remaining}/${limit} câu hỏi hôm nay`,
      en: `${remaining} of ${limit} questions left today`,
    }),
    capOnly: (plan, cap, capEn) => ({ vi: `Gói ${plan}: ${cap}`, en: `${plan} plan: ${capEn}` }),
    empty: (limit) => ({
      vi: `Đã dùng hết ${limit} câu hỏi hôm nay`,
      en: `All ${limit} questions for today have been used`,
    }),
  },
  crop_plans: {
    remaining: (remaining, limit) => ({
      vi: `Còn tạo được ${remaining}/${limit} kế hoạch`,
      en: `${remaining} of ${limit} plans still available`,
    }),
    capOnly: (plan, cap, capEn) => ({ vi: `Gói ${plan}: ${cap}`, en: `${plan} plan: ${capEn}` }),
    empty: (limit) => ({
      vi: limit === 0 ? "Gói hiện tại chưa có kế hoạch trồng cây" : `Đã dùng hết ${limit} kế hoạch của gói`,
      en: limit === 0 ? "Your current plan does not include crop plans" : `All ${limit} plans in your plan are in use`,
    }),
  },
};

const UNLIMITED_LABEL: Record<LimitKey, { vi: string; en: string }> = {
  daily_diagnoses: { vi: "Kiểm tra không giới hạn", en: "Unlimited checks" },
  monthly_diagnoses: { vi: "Kiểm tra không giới hạn", en: "Unlimited checks" },
  history_days: { vi: "Lưu toàn bộ lịch sử", en: "Full history kept" },
  daily_chat_messages: { vi: "Chat không giới hạn", en: "Unlimited chat" },
  crop_plans: { vi: "Kế hoạch không giới hạn", en: "Unlimited plans" },
};

export function QuotaHint({
  limitKey,
  used,
  className,
  showUpgrade = true,
}: {
  limitKey: LimitKey;
  /** A count the screen already got from the server (e.g. the plan list total). */
  used?: number | null;
  className?: string;
  showUpgrade?: boolean;
}) {
  const tr = useTr();
  const { quota, planName, upgradeFor } = useEntitlements();
  const reading = quota(limitKey, used);

  // Stay silent until the caps have actually been read, so the screen never
  // flashes a limit that turns out to be wrong.
  if (!reading.known) return null;

  const base = "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold";

  if (reading.unlimited) {
    return (
      <span className={cn(base, "bg-success-soft text-success-ink", className)}>
        <InfinityIcon size={14} aria-hidden />
        {tr(UNLIMITED_LABEL[limitKey].vi, UNLIMITED_LABEL[limitKey].en)}
      </span>
    );
  }

  const limit = reading.limit ?? 0;
  const phrases = PHRASES[limitKey];
  const upgrade = reading.exhausted && showUpgrade ? upgradeFor(limitKey) : null;

  let text: { vi: string; en: string };
  if (reading.exhausted) {
    text = phrases.empty(limit);
  } else if (reading.remaining !== null) {
    text = phrases.remaining(reading.remaining, limit);
  } else {
    const label = capLabel(limitKey, limit);
    text = phrases.capOnly(planName || "—", label?.vi ?? String(limit), label?.en ?? String(limit));
  }

  return (
    <span
      className={cn(
        base,
        reading.exhausted ? "bg-sun-soft text-warning-ink" : "bg-surface-soft text-ink-soft",
        className,
      )}
    >
      <Gauge size={14} aria-hidden />
      {tr(text.vi, text.en)}
      {upgrade ? (
        <Link
          href={`/dashboard/pricing/checkout/${upgrade.slug}`}
          className="inline-flex items-center gap-1 font-bold text-leaf-strong underline-offset-2 hover:underline"
        >
          {tr(`Nâng cấp ${upgrade.name}`, `Upgrade to ${upgrade.name}`)}
          <ArrowUpRight size={13} aria-hidden />
        </Link>
      ) : null}
    </span>
  );
}

/**
 * The retention window in sentence form, for the history list — where a shorter
 * window must never read as "your older results were deleted".
 *
 * `window` is the server's own account of what is being held back (it knows how
 * many rows are outside the window and says so in Vietnamese). Without it the
 * component still explains the window from the plan's caps.
 */
export function RetentionNotice({
  window: retention = null,
  className,
}: {
  window?: HistoryWindow | null;
  className?: string;
}) {
  const tr = useTr();
  const { quota, planName, upgradeFor } = useEntitlements();
  const reading = quota("history_days");
  const days = retention?.retention_days ?? reading.limit;

  // Nothing to explain when the plan keeps everything.
  if (days === null || days === undefined) return null;
  if (!retention && !reading.known) return null;

  const upgrade = upgradeFor("history_days");
  const upgradeCap = capLabel("history_days", catalogueCap(upgrade, "history_days"));
  const hidden = retention?.hidden ?? 0;

  const english = hidden
    ? `The ${planName} plan shows the last ${days} days. ${hidden} older ${hidden === 1 ? "result is" : "results are"} still stored in full and reappear when you upgrade.`
    : `The ${planName} plan shows the last ${days} days. Older results are still kept in your account.`;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-4 py-3 text-xs leading-6",
        hidden ? "border-sun/30 bg-sun-soft text-ink" : "border-line bg-surface-soft text-ink-soft",
        className,
      )}
      role="status"
    >
      <Gauge size={14} className="shrink-0 text-leaf-strong" aria-hidden />
      <span>
        {tr(
          // The backend sentence already counts the hidden rows and names the
          // plan that brings them back; do not paraphrase it.
          retention?.notice ||
            `Gói ${planName} hiển thị ${days} ngày gần nhất. Các kết quả cũ hơn vẫn được giữ nguyên trong tài khoản của bạn.`,
          english,
        )}
      </span>
      {upgrade ? (
        <Link
          href={`/dashboard/pricing/checkout/${upgrade.slug}`}
          className="inline-flex items-center gap-1 font-bold text-leaf-strong underline-offset-2 hover:underline"
        >
          {upgradeCap
            ? tr(`Nâng cấp ${upgrade.name} để xem ${upgradeCap.vi}`, `Upgrade to ${upgrade.name} to see ${upgradeCap.en}`)
            : tr(`Nâng cấp ${upgrade.name}`, `Upgrade to ${upgrade.name}`)}
          <ArrowUpRight size={13} aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
