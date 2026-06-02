"use client";

import { Activity, Leaf, TimerReset, TrendingUp } from "lucide-react";

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

  const stats = [
    { id: "total", label: "Tổng chẩn đoán", value: String(total), icon: Activity },
    { id: "leaf", label: "Ảnh lá hợp lệ", value: total ? percent(verifiedLeaves / total) : "0%", icon: Leaf },
    { id: "confidence", label: "Độ tin cậy TB", value: percent(avgConfidence), icon: TrendingUp },
    { id: "recent", label: "7 ngày gần đây", value: String(last7Days || classified), icon: TimerReset },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {stats.map((item) => (
        <Stat
          key={item.id}
          label={item.label}
          value={item.value}
          icon={item.icon}
          className="hover:-translate-y-px hover:shadow-md"
        />
      ))}
    </div>
  );
}
