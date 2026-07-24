"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarRange, Filter, History, Leaf, SearchX } from "lucide-react";

import { Badge, StatusBadge, type StatusBadgeState } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { fetchDiagnosisRecords } from "@/lib/diagnoses-client";
import { useTr } from "@/lib/use-tr";
import { toUserFacingText } from "@/lib/user-facing-copy";
import { formatConfidence, formatDate } from "@/lib/utils";
import { useDiagnosisStore } from "@/store/diagnosis-store";
import { useSessionStore } from "@/store/session-store";
import type { DiagnosisRecord } from "@/types";

type ResultState = "all" | "high" | "watch" | "retake";

function getResultState(item: DiagnosisRecord, tr: (vi: string, en: string) => string): { key: Exclude<ResultState, "all">; status: StatusBadgeState; label: string } {
  const confidence = item.cnnConfidence ?? item.leafConfidence ?? item.confidence ?? 0;
  if (!item.yoloVerified || !item.classificationReady) return { key: "retake", status: "urgent", label: tr("Nên kiểm tra lại", "Should re-check") };
  if (confidence < 0.7) return { key: "watch", status: "watch", label: tr("Cần theo dõi", "Needs monitoring") };
  return { key: "high", status: "healthy", label: tr("Tin cậy cao", "High confidence") };
}

