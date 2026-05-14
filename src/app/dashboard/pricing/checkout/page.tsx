"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Landmark,
  ShieldCheck,
  Smartphone,
  XCircle,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { pricingPlans } from "@/data/mock/plans";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/session-store";
import { PlanTier } from "@/types";

type VerifyStatus = "idle" | "checking" | "pending" | "paid" | "error";

const PLAN_AMOUNTS: Record<Exclude<PlanTier, "free">, number> = {
  pro: 299000,
  plus: 699000,
};

const MAX_CHECK_ATTEMPTS = 24;

/** Mã QR chuyển khoản theo gói (ảnh bạn cung cấp). */
const PLAN_QR_IMAGE: Record<Exclude<PlanTier, "free">, string> = {
  pro: "https://prepared-amethyst-16qhtyx0oe.edgeone.app/z7815484741895_e78d88fe41b29acbdc0bed0f01119b54.jpg",
  plus: "https://lexical-copper-dbnxp9teqz.edgeone.app/z7815486809538_89364190a8fe6f5279d21ec76222ae1f.jpg",
};

const DEFAULT_RECIPIENT_ACCOUNT_NUMBER = "1064563291";

type PayerBankOption = {
  id: string;
  label: string;
  /** Mở trang tải / cài đặt app mobile banking (không thể mở trực tiếp màn hình chuyển khoản vì mỗi ngân hàng khác nhau). */
  playStoreUrl: string;
  appStoreUrl: string;
};

const PAYER_BANK_OPTIONS: PayerBankOption[] = [
  {
    id: "vcb",
    label: "Vietcombank",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.vietcombank.mobile",
    appStoreUrl: "https://apps.apple.com/vn/app/vietcombank-digibank/id1119966575",
  },
  {
    id: "tcb",
    label: "Techcombank",
    playStoreUrl: "https://play.google.com/store/apps/details?id=vn.com.techcombank.bb.app",
    appStoreUrl: "https://apps.apple.com/vn/app/techcombank-mobile/id1548629832",
  },
  {
    id: "mb",
    label: "MB Bank",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.mbmobile",
    appStoreUrl: "https://apps.apple.com/vn/app/mb-bank/id1283611646",
  },
  {
    id: "vtb",
    label: "VietinBank",
    playStoreUrl: "https://play.google.com/store/apps/details?id=vn.vietinbank.ipay",
    appStoreUrl: "https://apps.apple.com/vn/app/ipay-vietinbank/id1044980739",
  },
  {
    id: "bidv",
    label: "BIDV",
    playStoreUrl: "https://play.google.com/store/apps/details?id=vn.com.bidv.ibank2",
    appStoreUrl: "https://apps.apple.com/vn/app/bidv-smart-banking/id1032560018",
  },
  {
    id: "acb",
    label: "ACB",
    playStoreUrl: "https://play.google.com/store/apps/details?id=mobile.acb.com.vn",
    appStoreUrl: "https://apps.apple.com/vn/app/acb-one/id1349155882",
  },
  {
    id: "vib",
    label: "VIB",
    playStoreUrl: "https://play.google.com/store/apps/details?id=vn.com.vib.myvib2",
    appStoreUrl: "https://apps.apple.com/vn/app/myvib-by-vib/id1491805734",
  },
  {
    id: "other",
    label: "Ngân hàng khác (tự mở app)",
    playStoreUrl: "https://www.google.com/search?q=mobile+banking+app",
    appStoreUrl: "https://www.google.com/search?q=mobile+banking+app",
  },
];

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

