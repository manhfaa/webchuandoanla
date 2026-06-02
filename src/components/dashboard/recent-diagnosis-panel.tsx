"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatConfidence, formatDate } from "@/lib/utils";
import { useDiagnosisStore } from "@/store/diagnosis-store";

export function RecentDiagnosisPanel() {
  const { records } = useDiagnosisStore();
  const items = records.slice(0, 3);

  return (
    <Card variant="dark" padding="md" className="flex min-h-0 flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-overline text-muted-on-dark">Xác thực gần đây</p>
          <h2 className="mt-1 text-h2 text-on-dark">Ảnh lá nổi bật trong tuần</h2>
        </div>
        <Link
          href="/dashboard/history"
          className="inline-flex items-center gap-1.5 rounded-md border border-border-dark px-3 py-1.5 text-body-sm font-medium text-on-dark transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500/40"
        >
          Xem tất cả
          <ArrowUpRight strokeWidth={1.75} className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <ul className="mt-4 space-y-2">
        {!items.length ? (
          <li className="rounded-md border border-border-dark bg-app-surface-2 p-4 text-body-sm leading-7 text-muted-on-dark">
            Chưa có bản ghi chẩn đoán nào. Hãy tải ảnh thật ở mục Xác thực ảnh để tạo lịch sử đầu tiên.
          </li>
        ) : null}
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`/dashboard/results/${item.id}`}
              className="no-underline flex flex-col gap-2 rounded-md border border-border-dark bg-app-surface-2 p-3 transition duration-150 hover:border-leaf-500/30 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500/40 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <Badge variant="brand">{item.plant}</Badge>
                <span className="text-body-sm font-semibold text-on-dark">{item.disease}</span>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3 text-body-sm text-muted-on-dark">
                <span>{formatDate(item.createdAt)}</span>
                <span className="tabular-nums text-leaf-300">{formatConfidence(item.leafConfidence ?? item.confidence)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
