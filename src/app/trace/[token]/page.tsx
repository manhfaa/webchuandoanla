"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CalendarDays, Leaf, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { fetchPublicTraceability, type PublicTraceability } from "@/lib/farmops-client";

function activityLabel(type: string) {
  const labels: Record<string, string> = {
    watering: "Tưới nước",
    fertilizing: "Bón phân",
    pesticide: "Phun thuốc",
    disease_check: "Kiểm tra sâu bệnh",
    pruning: "Tỉa cành",
    harvest: "Thu hoạch",
    note: "Ghi chú",
  };
  return labels[type] ?? type;
}

export default function PublicTraceabilityPage() {
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
        setError(err instanceof Error ? err.message : "Không tìm thấy trang truy xuất.");
      } finally {
        setLoading(false);
      }
    })();
  }, [params.token]);

  return (
    <main id="main-content" className="min-h-screen bg-[#f6faf6] px-4 py-8 text-ink-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-body-sm font-semibold text-leaf-700 no-underline">
          <Leaf strokeWidth={1.75} className="h-4 w-4" />
          Agromind AI
        </Link>

        <Card variant="light" padding="lg" className="shadow-sm">
          {loading ? (
            <p className="text-body text-ink-500">Đang tải truy xuất nguồn gốc...</p>
          ) : error ? (
            <p className="text-body text-berry-500">{error}</p>
          ) : data ? (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-overline text-leaf-700">QR truy xuất nguồn gốc</p>
                  <h1 className="mt-2 text-h1 text-ink-900">{data.product_name}</h1>
                  <p className="mt-3 text-body text-ink-500">
                    {data.crop_type} · {data.plot_name} · {data.region || "Chưa ghi vùng canh tác"}
                  </p>
                </div>
                <Badge variant="success">
                  <ShieldCheck strokeWidth={1.75} className="h-4 w-4" />
                  Công khai
                </Badge>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-md border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-caption uppercase tracking-[0.14em] text-leaf-700">Ngày xuống giống</p>
                  <p className="mt-2 text-xl font-semibold text-ink-900">
                    {data.planting_start_date ? new Date(data.planting_start_date).toLocaleDateString("vi-VN") : "Chưa ghi"}
                  </p>
                </div>
                <div className="rounded-md border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-caption uppercase tracking-[0.14em] text-leaf-700">Giai đoạn</p>
                  <p className="mt-2 text-xl font-semibold text-ink-900">{data.growth_stage || "Đang theo dõi"}</p>
                </div>
                <div className="rounded-md border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-caption uppercase tracking-[0.14em] text-leaf-700">Ngày công khai</p>
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
              <h2 className="text-h2 text-ink-900">Dòng thời gian chăm sóc</h2>
            </div>
            <div className="mt-5 space-y-3">
              {data.logs.length ? (
                data.logs.map((log) => (
                  <div key={log.id} className="rounded-md border border-border-light bg-white p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="muted">{activityLabel(log.activity_type)}</Badge>
                      <span className="text-caption text-ink-500">{new Date(log.activity_date).toLocaleDateString("vi-VN")}</span>
                    </div>
                    <p className="mt-3 font-semibold text-ink-900">{log.title}</p>
                    <p className="mt-1 text-body-sm leading-relaxed text-ink-500">{log.description}</p>
                  </div>
                ))
              ) : (
                <p className="text-body-sm text-ink-500">Chủ vườn chưa công khai nhật ký chăm sóc.</p>
              )}
            </div>
            <p className="mt-6 text-caption leading-relaxed text-ink-500">{data.disclaimer}</p>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
