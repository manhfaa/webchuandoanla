"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarRange, Filter } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { fetchDiagnosisRecords } from "@/lib/diagnoses-client";
import { formatConfidence, formatDate } from "@/lib/utils";
import { useDiagnosisStore } from "@/store/diagnosis-store";
import { useSessionStore } from "@/store/session-store";

export default function DashboardHistoryPage() {
  const { accessToken } = useSessionStore();
  const { records, savedRecordIds, setRecords } = useDiagnosisStore();
  const [plantFilter, setPlantFilter] = useState("all");
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
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Không tải được lịch sử chẩn đoán.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, setRecords]);

  const plantOptions = useMemo(
    () => ["all", ...new Set(records.map((item) => item.plant))],
    [records],
  );

  const filtered = useMemo(
    () =>
      records.filter((item) => {
        const plantMatches = plantFilter === "all" || item.plant === plantFilter;
        const dateMatches = !dateFilter || item.createdAt.slice(0, 10) === dateFilter;
        return plantMatches && dateMatches;
      }),
    [dateFilter, plantFilter, records],
  );

  return (
    <div className="space-y-6">
      <Card className="rounded-[34px] border-white/10 bg-white/5 text-white">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100/60">
              Bộ lọc lịch sử
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold">
              Tra cứu các lần xác thực ảnh lá theo cây và ngày
            </h2>
          </div>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-body-sm font-medium text-muted-on-dark">
              <Filter size={16} />
              Loại cây
            </span>
            <select
              value={plantFilter}
              onChange={(event) => setPlantFilter(event.target.value)}
              className="h-11 min-w-[220px] rounded-[10px] border border-border-dark bg-app-surface-2 px-3.5 text-body text-on-dark outline-none transition focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/30"
            >
              {plantOptions.map((plant) => (
                <option key={plant} value={plant} className="bg-app-surface-2 text-on-dark">
                  {plant === "all" ? "Tất cả cây trồng" : plant}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-body-sm font-medium text-muted-on-dark">
              <CalendarRange size={16} />
              Ngày xác thực
            </span>
            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="h-11 min-w-[220px] rounded-[10px] border border-border-dark bg-app-surface-2 px-3.5 text-body text-on-dark outline-none transition focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/30 [color-scheme:dark]"
            />
          </label>
        </div>
      </Card>

      <div className="grid gap-4">
        {loading ? (
          <Card className="rounded-[32px] border-white/10 bg-white/5 py-14 text-center text-white">
            Đang tải lịch sử từ backend...
          </Card>
        ) : null}
        {error ? (
          <Card className="rounded-[32px] border-rose-300/30 bg-rose-500/10 py-6 text-center text-rose-100">
            {error}
          </Card>
        ) : null}
        {filtered.map((item) => (
          <Link key={item.id} href={`/dashboard/results/${item.id}`} className="no-underline block">
            <Card className="rounded-[32px] border-white/10 bg-white/5 text-white transition hover:-translate-y-1 hover:bg-white/10">
              <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="locked">{item.plant}</Badge>
                    <Badge variant="dark">{item.severity}</Badge>
                    {savedRecordIds.includes(item.id) ? <Badge variant="success">Đã lưu</Badge> : null}
                    {item.inputMethod ? (
                      <Badge variant="brand">
                        {item.inputMethod === "capture"
                          ? "Ảnh chụp"
                          : item.inputMethod === "upload"
                            ? "Ảnh tải lên"
                            : "Ảnh mẫu"}
                      </Badge>
                    ) : null}
                  </div>
                  <h3 className="mt-4 font-display text-3xl font-semibold">{item.disease}</h3>
                  <p className="mt-3 text-sm leading-7 text-emerald-50/75">{item.note}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">Ngày</p>
                    <p className="mt-3 font-display text-2xl font-semibold">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">
                      Độ tin cậy YOLO
                    </p>
                    <p className="mt-3 font-display text-2xl font-semibold text-lime-200">
                      {formatConfidence(item.leafConfidence ?? item.confidence)}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">
                      Trạng thái CNN
                    </p>
                    <p className="mt-3 font-display text-2xl font-semibold">
                      {item.classificationReady ? "Đã sẵn sàng" : "Chưa có CNN"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {!loading && filtered.length === 0 ? (
        <Card className="rounded-[32px] border-white/10 bg-white/5 py-14 text-center text-white">
          Không có bản ghi nào khớp bộ lọc hiện tại.
        </Card>
      ) : null}
    </div>
  );
}
