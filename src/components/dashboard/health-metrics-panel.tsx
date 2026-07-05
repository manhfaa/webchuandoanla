"use client";

import { useEffect, useState } from "react";

import { formatConfidence } from "@/lib/utils";
import { useDiagnosisStore } from "@/store/diagnosis-store";

import { getDashboardInsights } from "./dashboard-insights";

export function HealthMetricsPanel() {
  const { records } = useDiagnosisStore();
  const [mounted, setMounted] = useState(false);
  const insights = getDashboardInsights(records);
  const total = insights.total;

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const metrics = [
    {
      label: "Ảnh lá hợp lệ",
      note: "Ảnh đủ rõ để phân tích",
      value: total ? insights.validLeafCount / total : 0,
    },
    {
      label: "Đã phân tích bệnh",
      note: "Kết quả đã có phân loại",
      value: total ? insights.classifiedCount / total : 0,
    },
    {
      label: "Kết quả từ 70%",
      note: "Nên ưu tiên theo dõi",
      value: total ? insights.confidentCount / total : 0,
    },
    {
      label: "Đã lưu theo tài khoản",
      note: "Có thể xem lại trong lịch sử",
      value: total ? insights.savedCount / total : 0,
    },
  ];

  return (
    <section className="flex flex-col rounded-[30px] border border-[#7CFFB2]/[0.12] bg-[#0A2A1A]/80 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.16)] backdrop-blur sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#75E0A1]">
        Chất lượng dữ liệu
      </p>
      <h2 className="mt-2 text-[26px] font-bold leading-tight text-[#F4FFF7]">
        Chất lượng dữ liệu kiểm tra
      </h2>
      <p className="mt-2 text-[15px] leading-7 text-[#9EB8A8]">
        Các chỉ số này giúp bạn biết ảnh đã đủ rõ và kết quả có đáng để theo dõi tiếp hay không.
      </p>

      <ul className="mt-6 space-y-5">
        {metrics.map((item) => {
          const width = Math.max(0, Math.min(100, Math.round(item.value * 100)));
          return (
            <li key={item.label}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[14px] font-bold text-[#F4FFF7]">{item.label}</p>
                  <p className="mt-0.5 text-[12px] leading-5 text-[#9EB8A8]">{item.note}</p>
                </div>
                <span className="font-bold tabular-nums text-[#75E0A1]">{formatConfidence(item.value)}</span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#123825]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#2FA664] to-[#75E0A1] transition-[width] duration-1000 ease-out"
                  style={{ width: mounted ? `${width}%` : "0%" }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
