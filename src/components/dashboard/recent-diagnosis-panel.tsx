"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Leaf } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatusBadge, type StatusBadgeState } from "@/components/ui/badge";
import { useTr } from "@/lib/use-tr";
import { formatConfidence, formatDate } from "@/lib/utils";
import { useDiagnosisStore } from "@/store/diagnosis-store";

function resultStatus(
  item: ReturnType<typeof useDiagnosisStore.getState>["records"][number],
  tr: (vi: string, en: string) => string,
): {
  status: StatusBadgeState;
  label: string;
} {
  const confidence = item.cnnConfidence ?? item.leafConfidence ?? item.confidence ?? 0;
  if (!item.yoloVerified || !item.classificationReady) return { status: "urgent", label: tr("Nên kiểm tra lại", "Should re-check") };
  if (confidence < 0.7) return { status: "watch", label: tr("Cần theo dõi", "Needs monitoring") };
  return { status: "healthy", label: tr("Tin cậy cao", "High confidence") };
}

export function RecentDiagnosisPanel() {
  const tr = useTr();
  const { records } = useDiagnosisStore();
  const items = records.slice(0, 3);

  return (
    <Card variant="raised" padding="lg" className="flex min-h-0 flex-col rounded-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-overline text-leaf-strong">{tr("Theo dõi gần đây", "Recent monitoring")}</p>
          <h2 className="mt-2 text-h2 font-bold text-ink">{tr("Kết quả kiểm tra gần đây", "Recent check results")}</h2>
          <p className="mt-1 text-body-sm text-ink-soft">{tr("Mở từng kết quả để xem lại ảnh, gợi ý và việc nên làm.", "Open each result to review the image, suggestions, and what to do.")}</p>
        </div>
        <Link
          href="/dashboard/history"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-body-sm font-semibold text-ink transition hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/35"
        >
          {tr("Xem tất cả lịch sử", "View all history")}
          <ArrowUpRight strokeWidth={1.75} className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <ul className="mt-5 space-y-3">
        {!items.length ? (
          <li className="rounded-lg border border-dashed border-line bg-surface-soft p-6 text-center">
            <Leaf className="mx-auto h-7 w-7 text-leaf" aria-hidden />
            <p className="mt-3 text-sm font-semibold text-ink">{tr("Chưa có kết quả kiểm tra", "No check results yet")}</p>
            <p className="mt-1 text-body-sm text-ink-soft">{tr("Tải ảnh lá đầu tiên để bắt đầu theo dõi sức khỏe cây.", "Upload your first leaf image to start monitoring plant health.")}</p>
            <Link href="/dashboard/diagnosis" className="mt-4 inline-flex min-h-10 items-center rounded-md bg-leaf px-4 text-sm font-semibold text-on-leaf transition hover:bg-leaf-strong">
              {tr("Tải ảnh lá đầu tiên", "Upload your first leaf image")}
            </Link>
          </li>
        ) : null}
        {items.map((item) => {
          const state = resultStatus(item, tr);
          const confidence = item.cnnConfidence ?? item.leafConfidence ?? item.confidence;
          return (
          <li key={item.id}>
            <Link
              href={`/dashboard/results/${item.id}`}
              className="group flex flex-col gap-3 rounded-lg border border-line bg-surface p-3 transition duration-180 hover:-translate-y-px hover:border-leaf/35 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/35 sm:flex-row sm:items-center"
            >
              <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-md border border-line bg-surface-soft">
                {item.image ? (
                  <Image src={item.image} alt={tr(`Ảnh lá ${item.plant}`, `Leaf image ${item.plant}`)} fill sizes="64px" unoptimized className="object-cover transition duration-260 group-hover:scale-105" />
                ) : (
                  <Leaf className="absolute inset-0 m-auto h-5 w-5 text-leaf" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="brand">{item.plant || tr("Chưa xác định", "Not identified")}</Badge>
                  <StatusBadge status={state.status} label={state.label} />
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-ink">{item.disease || tr("Chưa có gợi ý bệnh", "No disease suggestion yet")}</p>
              </div>
              <div className="flex shrink-0 items-end justify-between gap-4 sm:flex-col sm:items-end">
                <span className="text-xs font-medium text-ink-soft">{formatDate(item.createdAt)}</span>
                <span className="font-display text-base font-bold tabular-nums text-leaf-strong">{formatConfidence(confidence)}</span>
              </div>
            </Link>
          </li>
        );})}
      </ul>
    </Card>
  );
}
