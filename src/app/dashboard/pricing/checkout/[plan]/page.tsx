"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Copy, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      className="ml-2 inline-flex h-7 items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2 text-xs text-emerald-50/85 transition hover:bg-white/20"
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
        setOrderError("Không thể kết nối server. Vui lòng thử lại.");
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

  if (success) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-white">
        <div className="text-7xl">{planInfo.icon}</div>
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          <h1 className="font-display text-3xl font-semibold">Thanh toán thành công!</h1>
        </div>
        <p className="text-emerald-50/80">
          Bạn đã nâng cấp lên gói <strong>{planInfo.name}</strong>. Đang chuyển hướng...
        </p>
      </div>
    );
  }

  if (orderError) {
    return (
      <Card className="rounded-[30px] border-white/10 bg-white/5 text-white">
        <p className="text-sm text-rose-300">{orderError}</p>
        <div className="mt-4">
          <Link href="/dashboard/pricing" className="text-sm text-lime-200 underline underline-offset-4">
            Quay lại bảng giá
          </Link>
        </div>
      </Card>
    );
  }

  if (!orderData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-[34px] border-white/10 bg-gradient-to-br from-brand-800 via-brand-900 to-brand-800 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-emerald-100/60">
              Thanh toán nâng cấp
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold">
              {planInfo.icon} Nâng cấp gói {planInfo.name}
            </h2>
            <p className="mt-3 text-sm leading-7 text-emerald-50/80">
              Hệ thống tự động xác nhận khi SePay nhận được giao dịch từ tài khoản của bạn.
            </p>
          </div>
          <Link href="/dashboard/pricing" className="text-sm text-lime-200 underline underline-offset-4">
            Quay lại bảng giá
          </Link>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Cột trái: QR + thông tin CK */}
        <Card className="rounded-[30px] border-white/10 bg-white/5 text-white">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100/65">
            Quét mã QR để thanh toán
          </h3>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={orderData.qr_url}
            alt={`QR thanh toán gói ${planInfo.name}`}
            className="mx-auto h-52 w-52 rounded-2xl border border-white/10 bg-white object-contain p-2"
          />

          <div className="mt-6 space-y-3 text-sm leading-7">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-emerald-50/70">Ngân hàng</span>
              <span className="font-semibold">{orderData.bank.name}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-emerald-50/70">Số tài khoản</span>
              <span className="font-semibold">
                {orderData.bank.account_number}
                <CopyButton text={orderData.bank.account_number} />
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-emerald-50/70">Chủ tài khoản</span>
              <span className="font-semibold">{orderData.bank.account_name}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-emerald-50/70">Số tiền</span>
              <span className="font-semibold text-lime-200">
                {orderData.order.price.toLocaleString("vi-VN")}đ
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-yellow-200/20 bg-yellow-200/5 px-4 py-3">
              <span className="text-emerald-50/70">Nội dung CK</span>
              <span className="font-semibold text-yellow-200">
                {orderData.order.transfer_content}
                <CopyButton text={orderData.order.transfer_content} />
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-yellow-200/20 bg-yellow-200/5 p-4 text-xs leading-6 text-yellow-100/90">
            ⚠️ Giữ nguyên nội dung chuyển khoản{" "}
            <strong>{orderData.order.transfer_content}</strong>. Hệ thống dựa vào nội dung này để tự động xác nhận.
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
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
              <p className="text-sm font-semibold">Đang chờ xác nhận thanh toán...</p>
              <p className="text-xs text-emerald-50/65">Thường mất 5–30 giây sau khi chuyển khoản</p>
            </div>
          )}
        </Card>

        {/* Cột phải: Tóm tắt đơn hàng */}
        <Card className="rounded-[30px] border-white/10 bg-white/5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100/65">
            Tóm tắt đơn hàng
          </p>

          <div className="mt-6 text-center">
            <div className="text-5xl">{planInfo.icon}</div>
            <h3 className="mt-3 font-display text-2xl font-semibold">Gói {planInfo.name}</h3>
            <p className="mt-1 text-3xl font-bold text-lime-200">{planInfo.priceLabel}</p>
            <p className="mt-2 text-sm text-emerald-50/70">{planInfo.tagline}</p>
          </div>

          <div className="mt-6 space-y-2">
            {planInfo.features.map((feature) => (
              <div
                key={feature}
                className="flex items-start gap-3 rounded-xl bg-white/5 px-4 py-3 text-sm text-emerald-50/85"
              >
                <span className="mt-0.5 shrink-0 text-lime-300">✅</span>
                {feature}
              </div>
            ))}
          </div>

          <div className={cn(
            "mt-6 rounded-2xl border p-4 text-xs leading-6",
            "border-white/10 bg-white/5 text-emerald-50/70",
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
