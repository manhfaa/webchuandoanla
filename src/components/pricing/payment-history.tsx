"use client";

import Link from "next/link";
import { CalendarClock, LifeBuoy, ReceiptText } from "lucide-react";
import { useState } from "react";

import { StatusBadge, type StatusBadgeState } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import {
  formatVnd,
  isOpenOrder,
  PaymentsApiError,
  requestOrderReconciliation,
  type PaymentOrderRecord,
  type SubscriptionSummary,
} from "@/lib/payments-client";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/session-store";

type Tr = (vi: string, en: string) => string;

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function statusMeta(order: PaymentOrderRecord, tr: Tr): { label: string; state: StatusBadgeState } {
  if (order.status === "paid") return { label: tr("Đã thanh toán", "Paid"), state: "healthy" };
  if (order.status === "underpaid") return { label: tr("Đã nhận một phần", "Partially received"), state: "watch" };
  if (order.status === "overpaid" || order.status === "review") return { label: tr("Cần đối soát", "Needs reconciliation"), state: "watch" };
  if (order.needs_reconciliation) return { label: tr("Đã nhận tiền, chưa kích hoạt", "Money received, not activated"), state: "watch" };
  if (order.status === "expired" || order.status === "cancelled") return { label: tr("Đã đóng", "Closed"), state: "urgent" };
  return { label: tr("Chờ chuyển khoản", "Awaiting transfer"), state: "neutral" };
}

