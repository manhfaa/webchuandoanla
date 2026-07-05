"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Camera, CheckCircle2, Leaf, ShieldCheck } from "lucide-react";

import { formatConfidence } from "@/lib/utils";
import { useDiagnosisStore } from "@/store/diagnosis-store";

import { getDashboardInsights } from "./dashboard-insights";

export function DashboardHeroPanel() {
  const { records } = useDiagnosisStore();
  const insights = getDashboardInsights(records);
  const hasAttention = insights.attentionLast7Days > 0;
  const validRate = insights.total ? insights.validLeafCount / insights.total : 0;

  const insightText = insights.total
    ? `Bạn đã có ${insights.total} lượt kiểm tra. ${insights.attentionLast7Days} kết quả trong tuần này nên được theo dõi lại.`
    : "Chưa có kết quả kiểm tra nào. Hãy tải ảnh lá đầu tiên để Agromind AI hỗ trợ phân tích.";

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-[#7CFFB2]/[0.12] bg-[#0A2A1A]/80 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur sm:p-6 lg:p-7">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 18%, rgba(85,217,139,.36), transparent 24%), linear-gradient(135deg, rgba(117,224,161,.16) 0 1px, transparent 1px 26px)",
        }}
      />

      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="rounded-[28px] border border-[#7CFFB2]/[0.12] bg-[linear-gradient(135deg,rgba(16,61,40,.92),rgba(10,42,26,.68))] p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#75E0A1]">
            Tổng quan vườn
          </p>
          <h2 className="mt-3 max-w-2xl text-[28px] font-bold leading-tight text-[#F4FFF7] sm:text-[32px]">
            Tình trạng vườn hôm nay
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#9EB8A8]">
            Dựa trên các lần kiểm tra ảnh lá và dữ liệu đã lưu trong tài khoản.
          </p>

          <div className="mt-6 rounded-[24px] border border-[#7CFFB2]/[0.12] bg-[#03170E]/60 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E9FFF1] text-[#0B4D2C]">
                <Leaf className="h-5 w-5" strokeWidth={2} />
              </span>
              <div>
                <p className="text-[18px] font-semibold leading-7 text-[#F4FFF7]">{insightText}</p>
                <p className="mt-2 text-[14px] leading-6 text-[#9EB8A8]">
                  Kết quả AI mang tính tham khảo. Khi cây bệnh lan nhanh hoặc cần dùng thuốc, nên hỏi thêm chuyên gia nông nghiệp địa phương.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 text-[13px] font-semibold">
            <span className="rounded-full bg-[#E9FFF1] px-3 py-1.5 text-[#0B4D2C]">
              Hôm nay: {insights.todayChecks}
            </span>
            <span className="rounded-full border border-[#7CFFB2]/[0.18] bg-white/[0.04] px-3 py-1.5 text-[#CFEBDD]">
              7 ngày: {insights.last7DaysCount}
            </span>
            <span className="rounded-full border border-[#7CFFB2]/[0.18] bg-white/[0.04] px-3 py-1.5 text-[#CFEBDD]">
              Ảnh hợp lệ: {formatConfidence(validRate)}
            </span>
          </div>

          <Link
            href="/dashboard/diagnosis"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#55D98B] px-5 py-3 text-[14px] font-bold text-[#03170E] shadow-[0_14px_34px_rgba(85,217,139,0.24)] transition hover:-translate-y-0.5 hover:bg-[#75E0A1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75E0A1]/60"
          >
            Kiểm tra ảnh mới
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>

        <aside
          className={
            hasAttention
              ? "rounded-[28px] border border-[#F5C84B]/30 bg-[#2C2410]/80 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.18)]"
              : "rounded-[28px] border border-[#7CFFB2]/[0.12] bg-[#103D28]/80 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.18)]"
          }
        >
          <div
            className={
              hasAttention
                ? "flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5C84B]/15 text-[#F5C84B]"
                : "flex h-12 w-12 items-center justify-center rounded-2xl bg-[#55D98B]/15 text-[#55D98B]"
            }
          >
            {hasAttention ? <AlertTriangle className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
          </div>
          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#9EB8A8]">
            Cảnh báo chăm sóc
          </p>
          <h3 className="mt-2 text-[24px] font-bold leading-tight text-[#F4FFF7]">
            {hasAttention ? "Có kết quả cần chú ý" : "Chưa có cảnh báo nổi bật"}
          </h3>
          <p className="mt-3 text-[15px] leading-7 text-[#CFEBDD]">
            {hasAttention
              ? "Nên kiểm tra lại các ca có độ tin cậy dưới 70% hoặc ảnh lá chưa đủ rõ."
              : "Các kết quả gần đây đang ở mức ổn định. Tiếp tục theo dõi lá sau tưới, mưa lớn hoặc khi thấy đốm mới."}
          </p>

          <div className="mt-5 grid gap-3">
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#03170E]/45 p-3">
              <Camera className="h-5 w-5 text-[#75E0A1]" />
              <span className="text-[14px] font-semibold text-[#F4FFF7]">
                Ưu tiên ảnh rõ mặt lá, đủ sáng và không bị che khuất.
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#03170E]/45 p-3">
              <CheckCircle2 className="h-5 w-5 text-[#75E0A1]" />
              <span className="text-[14px] font-semibold text-[#F4FFF7]">
                Theo dõi lại sau vài ngày nếu vết bệnh lan rộng.
              </span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
