"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { useDiagnosisStore } from "@/store/diagnosis-store";

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function HealthMetricsPanel() {
  const { records } = useDiagnosisStore();
  const [mounted, setMounted] = useState(false);
  const total = records.length;

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const metrics = [
    {
      label: "Ảnh lá hợp lệ",
      value: total ? records.filter((item) => item.yoloVerified).length / total : 0,
    },
    {
      label: "CNN đã phân loại",
      value: total ? records.filter((item) => item.classificationReady).length / total : 0,
    },
    {
      label: "Kết quả tin cậy từ 70%",
      value: total
        ? records.filter((item) => (item.cnnConfidence ?? item.leafConfidence ?? item.confidence ?? 0) >= 0.7).length / total
        : 0,
    },
    {
      label: "Đã lưu theo tài khoản",
      value: total ? records.filter((item) => item.savedByUser).length / total : 0,
    },
  ];

  return (
    <Card variant="dark" padding="md" className="flex flex-col">
      <p className="text-overline text-muted-on-dark">Chỉ số vận hành</p>
      <h2 className="mt-2 text-h2 text-on-dark">Tín hiệu chất lượng pipeline</h2>
      <p className="mt-1 text-body-sm text-muted-on-dark">
        Tính từ các bản ghi chẩn đoán thật đang lưu trên backend của tài khoản hiện tại.
      </p>

      <ul className="mt-5 space-y-4">
        {metrics.map((item) => {
          const width = Math.max(0, Math.min(100, Math.round(item.value * 100)));
          return (
            <li key={item.label}>
              <div className="flex items-center justify-between gap-3 text-body-sm">
                <span className="text-muted-on-dark">{item.label}</span>
                <span className="font-semibold tabular-nums text-leaf-300">{pct(item.value)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-app-surface-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-leaf-600 to-leaf-400 transition-[width] duration-1000 ease-out"
                  style={{ width: mounted ? `${width}%` : "0%" }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