function PlanSummaryCard({ summary }: { summary: SubscriptionSummary | null }) {
  const tr = useTr();
  if (!summary) return null;

  const limits = summary.entitlements.limits;
  const unlimited = tr("Không giới hạn", "Unlimited");
  const rows = [
    { label: tr("Kiểm tra ảnh lá", "Leaf checks"), value: limits.daily_diagnoses === null ? unlimited : tr(`${limits.daily_diagnoses} lần/ngày`, `${limits.daily_diagnoses} per day`) },
    { label: tr("Lưu lịch sử", "History kept"), value: limits.history_days === null ? tr("Toàn bộ", "All") : tr(`${limits.history_days} ngày`, `${limits.history_days} days`) },
    { label: tr("Chat AI", "AI chat"), value: limits.daily_chat_messages === null ? unlimited : tr(`${limits.daily_chat_messages} câu/ngày`, `${limits.daily_chat_messages} per day`) },
    {
      label: tr("Kế hoạch trồng", "Crop plans"),
      value: limits.crop_plans === null
        ? unlimited
        : limits.crop_plans === 0
          ? tr("Chưa có trong gói", "Not included")
          : tr(`${limits.crop_plans} kế hoạch`, `${limits.crop_plans} plans`),
    },
  ];

  return (
    <Card variant="default" padding="lg" className="rounded-xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-overline text-leaf-strong">{tr("Gói của bạn", "Your plan")}</p>
          <h3 className="mt-2 font-display text-2xl font-bold text-ink">{summary.entitlements.plan_name}</h3>
          <p className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
            <CalendarClock size={15} className="shrink-0 text-leaf-strong" aria-hidden />
            {summary.plan_expires_at
              ? tr(
                  `Hiệu lực đến ${formatDate(summary.plan_expires_at)}${summary.days_remaining !== null ? ` · còn ${summary.days_remaining} ngày` : ""}`,
                  `Valid until ${formatDate(summary.plan_expires_at)}${summary.days_remaining !== null ? ` · ${summary.days_remaining} days left` : ""}`,
                )
              : tr("Gói miễn phí, không có ngày hết hạn.", "Free plan, no expiry date.")}
          </p>
          {summary.subscription ? (
            <p className="mt-1 text-xs text-ink-soft">
              {tr(
                `Bắt đầu ${formatDate(summary.subscription.starts_at)} · thanh toán một lần, không tự động gia hạn.`,
                `Started ${formatDate(summary.subscription.starts_at)} · one-time payment, no auto-renewal.`,
              )}
            </p>
          ) : null}
        </div>
        <dl className="grid w-full max-w-sm grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-surface-soft p-4 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="contents">
              <dt className="text-ink-soft">{row.label}</dt>
              <dd className="text-right font-semibold text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  );
}

export function PaymentHistory({
  orders,
  summary,
  loading,
  error,
  onRetry,
  onOrderUpdated,
}: {
  orders: PaymentOrderRecord[];
  summary: SubscriptionSummary | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onOrderUpdated: (order: PaymentOrderRecord) => void;
}) {
  const tr = useTr();
  const { accessToken } = useSessionStore();
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  async function handleReconcile(order: PaymentOrderRecord) {
    setPendingOrderId(order.id);
    setActionError(null);
    setActionMessage(null);
    try {
      const result = await requestOrderReconciliation(accessToken, order.id);
      onOrderUpdated(result.order);
      setActionMessage(result.message);
    } catch (caught) {
      setActionError(
        caught instanceof PaymentsApiError && caught.serverMessage
          ? caught.serverMessage
          : tr("Chưa gửi được yêu cầu đối soát. Vui lòng thử lại.", "Could not send the reconciliation request. Please try again."),
      );
    } finally {
      setPendingOrderId(null);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="text-overline text-leaf-strong">{tr("Thanh toán", "Payments")}</p>
        <h2 className="mt-2 text-h2 font-bold text-ink">{tr("Gói và lịch sử thanh toán", "Plan and payment history")}</h2>
      </div>

      <PlanSummaryCard summary={summary} />

      {loading ? (
        <ListSkeleton count={2} itemClassName="h-[92px]" />
      ) : error ? (
        <ErrorState
          title={tr("Chưa tải được lịch sử thanh toán", "Could not load the payment history")}
          description={error}
          onRetry={onRetry}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={tr("Chưa có giao dịch nào", "No transactions yet")}
          description={tr(
            "Khi bạn tạo yêu cầu nâng cấp, mã thanh toán và trạng thái giao dịch sẽ xuất hiện ở đây.",
            "Once you create an upgrade request, the payment code and transaction status will appear here.",
          )}
        />
      ) : (
        <Card variant="raised" padding="none" className="overflow-hidden rounded-xl">
          <ul>
            {orders.map((order) => {
              const meta = statusMeta(order, tr);
              const reconciliationRequested = Boolean(order.reconciliation?.requested_at);
              return (
                <li key={order.id} className="flex flex-col gap-3 border-b border-line p-5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-lg font-bold text-ink">{order.plan_name}</p>
                      <StatusBadge status={meta.state} label={meta.label} />
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">
                      {formatVnd(order.amount_expected)}
                      {order.amount_received > 0 && order.amount_received !== order.amount_expected
                        ? tr(` · đã nhận ${formatVnd(order.amount_received)}`, ` · received ${formatVnd(order.amount_received)}`)
                        : ""}
                      {" · "}
                      {order.paid_at
                        ? tr(`Thanh toán ${formatDateTime(order.paid_at)}`, `Paid ${formatDateTime(order.paid_at)}`)
                        : tr(`Tạo ${formatDateTime(order.created_at)}`, `Created ${formatDateTime(order.created_at)}`)}
                    </p>
                    <p className="mt-1 font-mono text-xs text-ink-soft">{order.payment_code}</p>
                    {order.needs_reconciliation ? (
                      <p className="mt-2 max-w-xl text-xs leading-5 text-warning-ink">
                        {reconciliationRequested
                          ? tr(
                              "Đã gửi yêu cầu đối soát. Đừng chuyển thêm tiền cho mã này — gói sẽ được kích hoạt sau khi kiểm tra xong.",
                              "Reconciliation requested. Do not transfer more money for this code — the plan will be activated once the check is done.",
                            )
                          : tr(
                              "Giao dịch đã vào tài khoản nhưng gói chưa được kích hoạt. Gửi yêu cầu đối soát để được xử lý.",
                              "The transfer arrived but the plan was not activated. Send a reconciliation request to have it handled.",
                            )}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {isOpenOrder(order) ? (
                      <Link
                        href={`/dashboard/pricing/checkout/${order.plan}`}
                        className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
                      >
                        {tr("Tiếp tục thanh toán", "Continue payment")}
                      </Link>
                    ) : null}
                    {order.needs_reconciliation && !reconciliationRequested ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        loading={pendingOrderId === order.id}
                        disabled={pendingOrderId === order.id}
                        onClick={() => void handleReconcile(order)}
                      >
                        <LifeBuoy size={15} aria-hidden /> {tr("Yêu cầu đối soát", "Request reconciliation")}
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {actionMessage ? (
        <p className="rounded-lg border border-leaf/30 bg-success-soft px-4 py-3 text-sm text-success-ink" role="status">
          {actionMessage}
        </p>
      ) : null}
      {actionError ? (
        <p className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger-ink" role="alert">
          {actionError}
        </p>
      ) : null}
    </section>
  );
}