export default function DashboardHistoryPage() {
  const tr = useTr();
  const { accessToken } = useSessionStore();
  const { records, savedRecordIds, setRecords } = useDiagnosisStore();
  const [plantFilter, setPlantFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<ResultState>("all");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchDiagnosisRecords(accessToken)
      .then((items) => {
        if (cancelled) return;
        setRecords(items);
        setError(null);
      })
      .catch((requestError) => {
        if (cancelled) return;
        setError(requestError instanceof Error ? requestError.message : tr("Không tải được lịch sử kiểm tra.", "Could not load your check history."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, setRecords]);

  const plantOptions = useMemo(() => ["all", ...new Set(records.map((item) => item.plant).filter(Boolean))], [records]);
  const filtered = useMemo(
    () =>
      records.filter((item) => {
        const plantMatches = plantFilter === "all" || item.plant === plantFilter;
        const statusMatches = statusFilter === "all" || getResultState(item, tr).key === statusFilter;
        const dateMatches = !dateFilter || item.createdAt.slice(0, 10) === dateFilter;
        return plantMatches && statusMatches && dateMatches;
      }),
    [dateFilter, plantFilter, records, statusFilter],
  );

  const resetFilters = () => {
    setPlantFilter("all");
    setStatusFilter("all");
    setDateFilter("");
  };

  return (
    <div className="fl-stagger mx-auto max-w-[1320px] space-y-6">
      <Card variant="raised" padding="lg" className="rounded-xl">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div>
            <p className="text-overline text-leaf-strong">{tr("Nhật ký ảnh lá", "Leaf image journal")}</p>
            <h2 className="mt-2 max-w-2xl font-display text-[28px] font-bold leading-tight tracking-[-0.035em] text-ink sm:text-[34px]">{tr("Theo dõi thay đổi của cây qua từng lần kiểm tra", "Track how your plants change across each check")}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-soft">{tr("Lọc theo cây, mức cần chú ý hoặc thời gian để tìm lại kết quả phù hợp.", "Filter by plant, attention level or date to find the right result.")}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink-soft"><Filter size={15} aria-hidden /> {tr("Cây trồng", "Plant")}</span>
              <select value={plantFilter} onChange={(event) => setPlantFilter(event.target.value)} className="h-11 min-w-[180px] rounded-md border border-line bg-surface px-3.5 text-sm font-medium text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20">
                {plantOptions.map((plant) => <option key={plant} value={plant}>{plant === "all" ? tr("Tất cả cây", "All plants") : plant}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink-soft"><Leaf size={15} aria-hidden /> {tr("Trạng thái", "Status")}</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ResultState)} className="h-11 min-w-[180px] rounded-md border border-line bg-surface px-3.5 text-sm font-medium text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20">
                <option value="all">{tr("Tất cả trạng thái", "All statuses")}</option>
                <option value="high">{tr("Tin cậy cao", "High confidence")}</option>
                <option value="watch">{tr("Cần theo dõi", "Needs monitoring")}</option>
                <option value="retake">{tr("Nên kiểm tra lại", "Should re-check")}</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink-soft"><CalendarRange size={15} aria-hidden /> {tr("Ngày kiểm tra", "Check date")}</span>
              <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="h-11 min-w-[180px] rounded-md border border-line bg-surface px-3.5 text-sm font-medium text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20" />
            </label>
          </div>
        </div>
      </Card>

      {loading ? <ListSkeleton count={4} itemClassName="h-[128px]" /> : null}
      {!loading && error ? <ErrorState title={tr("Chưa tải được lịch sử", "Could not load history")} description={error} onRetry={() => window.location.reload()} /> : null}

      {!loading && !error && filtered.length ? (
        <div className="grid gap-3">
          {filtered.map((item) => {
            const state = getResultState(item, tr);
            const confidence = item.cnnConfidence ?? item.leafConfidence ?? item.confidence;
            return (
              <Link key={item.id} href={`/dashboard/results/${item.id}`} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/35">
                <Card variant="default" padding="sm" className="rounded-lg transition duration-180 group-hover:-translate-y-px group-hover:border-leaf/35 group-hover:shadow-md">
                  <div className="grid gap-4 sm:grid-cols-[92px_minmax(0,1fr)_auto] sm:items-center">
                    <div className="relative h-[88px] overflow-hidden rounded-md border border-line bg-surface-soft">
                      {item.image ? <Image src={item.image} alt={tr(`Ảnh lá ${item.plant}`, `${item.plant} leaf image`)} fill sizes="92px" unoptimized className="object-cover transition duration-260 group-hover:scale-105" /> : <Leaf className="absolute inset-0 m-auto h-7 w-7 text-leaf" aria-hidden />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="brand">{item.plant || tr("Chưa xác định cây", "Plant not identified")}</Badge>
                        <StatusBadge status={state.status} label={state.label} />
                        {savedRecordIds.includes(item.id) ? <Badge variant="muted">{tr("Đã lưu", "Saved")}</Badge> : null}
                      </div>
                      <h3 className="mt-3 truncate text-base font-bold tracking-[-0.015em] text-ink">{item.disease || tr("Chưa có gợi ý bệnh", "No disease suggestion yet")}</h3>
                      <p className="mt-1 line-clamp-1 text-sm text-ink-soft">{toUserFacingText(item.note, tr("Mở kết quả để xem thông tin chi tiết.", "Open the result to see full details."))}</p>
                    </div>
                    <div className="flex items-center justify-between gap-5 border-t border-line pt-3 sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <p className="text-xs font-medium text-ink-soft">{formatDate(item.createdAt)}</p>
                        <p className="mt-1 font-display text-xl font-bold tabular-nums text-leaf-strong">{formatConfidence(confidence)}</p>
                      </div>
                      <ArrowRight size={17} className="text-ink-soft transition group-hover:translate-x-1 group-hover:text-leaf-strong" aria-hidden />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : null}

      {!loading && !error && !records.length ? (
        <EmptyState title={tr("Chưa có kết quả kiểm tra nào", "No check results yet")} description={tr("Hãy tải ảnh lá đầu tiên để Agromind AI hỗ trợ phân tích và bắt đầu lưu lịch sử theo dõi.", "Upload your first leaf image so Agromind AI can help analyze it and start building your history.")} icon={History} action={<Link href="/dashboard/diagnosis" className={buttonVariants({ variant: "primary", size: "md" })}>{tr("Kiểm tra ảnh lá", "Check a leaf image")}</Link>} />
      ) : null}

      {!loading && !error && records.length > 0 && !filtered.length ? (
        <EmptyState title={tr("Không tìm thấy kết quả phù hợp", "No matching results found")} description={tr("Thử chọn cây khác, bỏ ngày cụ thể hoặc xem tất cả trạng thái.", "Try another plant, clear the specific date, or view all statuses.")} icon={SearchX} action={<button type="button" onClick={resetFilters} className={buttonVariants({ variant: "secondary", size: "md" })}>{tr("Xóa bộ lọc", "Clear filters")}</button>} />
      ) : null}
    </div>
  );
}
