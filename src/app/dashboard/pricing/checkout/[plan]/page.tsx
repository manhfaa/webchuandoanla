"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Crown,
  Loader2,
  LockKeyhole,
  QrCode,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sprout,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { StatusBadge, type StatusBadgeState } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { PLANS } from "@/lib/plans";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";

type Tr = (vi: string, en: string) => string;
import { useSessionStore } from "@/store/session-store";

type OrderStatus = "pending" | "underpaid" | "paid" | "overpaid" | "expired" | "cancelled" | "review";

type OrderData = {
  order: {
    id: string;
    plan: string;
    price: number;
    amount_received: number;
    remaining_amount: number;
    status: OrderStatus;
    transfer_content: string;
    expires_at: string;
  };
  bank: { name: string; account_number: string; account_name: string };
  qr_url: string;
};

type OrderStatusData = {
  order: {
    status: OrderStatus;
    amount_received: number;
    remaining_amount: number;
  };
  current_plan: string;
};

const currencyFormatter = new Intl.NumberFormat("vi-VN");

function formatCurrency(value: number) {
  return `${currencyFormatter.format(value)}đ`;
}

function formatExpiry(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatCountdown(milliseconds: number, tr: Tr) {
  if (milliseconds <= 0) return tr("Đã hết hạn", "Expired");
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const element = document.createElement("textarea");
    element.value = text;
    element.style.position = "fixed";
    element.style.opacity = "0";
    document.body.appendChild(element);
    element.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(element);
    return copied;
  }
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const tr = useTr();
  const [copied, setCopied] = useState(false);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetRef.current) clearTimeout(resetRef.current);
  }, []);

  async function handleCopy() {
    const didCopy = await copyToClipboard(text);
    if (!didCopy) return;
    setCopied(true);
    if (resetRef.current) clearTimeout(resetRef.current);
    resetRef.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      aria-label={tr(`Sao chép ${label}`, `Copy ${label}`)}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-xs font-bold text-ink transition hover:border-line-strong hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/35"
    >
      {copied ? <CheckCircle2 size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
      <span className="hidden sm:inline">{copied ? tr("Đã chép", "Copied") : tr("Sao chép", "Copy")}</span>
    </button>
  );
}

