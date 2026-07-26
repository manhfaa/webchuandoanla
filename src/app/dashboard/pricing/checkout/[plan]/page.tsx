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
  LifeBuoy,
  Loader2,
  LockKeyhole,
  QrCode,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sprout,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { StatusBadge, type StatusBadgeState } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { pricingPlans } from "@/data/mock/plans";
import {
  applyCatalogue,
  blocksNewOrder,
  createPaymentOrder,
  fetchPaymentOrder,
  fetchPaymentOrders,
  fetchServicePlans,
  formatVnd,
  isOpenOrder,
  PaymentsApiError,
  planAmount,
  requestOrderReconciliation,
  type BankDetails,
  type CreatedOrder,
  type PaymentOrderDetail,
  type PaymentOrderStatus,
  type ServicePlanDto,
} from "@/lib/payments-client";
import { PLANS } from "@/lib/plans";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";

type Tr = (vi: string, en: string) => string;
import { useSessionStore } from "@/store/session-store";

type OrderStatus = PaymentOrderStatus;

type CheckoutOrder = {
  id: string;
  plan: string;
  price: number;
  amount_received: number;
  remaining_amount: number;
  status: OrderStatus;
  transfer_content: string;
  expires_at: string;
  needs_reconciliation: boolean;
  reconciliation_requested: boolean;
};

type OrderData = {
  order: CheckoutOrder;
  bank: BankDetails;
  qr_url: string;
};

/**
 * Anything that has to be told to the grower is stored as a reason, not as a
 * finished sentence: the copy is then rendered in whichever language is active
 * when it is shown, instead of freezing at the moment the poll ran.
 */
type PaymentNotice =
  | { kind: "underpaid"; received: number; remaining: number }
  | { kind: "review" }
  | { kind: "closed" }
  | { kind: "session" }
  | { kind: "not-seen" }
  | { kind: "unreadable" }
  | { kind: "interrupted" };

const ORDER_STATUSES: readonly OrderStatus[] = ["pending", "underpaid", "paid", "overpaid", "expired", "cancelled", "review"];

function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

type PollResult = {
  status: OrderStatus;
  amount_received: number;
  remaining_amount: number;
  needs_reconciliation: boolean;
  reconciliation_requested: boolean;
  current_plan: string;
  plan_expires_at: string | null;
};

/**
 * The poll response drives plan activation, so never trust an unchecked cast:
 * a malformed body must be ignored rather than treated as a valid status.
 */
function parseOrderDetail(payload: PaymentOrderDetail | null): PollResult | null {
  if (typeof payload !== "object" || payload === null) return null;
  const order = payload.order as Partial<PaymentOrderDetail["order"]> | undefined;
  if (typeof order !== "object" || order === null) return null;
  if (!isOrderStatus(order.status)) return null;
  if (typeof order.amount_received !== "number" || !Number.isFinite(order.amount_received)) return null;
  if (typeof order.remaining_amount !== "number" || !Number.isFinite(order.remaining_amount)) return null;
  if (typeof payload.current_plan !== "string") return null;

  return {
    status: order.status,
    amount_received: order.amount_received,
    remaining_amount: order.remaining_amount,
    needs_reconciliation: order.needs_reconciliation === true,
    reconciliation_requested: Boolean(order.reconciliation?.requested_at),
    current_plan: payload.current_plan,
    plan_expires_at: typeof payload.plan_expires_at === "string" ? payload.plan_expires_at : null,
  };
}

function fromCreatedOrder(payload: CreatedOrder): OrderData {
  return {
    order: {
      ...payload.order,
      needs_reconciliation: payload.needs_reconciliation === true,
      reconciliation_requested: Boolean(payload.reconciliation?.requested_at),
    },
    bank: payload.bank,
    qr_url: payload.qr_url,
  };
}

function fromOrderDetail(payload: PaymentOrderDetail): OrderData | null {
  if (!payload.bank || !payload.qr_url || !isOrderStatus(payload.order?.status)) return null;
  const order = payload.order;
  return {
    order: {
      id: order.id,
      plan: order.plan,
      price: order.amount_expected,
      amount_received: order.amount_received,
      remaining_amount: order.remaining_amount,
      status: order.status,
      transfer_content: order.payment_code,
      expires_at: order.expires_at,
      needs_reconciliation: order.needs_reconciliation === true,
      reconciliation_requested: Boolean(order.reconciliation?.requested_at),
    },
    bank: payload.bank,
    qr_url: payload.qr_url,
  };
}

