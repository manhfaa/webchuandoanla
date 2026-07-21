"use client";

import Link from "next/link";
import { ArrowRight, CalendarCheck2, CloudSun, History, Leaf, ScanSearch } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDiagnosisStore } from "@/store/diagnosis-store";

export function GardenStatusPanel() {
  const { records } = useDiagnosisStore();
  const total = records.length;
  const needsReview = records.filter((item) => {
    const confidence = item.cnnConfidence ?? item.leafConfidence ?? item.confidence ?? 0;
    return !item.yoloVerified || !item.classificationReady || confidence < 0.7;
  }).length;
  const recent = records.filter((item) => {
    const created = new Date(item.createdAt).getTime();
    return Number.isFinite(created) && Date.now() - created <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  const actions = total
    ? [
        needsReview
          ? {
              title: `Xem lại ${needsReview} kết quả cần theo dõi`,
              description: "Ưu tiên ảnh chưa đạt yêu cầu hoặc có độ tin cậy dưới 70%.",
              href: "/dashboard/history",
              icon: History,
              tone: "watch" as const,
            }
          : {
              title: "Tiếp tục theo dõi các lá đã kiểm tra",
              description: "Chụp lại cùng vị trí sau vài ngày để so sánh thay đổi.",
              href: "/dashboard/history",
              icon: History,
              tone: "healthy" as const,
            },
        {
          title: "Xem thời tiết và cảnh báo",
          description: "Kiểm tra điều kiện có thể ảnh hưởng đến cây trong khu vực của bạn.",
          href: "/dashboard/weather-alerts",
          icon: CloudSun,
          tone: "neutral" as const,
        },
        {
          title: "Mở kế hoạch chăm sóc",
          description: "Theo dõi các việc cần thực hiện cho cây trồng đã lưu.",
          href: "/dashboard/crop-plans",
          icon: CalendarCheck2,
          tone: "neutral" as const,
        },
      ]
    : [
        {
          title: "Tải ảnh lá đầu tiên",
          description: "Chụp rõ một chiếc lá để nhận gợi ý và bắt đầu lưu lịch sử.",
          href: "/dashboard/diagnosis",
          icon: ScanSearch,
          tone: "healthy" as const,
        },
        {
          title: "Thêm vị trí vườn",
          description: "Lưu khu vực trồng để sử dụng thông tin thời tiết phù hợp.",
          href: "/dashboard/farms",
          icon: Leaf,
          tone: "neutral" as const,
        },
      ];

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
      <Card variant="dark" padding="lg" className="field-contours relative min-h-[292px] overflow-hidden rounded-xl">
        <div className="relative z-10 flex h-full max-w-2xl flex-col items-start">
          <StatusBadge
            status={needsReview ? "watch" : "healthy"}
            label={needsReview ? "Có kết quả cần chú ý" : "Đang theo dõi ổn định"}
            className="bg-on-forest/10 text-on-forest"
          />
          <p className="mt-7 text-overline text-on-forest-muted">Tình trạng vườn hôm nay</p>
          <h2 className="mt-2 max-w-xl font-display text-[28px] font-bold leading-[1.18] tracking-[-0.035em] text-on-forest sm:text-[34px]">
            {total
              ? `Bạn có ${total} lượt kiểm tra. ${needsReview} kết quả cần theo dõi.`
              : "Bắt đầu bằng một ảnh lá rõ, đủ sáng và không bị che khuất."}
          </h2>
          <p className="mt-4 max-w-xl text-sm font-medium leading-7 text-on-forest-muted">
            {total
              ? `${recent} lượt được thực hiện trong 7 ngày gần đây. Kết quả là gợi ý để bạn tiếp tục quan sát và chăm sóc cây phù hợp.`
              : "Agromind AI sẽ kiểm tra ảnh đầu vào, gợi ý khả năng và chỉ ra việc bạn nên làm tiếp theo."}
          </p>
          <Link href="/dashboard/diagnosis" className={buttonVariants({ variant: "primary", size: "lg", className: "mt-7" })}>
            <ScanSearch size={18} aria-hidden /> Kiểm tra ảnh mới
          </Link>
        </div>
      </Card>

      <Card variant={needsReview ? "warning" : "default"} padding="lg" className="rounded-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-overline text-leaf-strong">Ưu tiên hôm nay</p>
            <h2 className="mt-2 text-h2 font-bold text-ink">Việc nên làm</h2>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-surface text-leaf-strong shadow-sm">
            <CalendarCheck2 size={19} aria-hidden />
          </span>
        </div>

        <div className="mt-5 space-y-2.5">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} href={action.href} className="group flex min-h-[72px] items-center gap-3 rounded-lg border border-line bg-surface p-3 transition duration-180 hover:-translate-y-px hover:border-leaf/35 hover:shadow-sm">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${action.tone === "watch" ? "bg-sun/20 text-soil" : action.tone === "healthy" ? "bg-surface-soft text-leaf-strong" : "bg-canvas text-ink-soft"}`}>
                  <Icon size={17} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{action.title}</span>
                  <span className="mt-0.5 line-clamp-1 block text-xs text-ink-soft">{action.description}</span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-ink-soft transition group-hover:translate-x-1 group-hover:text-leaf-strong" aria-hidden />
              </Link>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
