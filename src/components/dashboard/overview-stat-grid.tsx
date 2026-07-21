"use client";

import { Activity, AlertTriangle, Leaf, TrendingUp } from "lucide-react";

import { Stat } from "@/components/ui/stat";
import { useDiagnosisStore } from "@/store/diagnosis-store";

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function OverviewStatGrid() {
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
      label: "Tổng lượt kiểm tra",
      value: String(total),
      helper: total ? `${last7Days} lượt trong 7 ngày gần đây` : "Chưa có lần kiểm tra nào",
      icon: Activity,
      tone: "brand" as const,
    },
    {
      id: "leaf",
      label: "Ảnh lá hợp lệ",
      value: total ? percent(verifiedLeaves / total) : "0%",
      helper: total ? `${verifiedLeaves}/${total} ảnh đạt yêu cầu đầu vào` : "Tải ảnh rõ để bắt đầu",
      icon: Leaf,
      tone: "default" as const,
    },
    {
      id: "confidence",
      label: "Độ tin cậy trung bình",
      value: percent(avgConfidence),
      helper: classified ? `Tính từ ${classified} kết quả đã phân tích` : "Chưa đủ dữ liệu để tính",
      icon: TrendingUp,
      tone: "default" as const,
    },
    {
      id: "review",
      label: "Cần theo dõi",
      value: String(needsReview),
      helper: needsReview ? "Nên xem lại hoặc chụp thêm ảnh" : "Chưa có kết quả cần chú ý",
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
