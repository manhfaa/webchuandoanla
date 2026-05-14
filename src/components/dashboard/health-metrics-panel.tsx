"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { successMetrics } from "@/data/mock/dashboard";

function parsePercent(value: string) {
  const n = Number.parseFloat(value.replace("%", "").trim());
  return Number.isFinite(n) ? n : 0;
}

export function HealthMetricsPanel() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <Card variant="dark" padding="md" className="flex flex-col">
      <p className="text-overline text-muted-on-dark">Chỉ số vận hành (mô phỏng)</p>
      <h2 className="mt-2 text-h2 text-on-dark">Tín hiệu chất lượng pipeline</h2>
      <p className="mt-1 text-body-sm text-muted-on-dark">
        Theo dõi nhanh độ ổn định của các bước xác thực và phản hồi người dùng.
      </p>

      <ul className="mt-5 space-y-4">
        {successMetrics.map((item) => {
          const pct = parsePercent(item.value);
          return (
            <li key={item.label}>
              <div className="flex items-center justify-between gap-3 text-body-sm">
                <span className="text-muted-on-dark">{item.label}</span>
                <span className="font-semibold tabular-nums text-leaf-300">{item.value}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-app-surface-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-leaf-600 to-leaf-400 transition-[width] duration-1000 ease-out"
                  style={{
                    width: mounted ? `${pct}%` : "0%",
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
