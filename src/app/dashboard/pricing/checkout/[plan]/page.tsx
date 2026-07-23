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
import { cn } from "@/lib/utils";
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

function formatCountdown(milliseconds: number) {
  if (milliseconds <= 0) return "Đã hết hạn";
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
      aria-label={`Sao chép ${label}`}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-xs font-bold text-ink transition hover:border-line-strong hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/35"
    >
      {copied ? <CheckCircle2 size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
      <span className="hidden sm:inline">{copied ? "Đã chép" : "Sao chép"}</span>
    </button>
  );
}

function PaymentProgress({ status, polling }: { status: OrderStatus; polling: boolean }) {
  const isPaid = status === "paid";
  const isClosed = ["expired", "cancelled", "overpaid", "review"].includes(status);
  const isTransferred = !isClosed && (polling || status !== "pending");
  const steps = [
    { label: "Yêu cầu đã tạo", complete: true, active: false },
    { label: "Chờ giao dịch", complete: isPaid, active: !isPaid && !isClosed },
    { label: "Kích hoạt gói", complete: isPaid, active: isPaid },
  ];

  return (
    <ol className="grid grid-cols-3" aria-label="Tiến trình thanh toán">
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

function getStatusMeta(status: OrderStatus, polling: boolean): { label: string; state: StatusBadgeState } {
  if (status === "paid") return { label: "Đã thanh toán", state: "healthy" };
  if (status === "underpaid") return { label: "Đã nhận một phần", state: "watch" };
  if (status === "overpaid" || status === "review") return { label: "Cần đối soát", state: "watch" };
  if (status === "expired" || status === "cancelled") return { label: "Yêu cầu đã đóng", state: "urgent" };
  if (polling) return { label: "Đang xác nhận", state: "processing" };
  return { label: "Chờ chuyển khoản", state: "neutral" };
}

export default function CheckoutPlanPage() {
  const { plan: planParam } = useParams<{ plan: string }>();
  const router = useRouter();
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
        setOrderError(data.detail ?? data.error ?? "Không thể tạo yêu cầu thanh toán.");
        return;
      }
      setOrderData(data as OrderData);
      setNow(Date.now());
    } catch {
      setOrderError("Chưa thể kết nối dịch vụ thanh toán. Vui lòng kiểm tra mạng và thử lại.");
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
            setPaymentMessage("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để kiểm tra giao dịch.");
            return;
          }
          if (Date.now() - pollingStartedAtRef.current > 10 * 60 * 1000) {
            stopPolling();
            setPaymentMessage("Chưa thể xác nhận giao dịch. Bạn có thể quay lại kiểm tra đơn này sau.");
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
          setPaymentMessage(`Đã nhận ${formatCurrency(data.order.amount_received)}. Bạn cần chuyển thêm ${formatCurrency(data.order.remaining_amount)} với cùng nội dung chuyển khoản.`);
          return;
        }
        if (["overpaid", "review"].includes(data.order.status)) {
          stopPolling();
          setPaymentMessage("Giao dịch đã được ghi nhận nhưng cần kiểm tra lại số tiền hoặc thời điểm chuyển. Gói sẽ được kích hoạt sau khi đối soát xong.");
          return;
        }
        if (["expired", "cancelled"].includes(data.order.status)) {
          stopPolling();
          setPaymentMessage("Yêu cầu này đã đóng. Không chuyển thêm tiền vào nội dung cũ, hãy tạo yêu cầu mới.");
          return;
        }
        if (Date.now() - pollingStartedAtRef.current > 10 * 60 * 1000) {
          stopPolling();
          setPaymentMessage("Chưa thấy giao dịch sau 10 phút. Không cần chuyển thêm nếu bạn đã thanh toán, hãy kiểm tra lại sau.");
        }
      } catch {
        if (Date.now() - pollingStartedAtRef.current > 10 * 60 * 1000) {
          stopPolling();
          setPaymentMessage("Kết nối kiểm tra thanh toán bị gián đoạn. Vui lòng thử lại sau.");
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
        <StatusBadge status="healthy" label="Gói đã được kích hoạt" className="mt-6" />
        <h1 className="mt-4 font-display text-3xl font-bold text-ink sm:text-4xl">Thanh toán thành công</h1>
        <p className="mt-3 max-w-lg text-sm leading-7 text-ink-soft">
          Tài khoản của bạn đã được nâng cấp lên gói <strong className="text-ink">{planInfo.name}</strong>. Bạn có thể sử dụng quyền lợi mới ngay bây giờ.
        </p>
        <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }), "mt-7")}>
          Về bảng điều khiển
        </Link>
        <p className="mt-3 text-xs text-ink-soft">Tự động chuyển hướng sau vài giây</p>
      </Card>
    );
  }

  if (orderError) {
    return (
      <ErrorState
        title="Chưa tạo được yêu cầu thanh toán"
        description={orderError}
        action={(
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/dashboard/pricing" className={buttonVariants({ variant: "secondary", size: "md" })}>
              Quay lại bảng giá
            </Link>
            <Button type="button" onClick={() => void createOrder()} loading={creatingOrder}>
              Thử tạo lại
            </Button>
          </div>
        )}
      />
    );
  }

  if (creatingOrder) {
    return <LoadingState title="Đang chuẩn bị thông tin thanh toán" description="Hệ thống đang tạo mã chuyển khoản riêng cho bạn." />;
  }

  if (!orderData) {
    return (
      <div className="fl-stagger mx-auto max-w-[1080px] space-y-6">
        <Link href="/dashboard/pricing" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft transition hover:text-ink">
          <ArrowLeft size={16} aria-hidden /> Quay lại bảng giá
        </Link>

        <Card variant="dark" padding="lg" className="field-contours overflow-hidden rounded-xl">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-overline text-on-forest-muted">Xác nhận nâng cấp</p>
              <h1 className="mt-3 flex items-center gap-3 font-display text-3xl font-bold text-on-forest sm:text-4xl">
                <PlanIcon size={30} aria-hidden /> Gói {planInfo.name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-on-forest-muted">
                Kiểm tra quyền lợi và số tiền trước khi tạo mã QR chuyển khoản riêng cho tài khoản của bạn.
              </p>
            </div>
            <div className="rounded-lg border border-on-forest/15 bg-on-forest/[0.06] px-5 py-4 text-left lg:text-right">
              <p className="text-xs font-semibold text-on-forest-muted">Thanh toán một lần</p>
              <p className="mt-1 font-display text-3xl font-bold text-on-forest">{formatCurrency(planInfo.price)}</p>
              <p className="mt-1 text-xs text-on-forest-muted">Sử dụng trong 30 ngày</p>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <Card variant="raised" padding="lg" className="rounded-xl">
            <p className="text-overline text-leaf-strong">Quyền lợi của gói</p>
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
            <h2 className="mt-4 font-display text-2xl font-bold text-ink">Chỉ kích hoạt sau khi nhận tiền</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-ink-soft">
              <li className="flex gap-3"><Check size={16} className="mt-1 shrink-0 text-leaf-strong" aria-hidden /> Yêu cầu thanh toán có thời hạn và nội dung chuyển khoản riêng.</li>
              <li className="flex gap-3"><Check size={16} className="mt-1 shrink-0 text-leaf-strong" aria-hidden /> Hệ thống xác nhận giao dịch qua SePay và tự động kích hoạt gói.</li>
              <li className="flex gap-3"><Check size={16} className="mt-1 shrink-0 text-leaf-strong" aria-hidden /> Bạn chưa bị tính phí khi bấm nút tạo yêu cầu.</li>
            </ul>
            <Button type="button" size="lg" className="mt-6 w-full" onClick={() => void createOrder()}>
              Tạo mã thanh toán
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
  const statusMeta = getStatusMeta(visibleStatus, polling);

  return (
    <div className="mx-auto max-w-[1180px] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/pricing" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft transition hover:text-ink">
          <ArrowLeft size={16} aria-hidden /> Quay lại bảng giá
        </Link>
        <StatusBadge status={statusMeta.state} label={statusMeta.label} />
      </div>

      <Card variant="dark" padding="lg" className="field-contours overflow-hidden rounded-xl">
        <div className="grid gap-6 lg:grid-cols-[1fr_440px] lg:items-center">
          <div>
            <p className="text-overline text-on-forest-muted">Thanh toán gói {planInfo.name}</p>
            <h1 className="mt-3 font-display text-3xl font-bold text-on-forest sm:text-4xl">Hoàn tất chuyển khoản để kích hoạt gói</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-on-forest-muted">
              Quét QR hoặc nhập đúng thông tin bên dưới. Gói được kích hoạt tự động khi giao dịch được xác nhận.
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
                {isClosed ? "Yêu cầu thanh toán đã hết hiệu lực" : isUnderpaid ? "Số tiền nhận được chưa đủ" : "Giao dịch đang cần đối soát"}
              </p>
              <p className="mt-1 text-sm leading-6 text-ink-soft">
                {isClosed
                  ? "Không chuyển khoản bằng nội dung cũ. Hãy tạo yêu cầu mới để nhận mã thanh toán còn hiệu lực."
                  : isUnderpaid
                    ? `Đã nhận ${formatCurrency(orderData.order.amount_received)}. Còn thiếu ${formatCurrency(orderData.order.remaining_amount)}.`
                    : "Giao dịch đã được lưu. Hệ thống cần kiểm tra lại trước khi kích hoạt gói."}
              </p>
            </div>
          </div>
          {isClosed ? (
            <Button type="button" variant="secondary" className="shrink-0" onClick={() => void renewOrder()}>
              <RefreshCw size={16} aria-hidden /> Tạo yêu cầu mới
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(330px,0.88fr)] lg:items-start">
        <Card variant="raised" padding="lg" className="overflow-hidden rounded-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-overline text-leaf-strong">Mã thanh toán</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-ink">
                {isUnderpaid ? "Chuyển phần còn thiếu bằng thông tin bên dưới" : isClosed || needsReview ? "Mã QR hiện không thể sử dụng" : "Quét QR bằng ứng dụng ngân hàng"}
              </h2>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-success-soft text-leaf-strong"><QrCode size={22} aria-hidden /></span>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-[238px_1fr] md:items-center">
            <div className="relative rounded-xl border border-line-strong bg-qr-paper p-3 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={orderData.qr_url}
                alt={`QR thanh toán gói ${planInfo.name}`}
                className={cn("aspect-square w-full object-contain transition", !canUseQr && "opacity-15 grayscale")}
              />
              {!canUseQr ? (
                <div className="absolute inset-3 flex items-center justify-center rounded-lg border border-line bg-surface/95 p-5 text-center">
                  <div>
                    <AlertTriangle className="mx-auto text-warning-ink" size={26} aria-hidden />
                    <p className="mt-3 text-sm font-bold text-ink">{isUnderpaid ? "Không quét lại QR cũ" : "QR đã được khóa"}</p>
                    <p className="mt-1 text-xs leading-5 text-ink-soft">{isUnderpaid ? "Hãy nhập thủ công đúng số tiền còn thiếu." : "Không thực hiện thêm giao dịch với yêu cầu này."}</p>
                  </div>
                </div>
              ) : null}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{isUnderpaid ? "Cách chuyển phần còn thiếu" : "Cách nhanh nhất"}</p>
              {isUnderpaid ? (
                <ol className="mt-3 space-y-3 text-sm leading-6 text-ink-soft">
                  <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sun-soft text-xs font-bold text-warning-ink">1</span> Chọn chuyển khoản thủ công trong ứng dụng ngân hàng.</li>
                  <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sun-soft text-xs font-bold text-warning-ink">2</span> Nhập đúng {formatCurrency(orderData.order.remaining_amount)} và giữ nguyên nội dung cũ.</li>
                  <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sun-soft text-xs font-bold text-warning-ink">3</span> Hoàn tất rồi tiếp tục kiểm tra giao dịch.</li>
                </ol>
              ) : (
                <ol className="mt-3 space-y-3 text-sm leading-6 text-ink-soft">
                  <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-soft text-xs font-bold text-success-ink">1</span> Mở ứng dụng ngân hàng và chọn quét mã QR.</li>
                  <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-soft text-xs font-bold text-success-ink">2</span> Kiểm tra số tiền và giữ nguyên nội dung chuyển khoản.</li>
                  <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-soft text-xs font-bold text-success-ink">3</span> Hoàn tất giao dịch rồi bấm kiểm tra thanh toán.</li>
                </ol>
              )}
              <div className={cn("mt-5 flex items-center gap-3 rounded-lg border px-4 py-3", locallyExpired ? "border-danger/30 bg-danger-soft" : "border-line bg-surface-soft")}>
                <Clock3 className={cn("shrink-0", locallyExpired ? "text-danger-ink" : "text-leaf-strong")} size={19} aria-hidden />
                <div>
                  <p className="text-xs font-semibold text-ink-soft">Thời gian còn lại</p>
                  <p className={cn("mt-0.5 font-mono text-xl font-bold tabular-nums", locallyExpired ? "text-danger-ink" : "text-ink")}>{formatCountdown(expiresIn)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-7 border-t border-line pt-2">
            <PaymentDetailRow label="Ngân hàng" value={orderData.bank.name} />
            <PaymentDetailRow label="Số tài khoản" value={orderData.bank.account_number} copyLabel="số tài khoản" />
            <PaymentDetailRow label="Chủ tài khoản" value={orderData.bank.account_name} />
            <PaymentDetailRow label="Số tiền" value={formatCurrency(isUnderpaid ? orderData.order.remaining_amount : orderData.order.price)} copyLabel="số tiền" />
            <PaymentDetailRow label="Nội dung chuyển khoản" value={orderData.order.transfer_content} copyLabel="nội dung chuyển khoản" highlight />
          </div>

          <div className={cn("mt-4 flex items-start gap-3 rounded-lg border p-4 text-sm leading-6 text-ink", isClosed || needsReview ? "border-danger/30 bg-danger-soft" : "border-sun/35 bg-sun-soft")}>
            <AlertTriangle size={18} className={cn("mt-0.5 shrink-0", isClosed || needsReview ? "text-danger-ink" : "text-warning-ink")} aria-hidden />
            <span>
              {isClosed || needsReview
                ? "Không thực hiện thêm giao dịch với yêu cầu này."
                : <>Vui lòng chuyển <strong>{formatCurrency(isUnderpaid ? orderData.order.remaining_amount : orderData.order.price)}</strong> và giữ nguyên nội dung <strong>{orderData.order.transfer_content}</strong> để tránh chậm xác nhận.</>}
            </span>
          </div>
        </Card>

        <div className="space-y-5 lg:sticky lg:top-24">
          <Card variant="default" padding="lg" className="rounded-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-overline text-leaf-strong">Trạng thái giao dịch</p>
                <h2 className="mt-2 font-display text-2xl font-bold text-ink">
                  {polling ? "Đang chờ ngân hàng xác nhận" : isClosed ? "Yêu cầu đã hết hiệu lực" : needsReview ? "Đang kiểm tra giao dịch" : isUnderpaid ? "Cần chuyển phần còn thiếu" : "Chờ bạn chuyển khoản"}
                </h2>
              </div>
              {polling ? <Loader2 className="mt-1 h-6 w-6 shrink-0 animate-spin text-leaf motion-reduce:animate-none" aria-hidden /> : <ReceiptText className="mt-1 h-6 w-6 shrink-0 text-leaf-strong" aria-hidden />}
            </div>

            <p className="mt-3 text-sm leading-7 text-ink-soft" aria-live="polite">
              {paymentMessage ?? (polling
                ? "Hệ thống đang kiểm tra tự động mỗi vài giây. Bạn có thể giữ nguyên trang này."
                : "Sau khi ngân hàng báo chuyển khoản thành công, bấm nút bên dưới để hệ thống kiểm tra ngay.")}
            </p>

            {!isClosed && !needsReview ? (
              <Button type="button" size="lg" className="mt-5 w-full" onClick={startPolling} disabled={polling}>
                {polling ? <><Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden /> Đang kiểm tra giao dịch</> : <><RefreshCw size={18} aria-hidden /> Tôi đã chuyển khoản, kiểm tra ngay</>}
              </Button>
            ) : null}

            <div className="mt-5 flex items-start gap-3 border-t border-line pt-5">
              <ShieldCheck className="mt-0.5 shrink-0 text-leaf-strong" size={18} aria-hidden />
              <p className="text-xs leading-6 text-ink-soft">SePay gửi xác nhận trực tiếp từ giao dịch ngân hàng. Agromind AI không yêu cầu mật khẩu hoặc mã OTP của bạn.</p>
            </div>
          </Card>

          <Card variant="soft" padding="lg" className="rounded-xl">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-leaf-strong"><PlanIcon size={20} aria-hidden /></span>
              <div>
                <p className="text-xs font-semibold text-ink-soft">Gói đang nâng cấp</p>
                <h3 className="font-display text-xl font-bold text-ink">{planInfo.name}</h3>
              </div>
              <p className="ml-auto text-right font-display text-xl font-bold text-leaf-strong">{formatCurrency(orderData.order.price)}</p>
            </div>
            <dl className="mt-5 space-y-3 border-t border-line pt-5 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-ink-soft">Thời hạn gói</dt><dd className="font-semibold text-ink">30 ngày</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-soft">Gói hiện tại</dt><dd className="font-semibold uppercase text-ink">{user?.currentPlan ?? "seed"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-soft">Yêu cầu hết hạn</dt><dd className="text-right font-semibold text-ink">{formatExpiry(orderData.order.expires_at)}</dd></div>
            </dl>
          </Card>

          <div className="flex items-start gap-3 px-1 text-xs leading-6 text-ink-soft">
            <Banknote size={17} className="mt-0.5 shrink-0" aria-hidden />
            <p>Nếu đã chuyển tiền nhưng chưa thấy kích hoạt sau 10 phút, không chuyển lại lần hai. Hãy giữ biên lai và quay lại kiểm tra đơn này.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
