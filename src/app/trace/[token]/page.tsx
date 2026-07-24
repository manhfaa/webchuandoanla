"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CalendarDays, Leaf, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { fetchPublicTraceability, type PublicTraceability } from "@/lib/farmops-client";
import { useTr } from "@/lib/use-tr";

function activityLabel(type: string, tr: (vi: string, en: string) => string) {
  const labels: Record<string, string> = {
    watering: tr("Tưới nước", "Watering"),
    fertilizing: tr("Bón phân", "Fertilizing"),
    pesticide: tr("Phun thuốc", "Spraying pesticide"),
    disease_check: tr("Kiểm tra sâu bệnh", "Pest & disease check"),
    pruning: tr("Tỉa cành", "Pruning"),
    harvest: tr("Thu hoạch", "Harvest"),
    note: tr("Ghi chú", "Note"),
  };
  return labels[type] ?? type;
}

export default function PublicTraceabilityPage() {
  const tr = useTr();
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<PublicTraceability | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.token) return;
    void (async () => {
      try {
        setLoading(true);
        setData(await fetchPublicTraceability(params.token));
      } catch (err) {
        setError(err instanceof Error ? err.message : tr("Không tìm thấy trang truy xuất.", "Traceability page not found."));
      } finally {
        setLoading(false);
      }
    })();
  }, [params.token]);

  return (
    <main id="main-content" className="field-contours min-h-[100dvh] bg-canvas px-4 py-8 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-body-sm font-semibold text-leaf-700 no-underline">
          <Leaf strokeWidth={1.75} className="h-4 w-4" />
          Agromind AI
        </Link>

        <Card variant="light" padding="lg" className="shadow-sm">
          {loading ? (
            <LoadingState title={tr("Đang mở nhật ký canh tác", "Opening the farming log")} description={tr("Thông tin công khai đang được tải.", "Public information is loading.")} />
          ) : error ? (
            <ErrorState title={tr("Chưa mở được nhật ký", "Could not open the log")} description={error} />
          ) : data ? (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-overline text-leaf-700">{tr("QR truy xuất nguồn gốc", "Origin traceability QR")}</p>
                  <h1 className="mt-2 text-h1 text-ink-900">{data.product_name}</h1>
                  <p className="mt-3 text-body text-ink-500">
                    {data.crop_type} · {data.plot_name} · {data.region || tr("Chưa ghi vùng canh tác", "Growing region not recorded")}
                  </p>
                </div>
                <Badge variant="success">
                  <ShieldCheck strokeWidth={1.75} className="h-4 w-4" />
                  {tr("Công khai", "Public")}
                </Badge>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-md border border-line bg-surface-soft p-4">
                  <p className="text-caption uppercase tracking-[0.14em] text-leaf-700">{tr("Ngày xuống giống", "Planting date")}</p>
                  <p className="mt-2 text-xl font-semibold text-ink-900">
                    {data.planting_start_date ? new Date(data.planting_start_date).toLocaleDateString("vi-VN") : tr("Chưa ghi", "Not recorded")}
                  </p>
                </div>
                <div className="rounded-md border border-line bg-surface-soft p-4">
                  <p className="text-caption uppercase tracking-[0.14em] text-leaf-700">{tr("Giai đoạn", "Stage")}</p>
                  <p className="mt-2 text-xl font-semibold text-ink-900">{data.growth_stage || tr("Đang theo dõi", "Being monitored")}</p>
                </div>
                <div className="rounded-md border border-line bg-surface-soft p-4">
                  <p className="text-caption uppercase tracking-[0.14em] text-leaf-700">{tr("Ngày công khai", "Published date")}</p>
                  <p className="mt-2 text-xl font-semibold text-ink-900">
                    {new Date(data.created_at).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </Card>

        {data ? (
          <Card variant="light" padding="lg" className="shadow-sm">
            <div className="flex items-center gap-2">
              <CalendarDays strokeWidth={1.75} className="h-5 w-5 text-leaf-700" />
              <h2 className="text-h2 text-ink-900">{tr("Dòng thời gian chăm sóc", "Care timeline")}</h2>
            </div>
            <div className="mt-5 space-y-3">
              {data.logs.length ? (
                data.logs.map((log) => (
                  <div key={log.id} className="rounded-md border border-line bg-surface p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="muted">{activityLabel(log.activity_type, tr)}</Badge>
                      <span className="text-caption text-ink-500">{new Date(log.activity_date).toLocaleDateString("vi-VN")}</span>
                    </div>
                    <p className="mt-3 font-semibold text-ink-900">{log.title}</p>
                    <p className="mt-1 text-body-sm leading-relaxed text-ink-500">{log.description}</p>
                  </div>
                ))
              ) : (
                <p className="text-body-sm text-ink-500">{tr("Chủ vườn chưa công khai nhật ký chăm sóc.", "The grower has not published a care log yet.")}</p>
              )}
            </div>
            <p className="mt-6 text-caption leading-relaxed text-ink-500">{data.disclaimer}</p>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
