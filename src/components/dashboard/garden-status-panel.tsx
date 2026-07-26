"use client";

import Link from "next/link";
import { ArrowRight, CalendarCheck2, CloudSun, History, Leaf, ScanSearch } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTr } from "@/lib/use-tr";
import { useDiagnosisStore } from "@/store/diagnosis-store";

/* V2 — PANEL TÌNH TRẠNG VƯỜN
   Sửa: `Card variant="dark"` (bg-forest) -> panel dùng token `--panel-ink`,
        nên ở dark mode panel không còn tan vào nền canvas;
        các icon chip 36x36 trong danh sách việc -> hàng hairline có
        thanh trạng thái mảnh bên trái, giữ đúng nghĩa màu (watch/healthy).
   Giữ: toàn bộ logic đếm total/needsReview/recent và mọi chuỗi copy. */

export function GardenStatusPanel() {
  const tr = useTr();
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
              title: tr(
                `Xem lại ${needsReview} kết quả cần theo dõi`,
                `Review ${needsReview} results that need attention`,
              ),
              description: tr(
                "Ưu tiên ảnh chưa đạt yêu cầu hoặc có độ tin cậy dưới 70%.",
                "Prioritize images that fell short or have confidence below 70%.",
              ),
              href: "/dashboard/history",
              icon: History,
              tone: "watch" as const,
            }
          : {
              title: tr(
                "Tiếp tục theo dõi các lá đã kiểm tra",
                "Keep monitoring the leaves you have checked",
              ),
              description: tr(
                "Chụp lại cùng vị trí sau vài ngày để so sánh thay đổi.",
                "Retake the same spot after a few days to compare changes.",
              ),
              href: "/dashboard/history",
              icon: History,
              tone: "healthy" as const,
            },
        {
          title: tr("Xem thời tiết và cảnh báo", "View weather and alerts"),
          description: tr(
            "Kiểm tra điều kiện có thể ảnh hưởng đến cây trong khu vực của bạn.",
            "Check conditions that may affect plants in your area.",
          ),
          href: "/dashboard/weather-alerts",
          icon: CloudSun,
          tone: "neutral" as const,
        },
        {
          title: tr("Mở kế hoạch chăm sóc", "Open care plan"),
          description: tr(
            "Theo dõi các việc cần thực hiện cho cây trồng đã lưu.",
            "Track the tasks to do for your saved crops.",
          ),
          href: "/dashboard/crop-plans",
          icon: CalendarCheck2,
          tone: "neutral" as const,
        },
      ]
    : [
        {
          title: tr("Tải ảnh lá đầu tiên", "Upload your first leaf image"),
          description: tr(
            "Chụp rõ một chiếc lá để nhận gợi ý và bắt đầu lưu lịch sử.",
            "Take a clear photo of a leaf to get suggestions and start saving history.",
          ),
          href: "/dashboard/diagnosis",
          icon: ScanSearch,
          tone: "healthy" as const,
        },
        {
          title: tr("Thêm vị trí vườn", "Add garden location"),
          description: tr(
            "Lưu khu vực trồng để sử dụng thông tin thời tiết phù hợp.",
            "Save your growing area to get relevant weather information.",
          ),
          href: "/dashboard/farms",
          icon: Leaf,
          tone: "neutral" as const,
        },
      ];

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
      <div className="field-contours relative min-h-[292px] overflow-hidden rounded-[var(--r-2xl)] border border-panel-ink-border bg-panel-ink p-6 text-on-panel-ink shadow-md sm:p-8">
        <div className="relative z-10 flex h-full max-w-2xl flex-col items-start">
          <StatusBadge
            status={needsReview ? "watch" : "healthy"}
            label={
              needsReview
                ? tr("Có kết quả cần chú ý", "Some results need attention")
                : tr("Đang theo dõi ổn định", "Monitoring is stable")
            }
          />
          <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.12em] text-on-panel-ink-muted">
            {tr("Tình trạng vườn hôm nay", "Garden status today")}
          </p>
          <h2 className="mt-2 max-w-xl text-balance font-display text-[26px] font-extrabold leading-[1.15] tracking-[-0.035em] sm:text-[32px]">
            {total
              ? tr(
                  `Bạn có ${total} lượt kiểm tra. ${needsReview} kết quả cần theo dõi.`,
                  `You have ${total} checks. ${needsReview} results to monitor.`,
                )
              : tr(
                  "Bắt đầu bằng một ảnh lá rõ, đủ sáng và không bị che khuất.",
                  "Start with a clear leaf image, well lit and unobstructed.",
                )}
          </h2>
          <p className="mt-4 max-w-xl text-[14px] font-medium leading-[1.7] text-on-panel-ink-muted">
            {total
              ? tr(
                  `${recent} lượt được thực hiện trong 7 ngày gần đây. Kết quả là gợi ý để bạn tiếp tục quan sát và chăm sóc cây phù hợp.`,
                  `${recent} checks were done in the last 7 days. The results are suggestions to help you keep observing and caring for your plants.`,
                )
              : tr(
                  "Agromind AI sẽ kiểm tra ảnh đầu vào, gợi ý khả năng và chỉ ra việc bạn nên làm tiếp theo.",
                  "Agromind AI will check the input image, suggest possibilities, and point out what you should do next.",
                )}
          </p>
          <Link
            href="/dashboard/diagnosis"
            className={buttonVariants({ variant: "primary", size: "lg", className: "mt-7" })}
          >
            <ScanSearch size={18} aria-hidden /> {tr("Kiểm tra ảnh mới", "Check a new image")}
          </Link>
        </div>
      </div>

      <Card variant={needsReview ? "warning" : "default"} padding="lg" className="rounded-[var(--r-2xl)]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-leaf-strong">
            {tr("Ưu tiên hôm nay", "Today's priority")}
          </p>
          <h2 className="mt-2 font-display text-[20px] font-bold tracking-[-0.02em] text-ink">
            {tr("Việc nên làm", "What to do")}
          </h2>
        </div>

        <div className="mt-4">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                className="group grid min-h-[72px] grid-cols-[3px_minmax(0,1fr)_auto] items-center gap-4 border-t border-paper-rule py-4 transition duration-180 first:border-t-0 hover:border-leaf/40"
              >
                {/* Thanh trạng thái mảnh thay cho icon chip 36x36 */}
                <span
                  aria-hidden
                  className={`h-9 rounded-full ${
                    action.tone === "watch"
                      ? "bg-sun"
                      : action.tone === "healthy"
                        ? "bg-leaf"
                        : "bg-line-strong"
                  }`}
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <Icon size={15} aria-hidden className="shrink-0 text-ink-soft" />
                    <span className="truncate text-[13.5px] font-semibold text-ink">
                      {action.title}
                    </span>
                  </span>
                  <span className="mt-1 line-clamp-1 block text-[12px] text-ink-soft">
                    {action.description}
                  </span>
                </span>
                <ArrowRight
                  size={16}
                  aria-hidden
                  className="shrink-0 text-ink-soft transition group-hover:translate-x-1 group-hover:text-leaf-strong"
                />
              </Link>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
