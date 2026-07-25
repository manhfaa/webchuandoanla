"use client";

import { useRouter } from "next/navigation";
import { CalendarClock, Crown, ShieldCheck, Sparkles, Sprout, TrendingUp, WifiOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ComparisonTable } from "@/components/pricing/comparison-table";
import { PaymentHistory } from "@/components/pricing/payment-history";
import { PricingCard } from "@/components/pricing/pricing-card";
import { Card } from "@/components/ui/card";
import { ListSkeleton } from "@/components/ui/skeleton";
import { pricingPlans } from "@/data/mock/plans";
import {
  applyCataloguePrices,
  fetchPaymentOrders,
  fetchServicePlans,
  fetchSubscriptionSummary,
  PaymentsApiError,
  planRank,
  type PaymentOrderRecord,
  type ServicePlanDto,
  type SubscriptionSummary,
} from "@/lib/payments-client";
import { normalizePlan, PLANS } from "@/lib/plans";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/session-store";
import type { PlanTier } from "@/types";

const PLAN_TAGLINES: Record<PlanTier, string> = {
  seed: "Bắt đầu kiểm tra và lưu lịch sử ngắn.",
  grow: "Tăng lượt sử dụng và mở kế hoạch trồng.",
  bloom: "Theo dõi đầy đủ với tư vấn nâng cao.",
  elite: "Báo cáo và tích hợp cho nhu cầu chuyên sâu.",
};

const PLAN_TAGLINES_EN: Record<PlanTier, string> = {
  seed: "Start checking leaves and keep a short history.",
  grow: "More usage and unlock planting plans.",
  bloom: "Full tracking with advanced advice.",
  elite: "Reports and integrations for demanding needs.",
};

