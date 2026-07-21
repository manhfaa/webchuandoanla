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
      label: "Có kết quả gợi ý",
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
    <Card variant="default" padding="lg" className="flex flex-col rounded-xl">
      <p className="text-overline text-leaf-strong">Chất lượng ảnh và kết quả</p>
      <h2 className="mt-2 text-h2 font-bold text-ink">Chất lượng dữ liệu kiểm tra</h2>
      <p className="mt-1 text-body-sm text-ink-soft">
        Các chỉ số giúp bạn biết ảnh đã đủ rõ và kết quả có đáng để theo dõi tiếp hay không.
      </p>

      <ul className="mt-6 space-y-5">
        {metrics.map((item) => {
          const width = Math.max(0, Math.min(100, Math.round(item.value * 100)));
          return (
            <li key={item.label}>
              <div className="flex items-center justify-between gap-3 text-body-sm">
                <span className="font-medium text-ink-soft">{item.label}</span>
                <span className="font-bold tabular-nums text-leaf-strong">{pct(item.value)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-soft">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-leaf-strong to-leaf transition-[width] duration-1000 ease-out"
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
