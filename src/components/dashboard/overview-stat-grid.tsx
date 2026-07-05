"use client";

import { Activity, AlertTriangle, Leaf, TrendingUp } from "lucide-react";

import { cn, formatConfidence } from "@/lib/utils";
import { useDiagnosisStore } from "@/store/diagnosis-store";

import { getDashboardInsights } from "./dashboard-insights";

export function OverviewStatGrid() {
  const { records } = useDiagnosisStore();
  const insights = getDashboardInsights(records);
  const validRate = insights.total ? insights.validLeafCount / insights.total : 0;

  const stats = [
    {
      id: "total",
      label: "Tổng lượt kiểm tra",
      value: String(insights.total),
      helper: `${insights.todayChecks} lượt trong hôm nay`,
      trend: `+${insights.last7DaysCount} trong tuần này`,
      icon: Activity,
      featured: true,
    },
    {
      id: "leaf",
      label: "Ảnh lá hợp lệ",
      value: formatConfidence(validRate),
      helper: `${insights.validLeafCount}/${insights.total || 0} ảnh đủ điều kiện`,
      trend: insights.total ? "Ảnh rõ giúp kết quả đáng tin hơn" : "Chưa có ảnh kiểm tra",
      icon: Leaf,
    },
    {
      id: "confidence",
      label: "Độ tin cậy trung bình",
      value: formatConfidence(insights.averageConfidence),
      helper: "Tính từ các kết quả đã lưu",
      trend: insights.confidentCount ? `${insights.confidentCount} kết quả từ 70%` : "Chưa đủ dữ liệu",
      icon: TrendingUp,
    },
    {
      id: "attention",
      label: "Cần theo dõi lại",
      value: String(insights.attentionCount),
      helper: insights.attentionCount ? "Ưu tiên kiểm tra ảnh hoặc triệu chứng" : "Chưa có ca cần chú ý",
      trend: `${insights.attentionLast7Days} trong 7 ngày gần đây`,
      icon: AlertTriangle,
      warning: insights.attentionCount > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((item) => {
        const Icon = item.icon;

        return (
          <article
            key={item.id}
            className={cn(
              "group rounded-[28px] border border-[#7CFFB2]/[0.12] bg-[#0A2A1A]/80 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.16)] backdrop-blur transition duration-200 hover:-translate-y-1 hover:border-[#55D98B]/40 hover:bg-[#103D28]/90",
              item.featured && "bg-[linear-gradient(135deg,rgba(16,61,40,.96),rgba(10,42,26,.78))]",
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9EB8A8]">
                  {item.label}
                </p>
                <p className="mt-3 text-[42px] font-bold leading-none tracking-tight text-[#F4FFF7] sm:text-[46px]">
                  {item.value}
                </p>
              </div>
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#55D98B]/12 text-[#55D98B]",
                  item.warning && "bg-[#F5C84B]/15 text-[#F5C84B]",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
              </span>
            </div>

            <p className="mt-4 text-[14px] leading-6 text-[#CFEBDD]">{item.helper}</p>
            <p
              className={cn(
                "mt-2 text-[12px] font-semibold text-[#55D98B]",
                item.warning && "text-[#F5C84B]",
              )}
            >
              {item.trend}
            </p>
          </article>
        );
      })}
    </div>
  );
}
