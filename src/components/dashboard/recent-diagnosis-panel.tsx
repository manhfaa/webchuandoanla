"use client";

import Link from "next/link";
import { ArrowUpRight, Leaf } from "lucide-react";

import { formatConfidence, formatDate, cn } from "@/lib/utils";
import { useDiagnosisStore } from "@/store/diagnosis-store";

import { getDashboardInsights, getRecordConfidence, getResultStatus } from "./dashboard-insights";

const statusClass = {
  success: "bg-[#E9FFF1] text-[#0B4D2C]",
  warning: "bg-[#F5C84B]/15 text-[#F5C84B] border border-[#F5C84B]/25",
  risk: "bg-[#F9735B]/15 text-[#F9735B] border border-[#F9735B]/25",
};

export function RecentDiagnosisPanel() {
  const { records } = useDiagnosisStore();
  const items = getDashboardInsights(records).sortedRecords.slice(0, 4);

  return (
    <section className="flex min-h-0 flex-col rounded-[30px] border border-[#7CFFB2]/[0.12] bg-[#0A2A1A]/80 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.16)] backdrop-blur sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#75E0A1]">
            Theo dõi gần đây
          </p>
          <h2 className="mt-2 text-[26px] font-bold leading-tight text-[#F4FFF7]">
            Kết quả kiểm tra gần đây
          </h2>
        </div>
        <Link
          href="/dashboard/history"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#7CFFB2]/[0.18] px-4 py-2 text-[13px] font-bold text-[#F4FFF7] transition hover:border-[#55D98B]/50 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75E0A1]/50"
        >
          Xem tất cả lịch sử
          <ArrowUpRight strokeWidth={2} className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <ul className="mt-5 space-y-3">
        {!items.length ? (
          <li className="rounded-[24px] border border-[#7CFFB2]/[0.12] bg-[#03170E]/55 p-5 text-[15px] leading-7 text-[#CFEBDD]">
            Chưa có kết quả kiểm tra nào. Hãy tải ảnh lá đầu tiên để Agromind AI hỗ trợ phân tích.
          </li>
        ) : null}
        {items.map((item) => {
          const status = getResultStatus(item);
          const confidence = getRecordConfidence(item);

          return (
            <li key={item.id}>
              <Link
                href={`/dashboard/results/${item.id}`}
                className="group flex flex-col gap-3 rounded-[24px] border border-[#7CFFB2]/[0.12] bg-[#103D28]/55 p-3 transition duration-200 hover:-translate-y-0.5 hover:border-[#55D98B]/45 hover:bg-[#103D28]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75E0A1]/50 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#7CFFB2]/[0.12] bg-[#03170E]/55">
                    {item.image ? (
                      <img src={item.image} alt={`Ảnh lá ${item.plant}`} className="h-full w-full object-cover" />
                    ) : (
                      <Leaf className="h-6 w-6 text-[#75E0A1]" strokeWidth={2} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#E9FFF1] px-2.5 py-1 text-[12px] font-bold text-[#0B4D2C]">
                        {item.plant}
                      </span>
                      <span className={cn("rounded-full px-2.5 py-1 text-[12px] font-bold", statusClass[status.tone])}>
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-1 text-[15px] font-bold text-[#F4FFF7]">{item.disease}</p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-4 pl-[68px] text-[13px] text-[#9EB8A8] sm:block sm:pl-0 sm:text-right">
                  <p>{formatDate(item.createdAt)}</p>
                  <p className="mt-1 font-bold tabular-nums text-[#75E0A1]">{formatConfidence(confidence)}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
