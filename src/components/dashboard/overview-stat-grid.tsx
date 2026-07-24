"use client";

import { Activity, AlertTriangle, Leaf, TrendingUp } from "lucide-react";

import { Stat } from "@/components/ui/stat";
import { useTr } from "@/lib/use-tr";
import { useDiagnosisStore } from "@/store/diagnosis-store";

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function OverviewStatGrid() {
  const tr = useTr();
  const { records } = useDiagnosisStore();
  const total = records.length;
  const classified = records.filter((item) => item.classificationReady).length;
  const verifiedLeaves = records.filter((item) => item.yoloVerified).length;
  const today = new Date();
  const last7Days = records.filter((item) => {
    const created = new Date(item.createdAt);
    return Number.isFinite(created.getTime()) && today.getTime() - created.getTime() <= 7 * 24 * 60 * 60 * 1000;
  }).length;
  const avgConfidence = total
    ? records.reduce((sum, item) => sum + (item.cnnConfidence ?? item.leafConfidence ?? item.confidence ?? 0), 0) / total
    : 0;
  const needsReview = records.filter((item) => {
    const confidence = item.cnnConfidence ?? item.leafConfidence ?? item.confidence ?? 0;
    return !item.yoloVerified || !item.classificationReady || confidence < 0.7;
  }).length;

  const stats = [
    {
      id: "total",
      label: tr("Tổng lượt kiểm tra", "Total checks"),
      value: String(total),
      helper: total ? tr(`${last7Days} lượt trong 7 ngày gần đây`, `${last7Days} checks in the last 7 days`) : tr("Chưa có lần kiểm tra nào", "No checks yet"),
      icon: Activity,
      tone: "brand" as const,
    },
    {
      id: "leaf",
      label: tr("Ảnh lá hợp lệ", "Valid leaf images"),
      value: total ? percent(verifiedLeaves / total) : "0%",
      helper: total ? tr(`${verifiedLeaves}/${total} ảnh đạt yêu cầu đầu vào`, `${verifiedLeaves}/${total} images met input requirements`) : tr("Tải ảnh rõ để bắt đầu", "Upload a clear image to start"),
      icon: Leaf,
      tone: "default" as const,
    },
    {
      id: "confidence",
      label: tr("Độ tin cậy trung bình", "Average confidence"),
      value: percent(avgConfidence),
      helper: classified ? tr(`Tính từ ${classified} kết quả đã phân tích`, `Based on ${classified} analyzed results`) : tr("Chưa đủ dữ liệu để tính", "Not enough data to calculate"),
      icon: TrendingUp,
      tone: "default" as const,
    },
    {
      id: "review",
      label: tr("Cần theo dõi", "Needs monitoring"),
      value: String(needsReview),
      helper: needsReview ? tr("Nên xem lại hoặc chụp thêm ảnh", "Consider reviewing or taking more images") : tr("Chưa có kết quả cần chú ý", "No results need attention"),
      icon: AlertTriangle,
      tone: needsReview ? ("warning" as const) : ("default" as const),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {stats.map((item) => (
        <Stat
          key={item.id}
          label={item.label}
          value={item.value}
          helper={item.helper}
          icon={item.icon}
          tone={item.tone}
          className="min-h-[164px] hover:-translate-y-[3px] hover:shadow-md"
        />
      ))}
    </div>
  );
}