const PLAN_ICONS = { seed: Sprout, grow: TrendingUp, bloom: ShieldCheck, elite: Crown };

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export default function DashboardPricingPage() {
  const router = useRouter();
  const tr = useTr();
  const { user, accessToken, initialized } = useSessionStore();

  const [catalogue, setCatalogue] = useState<ServicePlanDto[] | null>(null);
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [catalogueFailed, setCatalogueFailed] = useState(false);
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [orders, setOrders] = useState<PaymentOrderRecord[]>([]);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  const loadCatalogue = useCallback(async () => {
    setCatalogueLoading(true);
    try {
      setCatalogue(await fetchServicePlans());
      setCatalogueFailed(false);
    } catch {
      // The checked-in catalogue keeps the page usable offline; the banner
      // below makes it clear the prices are not live.
      setCatalogue(null);
      setCatalogueFailed(true);
    } finally {
      setCatalogueLoading(false);
    }
  }, []);

  const loadAccount = useCallback(async () => {
    if (!accessToken) return;
    setAccountLoading(true);
    setAccountError(null);
    try {
      const [nextSummary, nextOrders] = await Promise.all([
        fetchSubscriptionSummary(accessToken),
        fetchPaymentOrders(accessToken),
      ]);
      setSummary(nextSummary);
      setOrders(nextOrders);
    } catch (caught) {
      setAccountError(
        caught instanceof PaymentsApiError && caught.serverMessage
          ? caught.serverMessage
          : tr("Chưa tải được thông tin gói và giao dịch của bạn.", "Could not load your plan and transaction details."),
      );
    } finally {
      setAccountLoading(false);
    }
    // `tr` changes with the language, which must not re-trigger a fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    void loadCatalogue();
  }, [loadCatalogue]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  const plans = useMemo(() => applyCataloguePrices(pricingPlans, catalogue), [catalogue]);
  const currentPlan = normalizePlan(summary?.current_plan ?? user?.currentPlan);
  const currentPlanInfo = PLANS[currentPlan];
  const planExpiresAt = summary?.plan_expires_at ?? null;
  const currentRank = planRank(currentPlan);

  const goToCheckout = (planId: string) => router.push(`/dashboard/pricing/checkout/${planId}`);

  return (
    <div className="fl-stagger mx-auto max-w-[1480px] space-y-8">
      <Card variant="dark" padding="lg" className="field-contours overflow-hidden rounded-xl">
        <div className="grid gap-7 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-overline text-on-forest-muted">{tr("Gói dịch vụ", "Service plans")}</p>
            <h2 className="mt-3 max-w-2xl font-display text-[34px] font-bold leading-tight tracking-[-0.04em] text-on-forest sm:text-[42px]">{tr("Chọn mức sử dụng phù hợp với khu vườn của bạn", "Choose the usage level that fits your garden")}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-on-forest-muted">{tr("Bắt đầu miễn phí, sau đó nâng cấp khi bạn cần nhiều lượt kiểm tra, lịch sử dài hơn hoặc thêm công cụ theo dõi.", "Start for free, then upgrade when you need more checks, longer history, or additional tracking tools.")}</p>
          </div>
          <div className="rounded-xl border border-on-forest/10 bg-on-forest/5 p-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-on-forest/10 px-4 py-2 text-sm font-semibold text-on-forest"><Sparkles size={16} aria-hidden /> {tr("Gói hiện tại:", "Current plan:")} {currentPlanInfo.name}</div>
            {planExpiresAt ? (
              <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-on-forest-muted">
                <CalendarClock size={14} aria-hidden />
                {tr(`Hiệu lực đến ${formatDate(planExpiresAt)}`, `Valid until ${formatDate(planExpiresAt)}`)}
                {summary?.days_remaining !== null && summary?.days_remaining !== undefined
                  ? tr(` · còn ${summary.days_remaining} ngày`, ` · ${summary.days_remaining} days left`)
                  : ""}
              </p>
            ) : null}
            <p className="mt-5 text-overline text-on-forest-muted">{tr("Quyền lợi theo từng mức", "Benefits by tier")}</p>
            <div className="mt-3 space-y-2">
              {plans.map((plan) => {
                const Icon = PLAN_ICONS[plan.id];
                const purchasable = planRank(plan.id) > currentRank;
                const rowClass = cn(
                  "flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition",
                  currentPlan === plan.id ? "border-on-forest/25 bg-on-forest/10" : "border-on-forest/10 bg-on-forest/[0.03]",
                  purchasable && "hover:bg-on-forest/[0.07]",
                );
                const body = (
                  <>
                    <Icon size={17} className="mt-0.5 shrink-0 text-on-forest" aria-hidden />
                    <span>
                      <span className="block text-sm font-bold text-on-forest">{plan.name}</span>
                      <span className="mt-1 block text-xs leading-6 text-on-forest-muted">{tr(PLAN_TAGLINES[plan.id], PLAN_TAGLINES_EN[plan.id])}</span>
                    </span>
                  </>
                );
                // Only a real upgrade gets a control; the other rows are a
                // legend, not a button that silently refuses to do anything.
                return purchasable ? (
                  <button key={plan.id} type="button" onClick={() => goToCheckout(plan.id)} className={rowClass}>
                    {body}
                  </button>
                ) : (
                  <div key={plan.id} className={rowClass}>{body}</div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {catalogueFailed ? (
        <div className="flex items-start gap-3 rounded-xl border border-sun/35 bg-sun-soft p-4 text-sm leading-6 text-ink" role="status">
          <WifiOff size={18} className="mt-0.5 shrink-0 text-warning-ink" aria-hidden />
          <span>
            {tr(
              "Chưa kết nối được máy chủ nên bảng giá bên dưới là bản lưu sẵn. Số tiền chính xác sẽ hiển thị ở bước thanh toán.",
              "We could not reach the server, so the prices below come from a saved copy. The exact amount is shown at the payment step.",
            )}
          </span>
        </div>
      ) : null}

      {catalogueLoading ? (
        <ListSkeleton count={4} className="md:grid-cols-2 2xl:grid-cols-4" itemClassName="h-[460px]" />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              currentPlan={currentPlan}
              currentPlanExpiresAt={planExpiresAt}
              onSelect={goToCheckout}
            />
          ))}
        </div>
      )}

      {initialized && accessToken ? (
        <PaymentHistory
          orders={orders}
          summary={summary}
          loading={accountLoading}
          error={accountError}
          onRetry={() => void loadAccount()}
          onOrderUpdated={(updated) => setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)))}
        />
      ) : null}

      <ComparisonTable catalogue={catalogue} />
    </div>
  );
}