function PaymentProgress({ status, polling }: { status: OrderStatus; polling: boolean }) {
  const tr = useTr();
  const isPaid = status === "paid";
  const isClosed = ["expired", "cancelled", "overpaid", "review"].includes(status);
  const isTransferred = !isClosed && (polling || status !== "pending");
  const steps = [
    { label: tr("Yêu cầu đã tạo", "Request created"), complete: true, active: false },
    { label: tr("Chờ giao dịch", "Awaiting transaction"), complete: isPaid, active: !isPaid && !isClosed },
    { label: tr("Kích hoạt gói", "Activate plan"), complete: isPaid, active: isPaid },
  ];

  return (
    <ol className="grid grid-cols-3" aria-label={tr("Tiến trình thanh toán", "Payment progress")}>
      {steps.map((step, index) => {
        const emphasized = step.complete || step.active || (index === 1 && isTransferred);
        return (
          <li key={step.label} className="relative min-w-0 text-center">
            {index > 0 ? (
              <span className={cn("absolute right-1/2 top-4 h-px w-full", emphasized ? "bg-leaf" : "bg-line")} aria-hidden />
            ) : null}
            <span
              className={cn(
                "relative z-10 mx-auto flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold",
                step.complete
                  ? "border-leaf bg-leaf text-on-leaf"
                  : step.active
                    ? "border-leaf bg-surface text-leaf-strong"
                    : "border-line bg-surface text-ink-soft",
              )}
            >
              {step.complete ? <Check size={15} aria-hidden /> : index + 1}
            </span>
            <span className={cn("mt-2 block truncate px-1 text-[11px] font-semibold sm:text-xs", emphasized ? "text-ink" : "text-ink-soft")}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function PaymentDetailRow({
  label,
  value,
  copyLabel,
  highlight = false,
}: {
  label: string;
  value: string;
  copyLabel?: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn("grid gap-2 border-b border-line py-3.5 last:border-0 sm:grid-cols-[138px_1fr] sm:items-center", highlight && "my-1 rounded-lg border border-sun/35 bg-sun-soft px-3 last:border-b")}>
      <span className="text-xs font-semibold text-ink-soft">{label}</span>
      <span className="flex min-w-0 items-center justify-between gap-3">
        <strong className={cn("min-w-0 break-words text-sm text-ink", highlight && "text-base text-warning-ink")}>{value}</strong>
        {copyLabel ? <CopyButton text={value} label={copyLabel} /> : null}
      </span>
    </div>
  );
}

function getStatusMeta(status: OrderStatus, polling: boolean, tr: Tr): { label: string; state: StatusBadgeState } {
  if (status === "paid") return { label: tr("Đã thanh toán", "Paid"), state: "healthy" };
  if (status === "underpaid") return { label: tr("Đã nhận một phần", "Partially received"), state: "watch" };
  if (status === "overpaid" || status === "review") return { label: tr("Cần đối soát", "Needs reconciliation"), state: "watch" };
  if (status === "expired" || status === "cancelled") return { label: tr("Yêu cầu đã đóng", "Request closed"), state: "urgent" };
  if (polling) return { label: tr("Đang xác nhận", "Confirming"), state: "processing" };
  return { label: tr("Chờ chuyển khoản", "Awaiting transfer"), state: "neutral" };
}

export default function CheckoutPlanPage() {
  const { plan: planParam } = useParams<{ plan: string }>();
  const router = useRouter();
  const tr = useTr();
  const { user, accessToken, initialized, setPlan } = useSessionStore();

  const planInfo = PLANS[planParam as keyof typeof PLANS];
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [polling, setPolling] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const redirectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingStartedAtRef = useRef(0);
  const countdownOrderId = orderData?.order.id;
  const countdownStatus = orderData?.order.status;

  useEffect(() => {
    if (!planInfo || planParam === "seed") router.replace("/dashboard/pricing");
  }, [planParam, planInfo, router]);

  useEffect(() => {
    if (initialized && !accessToken) {
      router.replace(`/login?next=/dashboard/pricing/checkout/${planParam}`);
    }
  }, [accessToken, initialized, planParam, router]);

  useEffect(() => {
    if (!countdownOrderId || !countdownStatus || ["paid", "expired", "cancelled"].includes(countdownStatus)) return;
    setNow(Date.now());
    countdownRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = null;
    };
  }, [countdownOrderId, countdownStatus]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPolling(false);
  }, []);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (redirectRef.current) clearTimeout(redirectRef.current);
  }, []);

  async function createOrder() {
    try {
      setCreatingOrder(true);
      setOrderError(null);
      setPaymentMessage(null);
      stopPolling();
      const response = await fetch("/api/django/api/payments/orders/", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ plan: planParam }),
      });
      const data = await response.json().catch(() => ({})) as Partial<OrderData> & { error?: string; detail?: string };
      if (!response.ok) {
        setOrderError(data.detail ?? data.error ?? tr("Không thể tạo yêu cầu thanh toán.", "Could not create the payment request."));
        return;
      }
      setOrderData(data as OrderData);
      setNow(Date.now());
    } catch {
      setOrderError(tr("Chưa thể kết nối dịch vụ thanh toán. Vui lòng kiểm tra mạng và thử lại.", "Could not reach the payment service. Please check your connection and try again."));
    } finally {
      setCreatingOrder(false);
    }
  }

  function startPolling() {
    if (!orderData || polling) return;
    const orderId = orderData.order.id;
    setPaymentMessage(null);
    setPolling(true);
    pollingStartedAtRef.current = Date.now();

    async function checkOrder() {
      try {
        const response = await fetch(`/api/django/api/payments/orders/${orderId}/`, {
          headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
          cache: "no-store",
        });
        if (!response.ok) {
          if (response.status === 401) {
            stopPolling();
            setPaymentMessage(tr("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để kiểm tra giao dịch.", "Your session has expired. Please sign in again to check the transaction."));
            return;
          }
          if (Date.now() - pollingStartedAtRef.current > 10 * 60 * 1000) {
            stopPolling();
            setPaymentMessage(tr("Chưa thể xác nhận giao dịch. Bạn có thể quay lại kiểm tra đơn này sau.", "Could not confirm the transaction yet. You can come back to check this order later."));
          }
          return;
        }

        const data = await response.json() as OrderStatusData;
        setOrderData((current) => current ? {
          ...current,
          order: {
            ...current.order,
            status: data.order.status,
            amount_received: data.order.amount_received,
            remaining_amount: data.order.remaining_amount,
          },
        } : current);

        if (data.order.status === "paid") {
          stopPolling();
          setPlan(data.current_plan as Parameters<typeof setPlan>[0]);
          setSuccess(true);
          redirectRef.current = setTimeout(() => router.push("/dashboard"), 3000);
          return;
        }
        if (data.order.status === "underpaid") {
          setPaymentMessage(tr(`Đã nhận ${formatCurrency(data.order.amount_received)}. Bạn cần chuyển thêm ${formatCurrency(data.order.remaining_amount)} với cùng nội dung chuyển khoản.`, `Received ${formatCurrency(data.order.amount_received)}. You need to transfer an additional ${formatCurrency(data.order.remaining_amount)} with the same transfer note.`));
          return;
        }
        if (["overpaid", "review"].includes(data.order.status)) {
          stopPolling();
          setPaymentMessage(tr("Giao dịch đã được ghi nhận nhưng cần kiểm tra lại số tiền hoặc thời điểm chuyển. Gói sẽ được kích hoạt sau khi đối soát xong.", "The transaction was recorded but the amount or transfer time needs review. The plan will be activated once reconciliation is complete."));
          return;
        }
        if (["expired", "cancelled"].includes(data.order.status)) {
          stopPolling();
          setPaymentMessage(tr("Yêu cầu này đã đóng. Không chuyển thêm tiền vào nội dung cũ, hãy tạo yêu cầu mới.", "This request is closed. Do not transfer more money using the old note; please create a new request."));
          return;
        }
        if (Date.now() - pollingStartedAtRef.current > 10 * 60 * 1000) {
          stopPolling();
          setPaymentMessage(tr("Chưa thấy giao dịch sau 10 phút. Không cần chuyển thêm nếu bạn đã thanh toán, hãy kiểm tra lại sau.", "No transaction seen after 10 minutes. No need to transfer again if you already paid; please check back later."));
        }
      } catch {
        if (Date.now() - pollingStartedAtRef.current > 10 * 60 * 1000) {
          stopPolling();
          setPaymentMessage(tr("Kết nối kiểm tra thanh toán bị gián đoạn. Vui lòng thử lại sau.", "The payment check connection was interrupted. Please try again later."));
        }
      }
    }

    void checkOrder();
    intervalRef.current = setInterval(() => void checkOrder(), 3000);
  }

  async function renewOrder() {
    setOrderData(null);
    await createOrder();
  }

  if (!planInfo) return null;

  const PlanIcon = { grow: TrendingUp, bloom: ShieldCheck, elite: Crown }[planParam] ?? Sprout;

  if (success) {
    return (
      <Card variant="raised" padding="lg" className="mx-auto flex min-h-[520px] max-w-3xl flex-col items-center justify-center overflow-hidden rounded-xl text-center">
        <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-success-soft text-leaf-strong">
          <CheckCircle2 size={38} aria-hidden />
          <span className="absolute inset-0 animate-ping rounded-full border border-leaf/25 motion-reduce:animate-none" aria-hidden />
        </span>
        <StatusBadge status="healthy" label={tr("Gói đã được kích hoạt", "Plan activated")} className="mt-6" />
        <h1 className="mt-4 font-display text-3xl font-bold text-ink sm:text-4xl">{tr("Thanh toán thành công", "Payment successful")}</h1>
        <p className="mt-3 max-w-lg text-sm leading-7 text-ink-soft">
          {tr("Tài khoản của bạn đã được nâng cấp lên gói", "Your account has been upgraded to the")} <strong className="text-ink">{planInfo.name}</strong> {tr("Bạn có thể sử dụng quyền lợi mới ngay bây giờ.", "plan. You can use your new benefits right now.")}
        </p>
        <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }), "mt-7")}>
          {tr("Về bảng điều khiển", "Back to dashboard")}
        </Link>
        <p className="mt-3 text-xs text-ink-soft">{tr("Tự động chuyển hướng sau vài giây", "Redirecting automatically in a few seconds")}</p>
      </Card>
    );
  }

  if (orderError) {
    return (
      <ErrorState
        title={tr("Chưa tạo được yêu cầu thanh toán", "Could not create the payment request")}
        description={orderError}
        action={(
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/dashboard/pricing" className={buttonVariants({ variant: "secondary", size: "md" })}>
              {tr("Quay lại bảng giá", "Back to pricing")}
            </Link>
            <Button type="button" onClick={() => void createOrder()} loading={creatingOrder}>
              {tr("Thử tạo lại", "Try again")}
            </Button>
          </div>
        )}
      />
    );
  }

  if (creatingOrder) {
    return <LoadingState title={tr("Đang chuẩn bị thông tin thanh toán", "Preparing your payment details")} description={tr("Hệ thống đang tạo mã chuyển khoản riêng cho bạn.", "We are generating a transfer code just for you.")} />;
  }

  if (!orderData) {
    return (
      <div className="fl-stagger mx-auto max-w-[1080px] space-y-6">
        <Link href="/dashboard/pricing" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft transition hover:text-ink">
          <ArrowLeft size={16} aria-hidden /> {tr("Quay lại bảng giá", "Back to pricing")}
        </Link>

        <Card variant="dark" padding="lg" className="field-contours overflow-hidden rounded-xl">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-overline text-on-forest-muted">{tr("Xác nhận nâng cấp", "Confirm upgrade")}</p>
              <h1 className="mt-3 flex items-center gap-3 font-display text-3xl font-bold text-on-forest sm:text-4xl">
                <PlanIcon size={30} aria-hidden /> {tr("Gói", "Plan")} {planInfo.name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-on-forest-muted">
                {tr("Kiểm tra quyền lợi và số tiền trước khi tạo mã QR chuyển khoản riêng cho tài khoản của bạn.", "Review the benefits and amount before generating a QR transfer code for your account.")}
              </p>
            </div>
            <div className="rounded-lg border border-on-forest/15 bg-on-forest/[0.06] px-5 py-4 text-left lg:text-right">
              <p className="text-xs font-semibold text-on-forest-muted">{tr("Thanh toán một lần", "One-time payment")}</p>
              <p className="mt-1 font-display text-3xl font-bold text-on-forest">{formatCurrency(planInfo.price)}</p>
              <p className="mt-1 text-xs text-on-forest-muted">{tr("Sử dụng trong 30 ngày", "Valid for 30 days")}</p>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <Card variant="raised" padding="lg" className="rounded-xl">
            <p className="text-overline text-leaf-strong">{tr("Quyền lợi của gói", "Plan benefits")}</p>
            <h2 className="mt-3 font-display text-2xl font-bold text-ink">{planInfo.tagline}</h2>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {planInfo.features.map((feature) => (
                <div key={feature} className="flex items-start gap-3 rounded-lg bg-surface-soft px-4 py-3 text-sm leading-6 text-ink">
                  <Check size={16} className="mt-1 shrink-0 text-leaf-strong" aria-hidden />
                  {feature}
                </div>
              ))}
            </div>
          </Card>

          <Card variant="default" padding="lg" className="rounded-xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-success-soft text-leaf-strong"><LockKeyhole size={21} aria-hidden /></span>
            <h2 className="mt-4 font-display text-2xl font-bold text-ink">{tr("Chỉ kích hoạt sau khi nhận tiền", "Only activated after payment is received")}</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-ink-soft">
              <li className="flex gap-3"><Check size={16} className="mt-1 shrink-0 text-leaf-strong" aria-hidden /> {tr("Yêu cầu thanh toán có thời hạn và nội dung chuyển khoản riêng.", "The payment request has a time limit and its own transfer note.")}</li>
              <li className="flex gap-3"><Check size={16} className="mt-1 shrink-0 text-leaf-strong" aria-hidden /> {tr("Hệ thống xác nhận giao dịch qua SePay và tự động kích hoạt gói.", "The transaction is confirmed via SePay and the plan is activated automatically.")}</li>
              <li className="flex gap-3"><Check size={16} className="mt-1 shrink-0 text-leaf-strong" aria-hidden /> {tr("Bạn chưa bị tính phí khi bấm nút tạo yêu cầu.", "You are not charged when you press the create request button.")}</li>
            </ul>
            <Button type="button" size="lg" className="mt-6 w-full" onClick={() => void createOrder()}>
              {tr("Tạo mã thanh toán", "Create payment code")}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const orderStatus = orderData.order.status;
  const expiresIn = new Date(orderData.order.expires_at).getTime() - now;
  const locallyExpired = expiresIn <= 0 && orderStatus === "pending";
  const isClosed = locallyExpired || ["expired", "cancelled"].includes(orderStatus);
  const needsReview = ["overpaid", "review"].includes(orderStatus);
  const isUnderpaid = orderStatus === "underpaid";
  const canUseQr = !isClosed && !needsReview && !isUnderpaid;
  const visibleStatus = locallyExpired ? "expired" : orderStatus;
  const statusMeta = getStatusMeta(visibleStatus, polling, tr);

  return (
    <div className="mx-auto max-w-[1180px] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/pricing" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft transition hover:text-ink">
          <ArrowLeft size={16} aria-hidden /> {tr("Quay lại bảng giá", "Back to pricing")}
        </Link>
        <StatusBadge status={statusMeta.state} label={statusMeta.label} />
      </div>

      <Card variant="dark" padding="lg" className="field-contours overflow-hidden rounded-xl">
        <div className="grid gap-6 lg:grid-cols-[1fr_440px] lg:items-center">
          <div>
            <p className="text-overline text-on-forest-muted">{tr("Thanh toán gói", "Pay for plan")} {planInfo.name}</p>
            <h1 className="mt-3 font-display text-3xl font-bold text-on-forest sm:text-4xl">{tr("Hoàn tất chuyển khoản để kích hoạt gói", "Complete the transfer to activate your plan")}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-on-forest-muted">
              {tr("Quét QR hoặc nhập đúng thông tin bên dưới. Gói được kích hoạt tự động khi giao dịch được xác nhận.", "Scan the QR code or enter the exact details below. The plan is activated automatically once the transaction is confirmed.")}
            </p>
          </div>
          <div className="rounded-xl border border-on-forest/15 bg-on-forest/[0.06] p-4">
            <PaymentProgress status={visibleStatus} polling={polling} />
          </div>
        </div>
      </Card>

      {(isClosed || needsReview || isUnderpaid) ? (
        <div
          className={cn(
            "flex flex-col gap-4 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between",
            isClosed ? "border-danger/30 bg-danger-soft" : "border-sun/35 bg-sun-soft",
          )}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className={cn("mt-0.5 shrink-0", isClosed ? "text-danger-ink" : "text-warning-ink")} size={20} aria-hidden />
            <div>
              <p className="font-bold text-ink">
                {isClosed ? tr("Yêu cầu thanh toán đã hết hiệu lực", "The payment request is no longer valid") : isUnderpaid ? tr("Số tiền nhận được chưa đủ", "The received amount is not enough") : tr("Giao dịch đang cần đối soát", "The transaction needs reconciliation")}
              </p>
              <p className="mt-1 text-sm leading-6 text-ink-soft">
                {isClosed
                  ? tr("Không chuyển khoản bằng nội dung cũ. Hãy tạo yêu cầu mới để nhận mã thanh toán còn hiệu lực.", "Do not transfer using the old note. Create a new request to get a valid payment code.")
                  : isUnderpaid
                    ? tr(`Đã nhận ${formatCurrency(orderData.order.amount_received)}. Còn thiếu ${formatCurrency(orderData.order.remaining_amount)}.`, `Received ${formatCurrency(orderData.order.amount_received)}. Still short ${formatCurrency(orderData.order.remaining_amount)}.`)
                    : tr("Giao dịch đã được lưu. Hệ thống cần kiểm tra lại trước khi kích hoạt gói.", "The transaction was saved. It needs review before the plan can be activated.")}
              </p>
            </div>
          </div>
          {isClosed ? (
            <Button type="button" variant="secondary" className="shrink-0" onClick={() => void renewOrder()}>
              <RefreshCw size={16} aria-hidden /> {tr("Tạo yêu cầu mới", "Create new request")}
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(330px,0.88fr)] lg:items-start">
        <Card variant="raised" padding="lg" className="overflow-hidden rounded-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-overline text-leaf-strong">{tr("Mã thanh toán", "Payment code")}</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-ink">
                {isUnderpaid ? tr("Chuyển phần còn thiếu bằng thông tin bên dưới", "Transfer the remaining amount using the details below") : isClosed || needsReview ? tr("Mã QR hiện không thể sử dụng", "The QR code cannot be used right now") : tr("Quét QR bằng ứng dụng ngân hàng", "Scan the QR code with your banking app")}
              </h2>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-success-soft text-leaf-strong"><QrCode size={22} aria-hidden /></span>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-[238px_1fr] md:items-center">
            <div className="relative rounded-xl border border-line-strong bg-qr-paper p-3 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={orderData.qr_url}
                alt={tr(`QR thanh toán gói ${planInfo.name}`, `Payment QR for ${planInfo.name} plan`)}
                className={cn("aspect-square w-full object-contain transition", !canUseQr && "opacity-15 grayscale")}
              />
              {!canUseQr ? (
                <div className="absolute inset-3 flex items-center justify-center rounded-lg border border-line bg-surface/95 p-5 text-center">
                  <div>
                    <AlertTriangle className="mx-auto text-warning-ink" size={26} aria-hidden />
                    <p className="mt-3 text-sm font-bold text-ink">{isUnderpaid ? tr("Không quét lại QR cũ", "Do not rescan the old QR") : tr("QR đã được khóa", "QR is locked")}</p>
                    <p className="mt-1 text-xs leading-5 text-ink-soft">{isUnderpaid ? tr("Hãy nhập thủ công đúng số tiền còn thiếu.", "Enter the exact remaining amount manually.") : tr("Không thực hiện thêm giao dịch với yêu cầu này.", "Do not make any more transactions with this request.")}</p>
                  </div>
                </div>
              ) : null}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{isUnderpaid ? tr("Cách chuyển phần còn thiếu", "How to transfer the remaining amount") : tr("Cách nhanh nhất", "The fastest way")}</p>
              {isUnderpaid ? (
                <ol className="mt-3 space-y-3 text-sm leading-6 text-ink-soft">
                  <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sun-soft text-xs font-bold text-warning-ink">1</span> {tr("Chọn chuyển khoản thủ công trong ứng dụng ngân hàng.", "Choose manual transfer in your banking app.")}</li>
                  <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sun-soft text-xs font-bold text-warning-ink">2</span> {tr(`Nhập đúng ${formatCurrency(orderData.order.remaining_amount)} và giữ nguyên nội dung cũ.`, `Enter exactly ${formatCurrency(orderData.order.remaining_amount)} and keep the same note.`)}</li>
                  <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sun-soft text-xs font-bold text-warning-ink">3</span> {tr("Hoàn tất rồi tiếp tục kiểm tra giao dịch.", "Finish, then continue checking the transaction.")}</li>
                </ol>
              ) : (
                <ol className="mt-3 space-y-3 text-sm leading-6 text-ink-soft">
                  <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-soft text-xs font-bold text-success-ink">1</span> {tr("Mở ứng dụng ngân hàng và chọn quét mã QR.", "Open your banking app and choose scan QR code.")}</li>
                  <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-soft text-xs font-bold text-success-ink">2</span> {tr("Kiểm tra số tiền và giữ nguyên nội dung chuyển khoản.", "Check the amount and keep the transfer note unchanged.")}</li>
                  <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-soft text-xs font-bold text-success-ink">3</span> {tr("Hoàn tất giao dịch rồi bấm kiểm tra thanh toán.", "Complete the transaction, then press check payment.")}</li>
                </ol>
              )}
              <div className={cn("mt-5 flex items-center gap-3 rounded-lg border px-4 py-3", locallyExpired ? "border-danger/30 bg-danger-soft" : "border-line bg-surface-soft")}>
                <Clock3 className={cn("shrink-0", locallyExpired ? "text-danger-ink" : "text-leaf-strong")} size={19} aria-hidden />
                <div>
                  <p className="text-xs font-semibold text-ink-soft">{tr("Thời gian còn lại", "Time remaining")}</p>
                  <p className={cn("mt-0.5 font-mono text-xl font-bold tabular-nums", locallyExpired ? "text-danger-ink" : "text-ink")}>{formatCountdown(expiresIn, tr)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-7 border-t border-line pt-2">
            <PaymentDetailRow label={tr("Ngân hàng", "Bank")} value={orderData.bank.name} />
            <PaymentDetailRow label={tr("Số tài khoản", "Account number")} value={orderData.bank.account_number} copyLabel={tr("số tài khoản", "account number")} />
            <PaymentDetailRow label={tr("Chủ tài khoản", "Account holder")} value={orderData.bank.account_name} />
            <PaymentDetailRow label={tr("Số tiền", "Amount")} value={formatCurrency(isUnderpaid ? orderData.order.remaining_amount : orderData.order.price)} copyLabel={tr("số tiền", "amount")} />
            <PaymentDetailRow label={tr("Nội dung chuyển khoản", "Transfer note")} value={orderData.order.transfer_content} copyLabel={tr("nội dung chuyển khoản", "transfer note")} highlight />
          </div>

          <div className={cn("mt-4 flex items-start gap-3 rounded-lg border p-4 text-sm leading-6 text-ink", isClosed || needsReview ? "border-danger/30 bg-danger-soft" : "border-sun/35 bg-sun-soft")}>
            <AlertTriangle size={18} className={cn("mt-0.5 shrink-0", isClosed || needsReview ? "text-danger-ink" : "text-warning-ink")} aria-hidden />
            <span>
              {isClosed || needsReview
                ? tr("Không thực hiện thêm giao dịch với yêu cầu này.", "Do not make any more transactions with this request.")
                : <>{tr("Vui lòng chuyển", "Please transfer")} <strong>{formatCurrency(isUnderpaid ? orderData.order.remaining_amount : orderData.order.price)}</strong> {tr("và giữ nguyên nội dung", "and keep the note")} <strong>{orderData.order.transfer_content}</strong> {tr("để tránh chậm xác nhận.", "to avoid delayed confirmation.")}</>}
            </span>
          </div>
        </Card>

        <div className="space-y-5 lg:sticky lg:top-24">
          <Card variant="default" padding="lg" className="rounded-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-overline text-leaf-strong">{tr("Trạng thái giao dịch", "Transaction status")}</p>
                <h2 className="mt-2 font-display text-2xl font-bold text-ink">
                  {polling ? tr("Đang chờ ngân hàng xác nhận", "Waiting for bank confirmation") : isClosed ? tr("Yêu cầu đã hết hiệu lực", "The request is no longer valid") : needsReview ? tr("Đang kiểm tra giao dịch", "Reviewing the transaction") : isUnderpaid ? tr("Cần chuyển phần còn thiếu", "Remaining amount needs to be transferred") : tr("Chờ bạn chuyển khoản", "Waiting for your transfer")}
                </h2>
              </div>
              {polling ? <Loader2 className="mt-1 h-6 w-6 shrink-0 animate-spin text-leaf motion-reduce:animate-none" aria-hidden /> : <ReceiptText className="mt-1 h-6 w-6 shrink-0 text-leaf-strong" aria-hidden />}
            </div>

            <p className="mt-3 text-sm leading-7 text-ink-soft" aria-live="polite">
              {paymentMessage ?? (polling
                ? tr("Hệ thống đang kiểm tra tự động mỗi vài giây. Bạn có thể giữ nguyên trang này.", "We check automatically every few seconds. You can keep this page open.")
                : tr("Sau khi ngân hàng báo chuyển khoản thành công, bấm nút bên dưới để hệ thống kiểm tra ngay.", "After your bank reports a successful transfer, press the button below to check right away."))}
            </p>

            {!isClosed && !needsReview ? (
              <Button type="button" size="lg" className="mt-5 w-full" onClick={startPolling} disabled={polling}>
                {polling ? <><Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden /> {tr("Đang kiểm tra giao dịch", "Checking the transaction")}</> : <><RefreshCw size={18} aria-hidden /> {tr("Tôi đã chuyển khoản, kiểm tra ngay", "I have transferred, check now")}</>}
              </Button>
            ) : null}

            <div className="mt-5 flex items-start gap-3 border-t border-line pt-5">
              <ShieldCheck className="mt-0.5 shrink-0 text-leaf-strong" size={18} aria-hidden />
              <p className="text-xs leading-6 text-ink-soft">{tr("SePay gửi xác nhận trực tiếp từ giao dịch ngân hàng. Agromind AI không yêu cầu mật khẩu hoặc mã OTP của bạn.", "SePay sends confirmation directly from your bank transaction. Agromind AI never asks for your password or OTP.")}</p>
            </div>
          </Card>

          <Card variant="soft" padding="lg" className="rounded-xl">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-leaf-strong"><PlanIcon size={20} aria-hidden /></span>
              <div>
                <p className="text-xs font-semibold text-ink-soft">{tr("Gói đang nâng cấp", "Plan being upgraded")}</p>
                <h3 className="font-display text-xl font-bold text-ink">{planInfo.name}</h3>
              </div>
              <p className="ml-auto text-right font-display text-xl font-bold text-leaf-strong">{formatCurrency(orderData.order.price)}</p>
            </div>
            <dl className="mt-5 space-y-3 border-t border-line pt-5 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-ink-soft">{tr("Thời hạn gói", "Plan duration")}</dt><dd className="font-semibold text-ink">{tr("30 ngày", "30 days")}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-soft">{tr("Gói hiện tại", "Current plan")}</dt><dd className="font-semibold uppercase text-ink">{user?.currentPlan ?? "seed"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-soft">{tr("Yêu cầu hết hạn", "Request expires")}</dt><dd className="text-right font-semibold text-ink">{formatExpiry(orderData.order.expires_at)}</dd></div>
            </dl>
          </Card>

          <div className="flex items-start gap-3 px-1 text-xs leading-6 text-ink-soft">
            <Banknote size={17} className="mt-0.5 shrink-0" aria-hidden />
            <p>{tr("Nếu đã chuyển tiền nhưng chưa thấy kích hoạt sau 10 phút, không chuyển lại lần hai. Hãy giữ biên lai và quay lại kiểm tra đơn này.", "If you have transferred but do not see activation after 10 minutes, do not transfer a second time. Keep your receipt and come back to check this order.")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