function formatCurrency(value: number) {
  return formatVnd(value);
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

function formatDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatCountdown(milliseconds: number, tr: Tr) {
  if (milliseconds <= 0) return tr("Đã hết hạn", "Expired");
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function renderNotice(notice: PaymentNotice, tr: Tr) {
  switch (notice.kind) {
    case "underpaid":
      return tr(
        `Đã nhận ${formatCurrency(notice.received)}. Bạn cần chuyển thêm ${formatCurrency(notice.remaining)} với cùng nội dung chuyển khoản.`,
        `Received ${formatCurrency(notice.received)}. You need to transfer an additional ${formatCurrency(notice.remaining)} with the same transfer note.`,
      );
    case "review":
      return tr(
        "Giao dịch đã được ghi nhận nhưng cần kiểm tra lại số tiền hoặc thời điểm chuyển. Gói sẽ được kích hoạt sau khi đối soát xong.",
        "The transaction was recorded but the amount or transfer time needs review. The plan will be activated once reconciliation is complete.",
      );
    case "closed":
      return tr(
        "Yêu cầu này đã đóng. Không chuyển thêm tiền vào nội dung cũ, hãy tạo yêu cầu mới.",
        "This request is closed. Do not transfer more money using the old note; please create a new request.",
      );
    case "session":
      return tr(
        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để kiểm tra giao dịch.",
        "Your session has expired. Please sign in again to check the transaction.",
      );
    case "not-seen":
      return tr(
        "Chưa thấy giao dịch sau 10 phút. Không cần chuyển thêm nếu bạn đã thanh toán, hãy kiểm tra lại sau.",
        "No transaction seen after 10 minutes. No need to transfer again if you already paid; please check back later.",
      );
    case "unreadable":
      return tr(
        "Chưa đọc được trạng thái giao dịch. Vui lòng quay lại kiểm tra đơn này sau.",
        "Could not read the transaction status. Please come back to check this order later.",
      );
    case "interrupted":
      return tr(
        "Kết nối kiểm tra thanh toán bị gián đoạn. Vui lòng thử lại sau.",
        "The payment check connection was interrupted. Please try again later.",
      );
  }
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
  const [restoringOrder, setRestoringOrder] = useState(true);
  const [pollMode, setPollMode] = useState<"idle" | "auto" | "fast">("idle");
  const [success, setSuccess] = useState(false);
  const [activatedUntil, setActivatedUntil] = useState<string | null>(null);
  const [notice, setNotice] = useState<PaymentNotice | null>(null);
  const [catalogue, setCatalogue] = useState<ServicePlanDto[] | null>(null);
  const [qrFailed, setQrFailed] = useState(false);
  const [qrAttempt, setQrAttempt] = useState(0);
  const [reconcileState, setReconcileState] = useState<"idle" | "sending" | "sent">("idle");
  const [reconcileMessage, setReconcileMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const redirectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingStartedAtRef = useRef(0);
  const orderIdRef = useRef<string | null>(null);

  const activeOrderId = orderData?.order.id ?? null;
  const activeStatus = orderData?.order.status ?? null;
  const catalogueAmount = planAmount(catalogue, planParam);

  useEffect(() => {
    orderIdRef.current = activeOrderId;
  }, [activeOrderId]);

  useEffect(() => {
    if (!planInfo || planParam === "seed") router.replace("/dashboard/pricing");
  }, [planParam, planInfo, router]);

  useEffect(() => {
    if (initialized && !accessToken) {
      router.replace(`/login?next=/dashboard/pricing/checkout/${planParam}`);
    }
  }, [accessToken, initialized, planParam, router]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const plans = await fetchServicePlans();
        if (!cancelled) setCatalogue(plans);
      } catch {
        // The order response carries the authoritative amount anyway.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // A reload used to drop the grower back on the "create request" screen while
  // a transfer was already in flight, which invites paying twice.
  useEffect(() => {
    if (!planInfo || planParam === "seed") {
      setRestoringOrder(false);
      return;
    }
    if (!initialized) return;
    if (!accessToken) {
      setRestoringOrder(false);
      return;
    }
    let cancelled = false;
    setRestoringOrder(true);
    void (async () => {
      try {
        const orders = await fetchPaymentOrders(accessToken);
        // Only orders the backend would hand back anyway: a closed order that
        // received a partial transfer stays in the history (with its own
        // reconciliation action) and must not block buying the plan again.
        const existing = orders.find((order) => order.plan === planParam && (isOpenOrder(order) || blocksNewOrder(order)));
        if (!existing || cancelled) return;
        const restored = fromOrderDetail(await fetchPaymentOrder(accessToken, existing.id));
        if (cancelled || !restored) return;
        setOrderData(restored);
        setNow(Date.now());
      } catch {
        // Falling back to the create screen is safe: the backend returns the
        // same order instead of minting a second code.
      } finally {
        if (!cancelled) setRestoringOrder(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, initialized, planInfo, planParam]);

  useEffect(() => {
    if (!activeOrderId || !activeStatus || ["paid", "expired", "cancelled"].includes(activeStatus)) return;
    setNow(Date.now());
    countdownRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = null;
    };
  }, [activeOrderId, activeStatus]);

  useEffect(() => () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (redirectRef.current) clearTimeout(redirectRef.current);
  }, []);

  const checkOrder = useCallback(async () => {
    const orderId = orderIdRef.current;
    if (!orderId) return;
    try {
      const data = parseOrderDetail(await fetchPaymentOrder(accessToken, orderId));
      if (!data) {
        // Only the manual check reports failures; background polling stays
        // quiet until the grower actually asks for an answer.
        if (pollingStartedAtRef.current && Date.now() - pollingStartedAtRef.current > 10 * 60 * 1000) {
          setPollMode("idle");
          setNotice({ kind: "unreadable" });
        }
        return;
      }

      setOrderData((current) => current ? {
        ...current,
        order: {
          ...current.order,
          status: data.status,
          amount_received: data.amount_received,
          remaining_amount: data.remaining_amount,
          needs_reconciliation: data.needs_reconciliation,
          reconciliation_requested: data.reconciliation_requested,
        },
      } : current);

      if (data.status === "paid") {
        setPollMode("idle");
        setPlan(data.current_plan as Parameters<typeof setPlan>[0]);
        setActivatedUntil(data.plan_expires_at);
        setSuccess(true);
        redirectRef.current = setTimeout(() => router.push("/dashboard"), 4000);
        return;
      }
      if (data.status === "underpaid") {
        setNotice({ kind: "underpaid", received: data.amount_received, remaining: data.remaining_amount });
        return;
      }
      if (["overpaid", "review"].includes(data.status)) {
        setPollMode("idle");
        setNotice({ kind: "review" });
        return;
      }
      if (["expired", "cancelled"].includes(data.status)) {
        setPollMode("idle");
        setNotice({ kind: "closed" });
        return;
      }
      if (pollingStartedAtRef.current && Date.now() - pollingStartedAtRef.current > 10 * 60 * 1000) {
        setPollMode("idle");
        setNotice({ kind: "not-seen" });
      }
    } catch (caught) {
      if (caught instanceof PaymentsApiError && caught.status === 401) {
        setPollMode("idle");
        setNotice({ kind: "session" });
        return;
      }
      if (pollingStartedAtRef.current && Date.now() - pollingStartedAtRef.current > 10 * 60 * 1000) {
        setPollMode("idle");
        setNotice({ kind: "interrupted" });
      }
    }
  }, [accessToken, router, setPlan]);

  // Activation is announced by the bank, not by the grower, so an open order is
  // watched in the background; pressing "I have transferred" only speeds it up.
  useEffect(() => {
    if (!activeOrderId || (activeStatus !== "pending" && activeStatus !== "underpaid")) {
      setPollMode((mode) => (mode === "idle" ? mode : "idle"));
      return;
    }
    setPollMode((mode) => (mode === "idle" ? "auto" : mode));
  }, [activeOrderId, activeStatus]);

  useEffect(() => {
    if (pollMode === "idle" || !activeOrderId) return;
    const interval = pollMode === "fast" ? 3000 : 9000;
    const timer = setInterval(() => void checkOrder(), interval);
    return () => clearInterval(timer);
  }, [pollMode, activeOrderId, checkOrder]);

  async function createOrder() {
    try {
      setCreatingOrder(true);
      setOrderError(null);
      setNotice(null);
      setPollMode("idle");
      setQrFailed(false);
      const payload = await createPaymentOrder(accessToken, planParam);
      setOrderData(fromCreatedOrder(payload));
      setNow(Date.now());
    } catch (caught) {
      if (caught instanceof PaymentsApiError) {
        setOrderError(
          caught.serverMessage ||
            tr("Không thể tạo yêu cầu thanh toán.", "Could not create the payment request."),
        );
      } else {
        setOrderError(tr("Chưa thể kết nối dịch vụ thanh toán. Vui lòng kiểm tra mạng và thử lại.", "Could not reach the payment service. Please check your connection and try again."));
      }
    } finally {
      setCreatingOrder(false);
    }
  }

  function startFastPolling() {
    if (!orderData || pollMode === "fast") return;
    setNotice(null);
    pollingStartedAtRef.current = Date.now();
    setPollMode("fast");
    void checkOrder();
  }

  async function renewOrder() {
    setOrderData(null);
    await createOrder();
  }

  async function askForReconciliation() {
    if (!orderData) return;
    setReconcileState("sending");
    try {
      const result = await requestOrderReconciliation(accessToken, orderData.order.id);
      setOrderData((current) => current ? { ...current, order: { ...current.order, reconciliation_requested: true } } : current);
      setReconcileMessage(result.message);
      setReconcileState("sent");
    } catch (caught) {
      setReconcileState("idle");
      setReconcileMessage(
        caught instanceof PaymentsApiError && caught.serverMessage
          ? caught.serverMessage
          : tr("Chưa gửi được yêu cầu đối soát. Vui lòng thử lại.", "Could not send the reconciliation request. Please try again."),
      );
    }
  }

  // Benefits come from the catalogue the account is actually billed against, so
  // the checkout screen cannot promise a quota the plan does not include.
  const planCopy = useMemo(
    () => applyCatalogue(pricingPlans, catalogue).find((entry) => entry.id === planParam) ?? null,
    [catalogue, planParam],
  );
  const planFeatures = planCopy?.features ?? [];

  if (!planInfo) return null;

  const PlanIcon = { grow: TrendingUp, bloom: ShieldCheck, elite: Crown }[planParam] ?? Sprout;
  // The live amount wins; the checked-in label is the only sanctioned fallback
  // (payments/tests.py pins it to the catalogue) so no price is typed twice.
  const displayPrice =
    catalogueAmount !== null
      ? formatCurrency(catalogueAmount)
      : tr(planCopy?.price ?? "", planCopy?.priceEn ?? planCopy?.price ?? "");

  if (success) {
    return (
      <Card variant="raised" padding="lg" className="mx-auto flex min-h-[520px] max-w-3xl flex-col items-center justify-center overflow-hidden rounded-xl text-center">
        <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-success-soft text-leaf-strong">
          <CheckCircle2 size={38} aria-hidden />
          <span className="absolute inset-0 animate-ping rounded-full border border-leaf/25 motion-reduce:animate-none" aria-hidden />
        </span>
        <StatusBadge status="healthy" label={tr("Gói đã được kích hoạt", "Plan activated")} className="mt-6" />
        <h2 className="mt-4 font-display text-3xl font-bold text-ink sm:text-4xl">{tr("Thanh toán thành công", "Payment successful")}</h2>
        <p className="mt-3 max-w-lg text-sm leading-7 text-ink-soft">
          {tr("Tài khoản của bạn đã được nâng cấp lên gói", "Your account has been upgraded to the")} <strong className="text-ink">{planInfo.name}</strong> {tr("Bạn có thể sử dụng quyền lợi mới ngay bây giờ.", "plan. You can use your new benefits right now.")}
        </p>
        {activatedUntil ? (
          <p className="mt-2 text-sm font-semibold text-ink">
            {tr(`Gói có hiệu lực đến ${formatDay(activatedUntil)}`, `The plan is valid until ${formatDay(activatedUntil)}`)}
          </p>
        ) : null}
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

  if (creatingOrder || (restoringOrder && !orderData)) {
    return (
      <LoadingState
        title={creatingOrder ? tr("Đang chuẩn bị thông tin thanh toán", "Preparing your payment details") : tr("Đang kiểm tra yêu cầu thanh toán của bạn", "Checking your payment request")}
        description={creatingOrder ? tr("Hệ thống đang tạo mã chuyển khoản riêng cho bạn.", "We are generating a transfer code just for you.") : tr("Nếu bạn đã tạo mã trước đó, hệ thống sẽ mở lại đúng mã đó.", "If you created a code earlier, we will reopen exactly that one.")}
      />
    );
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
              <h2 className="mt-3 flex items-center gap-3 font-display text-3xl font-bold text-on-forest sm:text-4xl">
                <PlanIcon size={30} aria-hidden /> {tr("Gói", "Plan")} {planInfo.name}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-on-forest-muted">
                {tr("Kiểm tra quyền lợi và số tiền trước khi tạo mã QR chuyển khoản riêng cho tài khoản của bạn.", "Review the benefits and amount before generating a QR transfer code for your account.")}
              </p>
            </div>
            <div className="rounded-lg border border-on-forest/15 bg-on-forest/[0.06] px-5 py-4 text-left lg:text-right">
              <p className="text-xs font-semibold text-on-forest-muted">{tr("Thanh toán một lần", "One-time payment")}</p>
              <p className="mt-1 font-display text-3xl font-bold text-on-forest">{displayPrice}</p>
              <p className="mt-1 text-xs text-on-forest-muted">{tr("Sử dụng trong 30 ngày", "Valid for 30 days")}</p>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <Card variant="raised" padding="lg" className="rounded-xl">
            <p className="text-overline text-leaf-strong">{tr("Quyền lợi của gói", "Plan benefits")}</p>
            <h2 className="mt-3 font-display text-2xl font-bold text-ink">{tr(planInfo.tagline, planInfo.taglineEn)}</h2>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {planFeatures.map((feature, featureIndex) => (
                <div key={feature} className="flex items-start gap-3 rounded-lg bg-surface-soft px-4 py-3 text-sm leading-6 text-ink">
                  <Check size={16} className="mt-1 shrink-0 text-leaf-strong" aria-hidden />
                  {tr(feature, planCopy?.featuresEn?.[featureIndex] ?? feature)}
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
  const needsReview = ["overpaid", "review"].includes(orderStatus) || orderData.order.needs_reconciliation;
  const isUnderpaid = orderStatus === "underpaid";
  const canUseQr = !isClosed && !needsReview && !isUnderpaid && !qrFailed;
  const visibleStatus = locallyExpired ? "expired" : orderStatus;
  const confirming = pollMode === "fast";
  const statusMeta = getStatusMeta(visibleStatus, confirming, tr);
  const reconciliationRequested = orderData.order.reconciliation_requested || reconcileState === "sent";
  // A failed image stays failed in the browser cache, so a retry needs a new URL.
  const qrSrc = qrAttempt === 0 ? orderData.qr_url : `${orderData.qr_url}${orderData.qr_url.includes("?") ? "&" : "?"}r=${qrAttempt}`;

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
            <h2 className="mt-3 font-display text-3xl font-bold text-on-forest sm:text-4xl">{tr("Hoàn tất chuyển khoản để kích hoạt gói", "Complete the transfer to activate your plan")}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-on-forest-muted">
              {tr("Quét QR hoặc nhập đúng thông tin bên dưới. Gói được kích hoạt tự động khi giao dịch được xác nhận.", "Scan the QR code or enter the exact details below. The plan is activated automatically once the transaction is confirmed.")}
            </p>
          </div>
          <div className="rounded-xl border border-on-forest/15 bg-on-forest/[0.06] p-4">
            <PaymentProgress status={visibleStatus} polling={confirming} />
          </div>
        </div>
      </Card>

      {(isClosed || needsReview || isUnderpaid) ? (
        <div
          className={cn(
            "flex flex-col gap-4 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between",
            isClosed && !needsReview ? "border-danger/30 bg-danger-soft" : "border-sun/35 bg-sun-soft",
          )}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className={cn("mt-0.5 shrink-0", isClosed && !needsReview ? "text-danger-ink" : "text-warning-ink")} size={20} aria-hidden />
            <div>
              <p className="font-bold text-ink">
                {needsReview ? tr("Giao dịch đang cần đối soát", "The transaction needs reconciliation") : isClosed ? tr("Yêu cầu thanh toán đã hết hiệu lực", "The payment request is no longer valid") : tr("Số tiền nhận được chưa đủ", "The received amount is not enough")}
              </p>
              <p className="mt-1 text-sm leading-6 text-ink-soft">
                {needsReview
                  ? tr(
                      `Hệ thống đã nhận ${formatCurrency(orderData.order.amount_received)} cho mã ${orderData.order.transfer_content} nhưng chưa kích hoạt gói. Đừng chuyển thêm tiền — hãy gửi yêu cầu đối soát để được xử lý.`,
                      `We received ${formatCurrency(orderData.order.amount_received)} for code ${orderData.order.transfer_content} but the plan is not active yet. Do not transfer more money — send a reconciliation request instead.`,
                    )
                  : isClosed
                    ? tr("Không chuyển khoản bằng nội dung cũ. Hãy tạo yêu cầu mới để nhận mã thanh toán còn hiệu lực.", "Do not transfer using the old note. Create a new request to get a valid payment code.")
                    : tr(`Đã nhận ${formatCurrency(orderData.order.amount_received)}. Còn thiếu ${formatCurrency(orderData.order.remaining_amount)}.`, `Received ${formatCurrency(orderData.order.amount_received)}. Still short ${formatCurrency(orderData.order.remaining_amount)}.`)}
              </p>
              {needsReview && (reconcileMessage || reconciliationRequested) ? (
                <p className="mt-2 text-sm font-semibold text-warning-ink">
                  {reconcileMessage ?? tr("Đã ghi nhận yêu cầu đối soát của bạn.", "Your reconciliation request has been recorded.")}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {needsReview && !reconciliationRequested ? (
              <Button type="button" variant="secondary" loading={reconcileState === "sending"} disabled={reconcileState === "sending"} onClick={() => void askForReconciliation()}>
                <LifeBuoy size={16} aria-hidden /> {tr("Yêu cầu đối soát", "Request reconciliation")}
              </Button>
            ) : null}
            {needsReview ? (
              <Link href="/dashboard/pricing" className={buttonVariants({ variant: "secondary", size: "md" })}>
                <ReceiptText size={16} aria-hidden /> {tr("Xem lịch sử thanh toán", "View payment history")}
              </Link>
            ) : isClosed ? (
              <Button type="button" variant="secondary" onClick={() => void renewOrder()}>
                <RefreshCw size={16} aria-hidden /> {tr("Tạo yêu cầu mới", "Create new request")}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(330px,0.88fr)] lg:items-start">
        <Card variant="raised" padding="lg" className="overflow-hidden rounded-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-overline text-leaf-strong">{tr("Mã thanh toán", "Payment code")}</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-ink">
                {isUnderpaid ? tr("Chuyển phần còn thiếu bằng thông tin bên dưới", "Transfer the remaining amount using the details below") : isClosed || needsReview ? tr("Mã QR hiện không thể sử dụng", "The QR code cannot be used right now") : qrFailed ? tr("Chuyển khoản thủ công theo thông tin bên dưới", "Transfer manually using the details below") : tr("Quét QR bằng ứng dụng ngân hàng", "Scan the QR code with your banking app")}
              </h2>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-success-soft text-leaf-strong"><QrCode size={22} aria-hidden /></span>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-[238px_1fr] md:items-center">
            <div className="relative rounded-xl border border-line-strong bg-qr-paper p-3 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc}
                alt={tr(`QR thanh toán gói ${planInfo.name}`, `Payment QR for ${planInfo.name} plan`)}
                onError={() => setQrFailed(true)}
                className={cn("aspect-square w-full object-contain transition", !canUseQr && "opacity-15 grayscale")}
              />
              {!canUseQr ? (
                <div className="absolute inset-3 flex items-center justify-center rounded-lg border border-line bg-surface/95 p-5 text-center">
                  <div>
                    <AlertTriangle className="mx-auto text-warning-ink" size={26} aria-hidden />
                    <p className="mt-3 text-sm font-bold text-ink">
                      {qrFailed && !isClosed && !needsReview && !isUnderpaid
                        ? tr("Không tải được mã QR", "Could not load the QR code")
                        : isUnderpaid
                          ? tr("Không quét lại QR cũ", "Do not rescan the old QR")
                          : tr("QR đã được khóa", "QR is locked")}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-ink-soft">
                      {qrFailed && !isClosed && !needsReview && !isUnderpaid
                        ? tr("Hãy chuyển khoản thủ công theo số tài khoản, số tiền và nội dung bên dưới.", "Please transfer manually using the account number, amount and note below.")
                        : isUnderpaid
                          ? tr("Hãy nhập thủ công đúng số tiền còn thiếu.", "Enter the exact remaining amount manually.")
                          : tr("Không thực hiện thêm giao dịch với yêu cầu này.", "Do not make any more transactions with this request.")}
                    </p>
                    {qrFailed && !isClosed && !needsReview ? (
                      <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => { setQrAttempt((attempt) => attempt + 1); setQrFailed(false); }}>
                        <RefreshCw size={14} aria-hidden /> {tr("Tải lại QR", "Reload the QR")}
                      </Button>
                    ) : null}
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
              {/* A request under review is no longer racing its own clock. */}
              {needsReview ? null : (
                <div className={cn("mt-5 flex items-center gap-3 rounded-lg border px-4 py-3", locallyExpired ? "border-danger/30 bg-danger-soft" : "border-line bg-surface-soft")}>
                  <Clock3 className={cn("shrink-0", locallyExpired ? "text-danger-ink" : "text-leaf-strong")} size={19} aria-hidden />
                  <div>
                    <p className="text-xs font-semibold text-ink-soft">{tr("Thời gian còn lại", "Time remaining")}</p>
                    <p className={cn("mt-0.5 font-mono text-xl font-bold tabular-nums", locallyExpired ? "text-danger-ink" : "text-ink")}>{formatCountdown(expiresIn, tr)}</p>
                  </div>
                </div>
              )}
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
                  {confirming ? tr("Đang chờ ngân hàng xác nhận", "Waiting for bank confirmation") : isClosed ? tr("Yêu cầu đã hết hiệu lực", "The request is no longer valid") : needsReview ? tr("Đang kiểm tra giao dịch", "Reviewing the transaction") : isUnderpaid ? tr("Cần chuyển phần còn thiếu", "Remaining amount needs to be transferred") : tr("Chờ bạn chuyển khoản", "Waiting for your transfer")}
                </h2>
              </div>
              {confirming ? <Loader2 className="mt-1 h-6 w-6 shrink-0 animate-spin text-leaf motion-reduce:animate-none" aria-hidden /> : <ReceiptText className="mt-1 h-6 w-6 shrink-0 text-leaf-strong" aria-hidden />}
            </div>

            <p className="mt-3 text-sm leading-7 text-ink-soft" aria-live="polite">
              {notice
                ? renderNotice(notice, tr)
                : confirming
                  ? tr("Hệ thống đang kiểm tra tự động mỗi vài giây. Bạn có thể giữ nguyên trang này.", "We check automatically every few seconds. You can keep this page open.")
                  : pollMode === "auto"
                    ? tr("Trang này tự kiểm tra giao dịch cho bạn. Nếu đã chuyển khoản xong, bấm nút bên dưới để kiểm tra ngay.", "This page checks the transaction for you. If you have finished the transfer, press the button below to check right away.")
                    : tr("Sau khi ngân hàng báo chuyển khoản thành công, bấm nút bên dưới để hệ thống kiểm tra ngay.", "After your bank reports a successful transfer, press the button below to check right away.")}
            </p>

            {!isClosed && !needsReview ? (
              <Button type="button" size="lg" className="mt-5 w-full" onClick={startFastPolling} disabled={confirming}>
                {confirming ? <><Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden /> {tr("Đang kiểm tra giao dịch", "Checking the transaction")}</> : <><RefreshCw size={18} aria-hidden /> {tr("Tôi đã chuyển khoản, kiểm tra ngay", "I have transferred, check now")}</>}
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
