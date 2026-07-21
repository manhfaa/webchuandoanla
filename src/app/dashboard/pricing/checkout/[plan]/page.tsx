"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, Check, CheckCircle2, Copy, Crown, Loader2, ShieldCheck, Sprout, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/session-store";

type OrderData = {
  order: { plan: string; price: number; transfer_content: string };
  bank: { name: string; account_number: string; account_name: string };
  qr_url: string;
};

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  });
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-2 inline-flex h-7 items-center gap-1 rounded-md border border-line bg-surface-soft px-2 text-xs font-medium text-ink-soft transition hover:bg-surface hover:text-ink"
    >
      <Copy size={12} />
      {copied ? "Đã sao chép" : "Sao chép"}
    </button>
  );
}

export default function CheckoutPlanPage() {
  const { plan: planParam } = useParams<{ plan: string }>();
  const router = useRouter();
  const { user, accessToken, setPlan } = useSessionStore();

  const planInfo = PLANS[planParam as keyof typeof PLANS];
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [success, setSuccess] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tạo order khi mount
  useEffect(() => {
    if (!planInfo || planParam === "seed") {
      router.replace("/dashboard/pricing");
      return;
    }

    async function createOrder() {
      try {
        const res = await fetch("/api/django/api/payments/create-order/", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ plan: planParam }),
        });
        const data = await res.json();
        if (!res.ok) {
          setOrderError(data.error ?? "Không thể tạo đơn hàng.");
        } else {
          setOrderData(data as OrderData);
        }
      } catch {
        setOrderError("Chưa thể kết nối dịch vụ thanh toán. Vui lòng kiểm tra mạng và thử lại.");
      }
    }

    createOrder();
  }, [planParam, planInfo, accessToken, router]);

  // Dọn dẹp interval khi unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  function startPolling() {
    setPolling(true);
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/django/api/payments/status/", {
          headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json() as { current_plan: string };
        if (data.current_plan === planParam) {
          stopPolling();
          setPlan(planParam as Parameters<typeof setPlan>[0]);
          setSuccess(true);
          setTimeout(() => router.push("/dashboard"), 3000);
        }
      } catch {
        // tiếp tục thử
      }
    }, 2000);
  }

  if (!planInfo) return null;

  const PlanIcon = { grow: TrendingUp, bloom: ShieldCheck, elite: Crown }[planParam] ?? Sprout;

  if (success) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center text-ink">
        <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-surface-soft text-leaf-strong"><PlanIcon size={30} aria-hidden /></span>
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-leaf" />
          <h1 className="font-display text-3xl font-bold">Thanh toán thành công</h1>
        </div>
        <p className="text-ink-soft">
          Bạn đã nâng cấp lên gói <strong>{planInfo.name}</strong>. Đang chuyển hướng...
        </p>
      </div>
    );
  }

  if (orderError) {
    return <ErrorState title="Chưa tạo được yêu cầu thanh toán" description={orderError} action={<Link href="/dashboard/pricing" className={buttonVariants({ variant: "secondary", size: "md" })}>Quay lại bảng giá</Link>} />;
  }

  if (!orderData) {
    return <LoadingState title="Đang chuẩn bị thông tin thanh toán" description="Vui lòng chờ trong giây lát." />;
  }

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <Card variant="dark" padding="lg" className="field-contours rounded-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-overline text-on-forest-muted">
              Thanh toán nâng cấp
            </p>
            <h2 className="mt-3 flex items-center gap-3 font-display text-3xl font-bold text-on-forest">
              <PlanIcon size={26} aria-hidden /> Nâng cấp gói {planInfo.name}
            </h2>
            <p className="mt-3 text-sm leading-7 text-on-forest-muted">
              Hệ thống tự động xác nhận khi SePay nhận được giao dịch từ tài khoản của bạn.
            </p>
          </div>
          <Link href="/dashboard/pricing" className="text-sm font-semibold text-on-forest hover:text-on-forest-muted">
            Quay lại bảng giá
          </Link>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Cột trái: QR + thông tin CK */}
        <Card variant="raised" padding="lg" className="rounded-xl">
          <h3 className="mb-4 text-overline text-leaf-strong">
            Quét mã QR để thanh toán
          </h3>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={orderData.qr_url}
            alt={`QR thanh toán gói ${planInfo.name}`}
            className="mx-auto h-52 w-52 rounded-lg border border-line bg-paper object-contain p-2"
          />

          <div className="mt-6 space-y-3 text-sm leading-7">
            <div className="flex items-center justify-between rounded-lg border border-line bg-surface-soft px-4 py-3">
              <span className="text-ink-soft">Ngân hàng</span>
              <span className="font-semibold text-ink">{orderData.bank.name}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-line bg-surface-soft px-4 py-3">
              <span className="text-ink-soft">Số tài khoản</span>
              <span className="font-semibold text-ink">
                {orderData.bank.account_number}
                <CopyButton text={orderData.bank.account_number} />
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-line bg-surface-soft px-4 py-3">
              <span className="text-ink-soft">Chủ tài khoản</span>
              <span className="font-semibold text-ink">{orderData.bank.account_name}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-line bg-surface-soft px-4 py-3">
              <span className="text-ink-soft">Số tiền</span>
              <span className="font-bold text-leaf-strong">
                {orderData.order.price.toLocaleString("vi-VN")}đ
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-sun/30 bg-sun/10 px-4 py-3">
              <span className="text-ink-soft">Nội dung chuyển khoản</span>
              <span className="font-bold text-soil">
                {orderData.order.transfer_content}
                <CopyButton text={orderData.order.transfer_content} />
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-lg border border-sun/30 bg-sun/10 p-4 text-xs leading-6 text-ink-soft">
            <AlertTriangle size={16} className="mt-1 shrink-0 text-soil" aria-hidden />
            <span>Giữ nguyên nội dung chuyển khoản <strong className="text-ink">{orderData.order.transfer_content}</strong> để hệ thống xác nhận đúng giao dịch.</span>
          </div>

          {!polling ? (
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="mt-6 w-full"
              onClick={startPolling}
            >
              Tôi đã chuyển khoản
            </Button>
          ) : (
            <div className="mt-6 flex flex-col items-center gap-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-leaf" />
              <p className="text-sm font-semibold text-ink">Đang chờ xác nhận thanh toán...</p>
              <p className="text-xs text-ink-soft">Thường mất 5–30 giây sau khi chuyển khoản</p>
            </div>
          )}
        </Card>

        {/* Cột phải: Tóm tắt đơn hàng */}
        <Card variant="default" padding="lg" className="rounded-xl">
          <p className="text-overline text-leaf-strong">
            Tóm tắt đơn hàng
          </p>

          <div className="mt-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-surface-soft text-leaf-strong"><PlanIcon size={22} aria-hidden /></span>
            <h3 className="mt-3 font-display text-2xl font-bold text-ink">Gói {planInfo.name}</h3>
            <p className="mt-1 text-3xl font-bold text-leaf-strong">{planInfo.priceLabel}</p>
            <p className="mt-2 text-sm text-ink-soft">{planInfo.tagline}</p>
          </div>

          <div className="mt-6 space-y-2">
            {planInfo.features.map((feature) => (
              <div
                key={feature}
                className="flex items-start gap-3 rounded-lg bg-surface-soft px-4 py-3 text-sm text-ink"
              >
                <Check size={16} className="mt-0.5 shrink-0 text-leaf-strong" aria-hidden />
                {feature}
              </div>
            ))}
          </div>

          <div className={cn(
            "mt-6 rounded-lg border p-4 text-xs leading-6",
            "border-line bg-surface-soft text-ink-soft",
          )}>
            <p>• Gói có hiệu lực <strong>30 ngày</strong> kể từ khi thanh toán thành công.</p>
            <p>• Hệ thống tự động xác nhận qua SePay — không cần liên hệ hỗ trợ.</p>
            <p>• Đang dùng gói: <strong>{user?.currentPlan ?? "seed"}</strong></p>
          </div>
        </Card>
      </div>
    </div>
  );
}