function openPayerBankApp(option: PayerBankOption) {
  const isApple = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const url = isApple ? option.appStoreUrl : option.playStoreUrl;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function PricingCheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPlan = searchParams.get("plan");
  const planId: PlanTier = requestedPlan === "plus" ? "plus" : requestedPlan === "pro" ? "pro" : "free";
  const plan = useMemo(() => pricingPlans.find((item) => item.id === planId), [planId]);
  const amount = planId === "free" ? 0 : PLAN_AMOUNTS[planId];
  const qrImageUrl = planId !== "free" ? PLAN_QR_IMAGE[planId] : "";

  const { user, accessToken, setPlan } = useSessionStore();
  const currentPlan = user?.currentPlan ?? "free";

  const [payerName, setPayerName] = useState(user?.name ?? "");
  const [payerBankId, setPayerBankId] = useState(PAYER_BANK_OPTIONS[0]?.id ?? "");
  const [bankName, setBankName] = useState(PAYER_BANK_OPTIONS[0]?.label ?? "");
  const selectedPayerBank = useMemo(
    () => PAYER_BANK_OPTIONS.find((b) => b.id === payerBankId) ?? PAYER_BANK_OPTIONS[0],
    [payerBankId],
  );
  const [transferCode, setTransferCode] = useState("");
  const [contactName, setContactName] = useState(user?.name ?? "");
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [contactPhone, setContactPhone] = useState("");
  const [contactNote, setContactNote] = useState("");
  const [recipientAccountName, setRecipientAccountName] = useState("");
  const [recipientAccountNumber, setRecipientAccountNumber] = useState(DEFAULT_RECIPIENT_ACCOUNT_NUMBER);
  const [recipientBankName, setRecipientBankName] = useState("");
  const [status, setStatus] = useState<VerifyStatus>("idle");
  const [statusNote, setStatusNote] = useState("");
  const [attempts, setAttempts] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!transferCode && planId !== "free") {
      const suffix = Date.now().toString().slice(-6);
      setTransferCode(`LEAFIQ-${planId.toUpperCase()}-${suffix}`);
    }
  }, [planId, transferCode]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  async function verifyPayment() {
    const res = await fetch("/api/django/api/payments/verify-transfer/", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        plan: planId,
        amount,
        payer_name: payerName.trim(),
        bank_name: bankName.trim(),
        transfer_code: transferCode.trim(),
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        contact_note: contactNote.trim(),
        recipient_account_name: recipientAccountName.trim(),
        recipient_account_number: recipientAccountNumber.trim(),
        recipient_bank_name: recipientBankName.trim(),
      }),
    });

    if (!res.ok) {
      throw new Error("Chưa xác nhận được thanh toán từ hệ thống.");
    }

    const data = (await res.json()) as {
      paid?: boolean;
      is_paid?: boolean;
      status?: string;
      message?: string;
    };
    const isPaid =
      data.paid === true ||
      data.is_paid === true ||
      data.status === "paid" ||
      data.status === "received";

    return {
      isPaid,
      note: data.message ?? "",
    };
  }

  function stopPolling() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (planId === "free") {
      setPlan("free");
      router.replace("/dashboard/pricing");
      return;
    }

    setStatus("checking");
    setStatusNote("Đang đợi hệ thống đối soát giao dịch…");
    setAttempts(0);
    stopPolling();

    try {
      const firstCheck = await verifyPayment();
      if (firstCheck.isPaid) {
        setPlan(planId);
        setStatus("paid");
        setStatusNote("Đã nhận tiền. Hệ thống đã tự động nâng cấp gói của bạn.");
        router.replace(`/dashboard/pricing?upgraded=${planId}`);
        return;
      }

      setStatus("pending");
      setStatusNote(firstCheck.note || "Chưa ghi nhận giao dịch. Hệ thống sẽ tiếp tục kiểm tra tự động.");

      timerRef.current = setInterval(async () => {
        setAttempts((prev) => prev + 1);

        try {
          const result = await verifyPayment();
          if (result.isPaid) {
            stopPolling();
            setPlan(planId);
            setStatus("paid");
            setStatusNote("Đã nhận tiền. Hệ thống đã tự động nâng cấp gói của bạn.");
            router.replace(`/dashboard/pricing?upgraded=${planId}`);
            return;
          }

          setStatus("pending");
          setStatusNote(result.note || "Hệ thống chưa nhận được tiền. Bạn vẫn giữ nguyên gói hiện tại.");
        } catch {
          setStatus("pending");
          setStatusNote("Tạm thời chưa đối soát được. Hệ thống sẽ thử lại.");
        }
      }, 5000);
    } catch (error) {
      setStatus("error");
      setStatusNote(error instanceof Error ? error.message : "Không thể kiểm tra thanh toán.");
    }
  }

  useEffect(() => {
    if (attempts >= MAX_CHECK_ATTEMPTS) {
      stopPolling();
      if (status !== "paid") {
        setStatus("pending");
        setStatusNote(
          "Đã quá thời gian đối soát. Nếu hệ thống chưa nhận được tiền thì gói sẽ không được nâng cấp.",
        );
      }
    }
  }, [attempts, status]);

  if (!plan || planId === "free") {
    return (
      <Card className="rounded-[30px] border-white/10 bg-white/5 text-white">
        <p className="text-sm leading-7 text-emerald-50/85">
          Gói này không cần thanh toán. Bạn có thể quay lại trang bảng giá.
        </p>
        <div className="mt-5">
          <Link href="/dashboard/pricing" className="text-sm text-lime-200 underline underline-offset-4">
            Quay lại bảng giá
          </Link>
        </div>
      </Card>
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
            <h2 className="mt-3 font-display text-3xl font-semibold">Nâng cấp gói {plan.name}</h2>
            <p className="mt-3 text-sm leading-7 text-emerald-50/80">
              Hệ thống chỉ nâng cấp khi đối soát thành công giao dịch. Nếu chưa nhận được tiền, gói hiện tại vẫn được giữ
              nguyên.
            </p>
          </div>
          <Link href="/dashboard/pricing" className="text-sm text-lime-200 underline underline-offset-4">
            Quay lại bảng giá
          </Link>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[30px] border-white/10 bg-white/5 text-white">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-emerald-50">Người chuyển khoản</span>
                <input
                  className="h-11 w-full rounded-2xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-lime-200/70"
                  value={payerName}
                  onChange={(event) => setPayerName(event.target.value)}
                  required
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-emerald-50">Ngân hàng bạn chuyển từ</span>
                <select
                  className="h-11 w-full rounded-2xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-lime-200/70"
                  value={payerBankId}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    setPayerBankId(nextId);
                    const opt = PAYER_BANK_OPTIONS.find((b) => b.id === nextId);
                    if (opt) setBankName(opt.label);
                  }}
                  required
                >
                  {PAYER_BANK_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id} className="bg-brand-900 text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-emerald-50">Nội dung chuyển khoản</span>
              <input
                className="h-11 w-full rounded-2xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-lime-200/70"
                value={transferCode}
                onChange={(event) => setTransferCode(event.target.value)}
                required
              />
            </label>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100/65">
                Thông tin nhận xác nhận thanh toán
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-emerald-50">Họ và tên</span>
                  <input
                    className="h-11 w-full rounded-2xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-lime-200/70"
                    value={contactName}
                    onChange={(event) => setContactName(event.target.value)}
                    required
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-emerald-50">Email</span>
                  <input
                    type="email"
                    className="h-11 w-full rounded-2xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-lime-200/70"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    placeholder="bạn@example.com"
                    required
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-emerald-50">Số điện thoại</span>
                  <input
                    className="h-11 w-full rounded-2xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-lime-200/70"
                    value={contactPhone}
                    onChange={(event) => setContactPhone(event.target.value)}
                    placeholder="09xxxxxxxx"
                    required
                  />
                </label>
                <label className="block space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-emerald-50">Ghi chú (tùy chọn)</span>
                  <input
                    className="h-11 w-full rounded-2xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-lime-200/70"
                    value={contactNote}
                    onChange={(event) => setContactNote(event.target.value)}
                    placeholder="VD: Vui lòng gửi thông báo qua email cho tôi"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-emerald-50/85">
              <p className="mb-3 font-semibold text-lime-200">Thông tin người nhận chuyển khoản</p>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-emerald-50">Tên tài khoản nhận</span>
                  <input
                    className="h-11 w-full rounded-2xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-lime-200/70"
                    value={recipientAccountName}
                    onChange={(event) => setRecipientAccountName(event.target.value)}
                    placeholder="Theo mã QR / tên trên tài khoản"
                    required
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-emerald-50">Số tài khoản nhận</span>
                  <input
                    className="h-11 w-full rounded-2xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-lime-200/70"
                    value={recipientAccountNumber}
                    onChange={(event) => setRecipientAccountNumber(event.target.value)}
                    required
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-emerald-50">Ngân hàng nhận (nếu biết)</span>
                  <input
                    className="h-11 w-full rounded-2xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-lime-200/70"
                    value={recipientBankName}
                    onChange={(event) => setRecipientBankName(event.target.value)}
                    placeholder="VD: Theo mã QR"
                  />
                </label>
              </div>
              <p className="mt-3 text-xs text-emerald-100/70">Số tiền cần chuyển: {formatVnd(amount)}</p>
            </div>

            {qrImageUrl ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100/65">
                  Mã QR gói {plan.name}
                </p>
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrImageUrl}
                    alt={`Mã QR chuyển khoản gói ${plan.name}`}
                    className="h-44 w-44 rounded-2xl border border-white/10 bg-white object-contain p-2 sm:h-52 sm:w-52"
                  />
                  <div className="max-w-md space-y-3 text-sm leading-7 text-emerald-50/85">
                    <p>
                      Quét mã bằng app ngân hàng bạn đã chọn, hoặc chuyển đúng số tài khoản{" "}
                      <span className="font-semibold text-lime-200">{recipientAccountNumber || DEFAULT_RECIPIENT_ACCOUNT_NUMBER}</span>
                      .
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      className="w-full sm:w-auto"
                      onClick={() => selectedPayerBank && openPayerBankApp(selectedPayerBank)}
                    >
                      <Smartphone size={16} />
                      Mở app {selectedPayerBank?.label ?? "ngân hàng"} để chuyển khoản
                      <ExternalLink size={14} className="opacity-80" />
                    </Button>
                    <p className="text-xs text-emerald-100/65">
                      Nút này mở trang cài đặt / mở app ngân hàng (Android: CH Play, iPhone: App Store). Sau khi vào app,
                      bạn tự nhập số tiền và nội dung chuyển khoản như bên trên. Website không thể tự mở màn hình chuyển
                      tiền thay cho app ngân hàng.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <Button type="submit" variant="secondary" size="md" loading={status === "checking"} className="w-full">
              <ArrowLeftRight size={16} />
              Xác nhận và bắt đầu đối soát
            </Button>
          </form>
        </Card>

        <Card className="rounded-[30px] border-white/10 bg-white/5 text-white">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100/65">
              Trạng thái thanh toán
            </p>

            <div
              className={cn(
                "rounded-2xl border px-4 py-4 text-sm leading-7",
                status === "paid"
                  ? "border-emerald-200/60 bg-emerald-200/15 text-emerald-50"
                  : status === "error"
                    ? "border-rose-200/55 bg-rose-200/15 text-rose-100"
                    : "border-white/10 bg-white/5 text-emerald-50/85",
              )}
            >
              <div className="mb-2 flex items-center gap-2 font-semibold">
                {status === "paid" ? (
                  <CheckCircle2 size={16} />
                ) : status === "error" ? (
                  <XCircle size={16} />
                ) : (
                  <Clock3 size={16} />
                )}
                {status === "paid"
                  ? "Đã nhận thanh toán"
                  : status === "checking"
                    ? "Đang đối soát"
                    : status === "error"
                      ? "Lỗi xác minh"
                      : "Chờ đối soát"}
              </div>
              <p>{statusNote || "Nhập thông tin và gửi để bắt đầu đối soát."}</p>
              {status !== "idle" && status !== "paid" ? (
                <p className="mt-2 text-xs text-emerald-100/75">Lần kiểm tra: {attempts}</p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-emerald-50/80">
              <p className="mb-2 flex items-center gap-2 font-semibold text-lime-200">
                <ShieldCheck size={16} />
                Quy tắc nâng cấp gói
              </p>
              <p>- Đã nhận tiền: tự động nâng cấp sang {plan.name}.</p>
              <p>- Chưa nhận tiền: không thay đổi gói hiện tại ({currentPlan.toUpperCase()}).</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-emerald-50/80">
              <p className="flex items-center gap-2 font-semibold text-lime-200">
                <Landmark size={16} />
                Lưu ý
              </p>
              <p className="mt-2 leading-7">
                Cần backend hỗ trợ endpoint đối soát giao dịch: <code>/api/payments/verify-transfer/</code>.
                Nếu backend chưa xác nhận được tiền, hệ thống sẽ giữ nguyên gói hiện tại.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
