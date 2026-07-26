"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CloudSun, History, MessageSquareText, ScanSearch, Sprout } from "lucide-react";

import { NotebookSection, SpecimenLabel } from "@/components/ui/field-notebook";
import { Reveal } from "@/components/ui/reveal";
import { useTr } from "@/lib/use-tr";

/* V2 — SECTION TÍNH NĂNG
   Trước: 6 ô bo 22px, mỗi ô mở đầu bằng icon chip 44x44, không có phân tầng —
          nhóm 1 là mảng forest nặng, các nhóm còn lại trắng đều nhau.
   Sau  : 3 tầng có mức nhấn khác nhau và tiêu đề nhóm rõ ràng
          1) Phân tích lá   — module lớn, panel-ink, ảnh lá full-bleed
          2) Theo dõi vườn  — nền botanical, 3 ô có visual chức năng thật
          3) Ra quyết định  — nền surface, 2 ô có preview thật
          Icon chỉ còn 18px inline trong dòng tiêu đề.
   Giữ: toàn bộ tiêu đề, mô tả, route của 6 tính năng. */

const trackFeatures = [
  {
    title: "Thời tiết và cảnh báo",
    titleEn: "Weather and alerts",
    description: "Theo dõi điều kiện thực tế tại vị trí vườn trước khi chăm sóc cây.",
    descriptionEn: "Track real conditions at your garden location before caring for plants.",
    href: "/login?next=/dashboard/weather-alerts",
    icon: CloudSun,
    visual: "contour" as const,
  },
  {
    title: "Lô vườn",
    titleEn: "Garden plots",
    description: "Gắn ảnh kiểm tra và nhật ký chăm sóc với đúng khu vực trồng.",
    descriptionEn: "Link check photos and care logs to the right growing area.",
    href: "/login?next=/dashboard/farms",
    icon: Sprout,
    visual: "plots" as const,
  },
  {
    title: "Lịch sử kiểm tra",
    titleEn: "Check history",
    description: "Xem lại ảnh, kết quả và những lần nên chụp lại để so sánh.",
    descriptionEn: "Review photos, results and the times worth re-shooting to compare.",
    href: "/login?next=/dashboard/history",
    icon: History,
    visual: "thumbs" as const,
  },
];

const decideFeatures = [
  {
    title: "Chat tư vấn",
    titleEn: "Advisory chat",
    description: "Đặt câu hỏi từ kết quả đã lưu hoặc hỏi vấn đề canh tác khác.",
    descriptionEn: "Ask questions from a saved result or about other farming issues.",
    href: "/login?next=/dashboard/chat",
    icon: MessageSquareText,
    visual: "chat" as const,
  },
  {
    title: "Kế hoạch chăm sóc",
    titleEn: "Care plan",
    description: "Sắp xếp việc tưới, bón và theo dõi cây theo từng giai đoạn.",
    descriptionEn: "Organize watering, fertilizing and plant tracking by each stage.",
    href: "/login?next=/dashboard/crop-plans",
    icon: Sprout,
    visual: "checklist" as const,
  },
];

/** Visual chức năng nhỏ — dựng từ chính hệ hình của sản phẩm, không phải icon suông
 *  và không bịa số liệu. */
function FeatureVisual({ kind, tr }: { kind: string; tr: (vi: string, en: string) => string }) {
  if (kind === "contour") {
    return (
      <svg viewBox="0 0 64 28" aria-hidden className="h-7 w-16 text-leaf">
        <path d="M1 22C10 22 14 8 24 8s14 12 22 12 14-12 17-12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
        <path d="M1 27C10 27 14 15 24 15s14 11 22 11 14-9 17-9" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      </svg>
    );
  }
  if (kind === "plots") {
    return (
      <span aria-hidden className="grid grid-cols-2 gap-1">
        <span className="h-3.5 w-3.5 rounded-[3px] bg-leaf" />
        <span className="h-3.5 w-3.5 rounded-[3px] bg-mint" />
        <span className="h-3.5 w-3.5 rounded-[3px] bg-mint" />
        <span className="h-3.5 w-3.5 rounded-[3px] border border-leaf/40" />
      </span>
    );
  }
  if (kind === "thumbs") {
    return (
      <span aria-hidden className="flex">
        {["/plant-leaves/tomato.jpg", "/plant-leaves/grape.jpg", "/plant-leaves/pepper.jpg"].map(
          (src, i) => (
            <span
              key={src}
              className="relative h-7 w-7 overflow-hidden rounded-[4px] border-2 border-surface-raised"
              style={{ marginLeft: i === 0 ? 0 : -8 }}
            >
              <Image src={src} alt="" fill sizes="28px" className="object-cover" />
            </span>
          ),
        )}
      </span>
    );
  }
  if (kind === "chat") {
    return (
      <p className="rounded-[var(--r-md)] border border-line bg-surface-soft px-3 py-2 text-[12.5px] leading-[1.5] text-ink">
        <span className="font-semibold text-leaf-strong">
          {tr("Bạn: ", "You: ")}
        </span>
        {tr("Đốm này có cần cắt bỏ lá không?", "Should I remove the affected leaves?")}
      </p>
    );
  }
  return (
    <span className="flex flex-col gap-2">
      <span className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">
        <span aria-hidden className="flex h-4 w-4 items-center justify-center rounded-full bg-leaf text-[9px] text-on-leaf">
          ✓
        </span>
        {tr("Tưới sáng", "Morning watering")}
      </span>
      <span className="flex items-center gap-2 text-[12.5px] text-ink-soft">
        <span aria-hidden className="h-4 w-4 rounded-full border border-line-strong" />
        {tr("Kiểm tra lại lá", "Re-check the leaf")}
      </span>
    </span>
  );
}

export function FeaturesSection() {
  const tr = useTr();

  return (
    <NotebookSection
      id="tinh-nang"
      tab={tr("Tính năng", "Features")}
      title={tr(
        "Một không gian để quan sát, theo dõi và chăm sóc cây",
        "One space to observe, track and care for your plants",
      )}
      description={tr(
        "Agromind gom ảnh lá, điều kiện vườn và việc cần làm vào cùng một hành trình dễ theo dõi.",
        "Agromind brings leaf photos, garden conditions and to-dos into one easy-to-follow journey.",
      )}
      className="bg-surface"
    >
      <div className="grid gap-5 lg:grid-cols-12">
        {/* ── Nhóm 1 · Phân tích lá ── */}
        <Reveal className="lg:col-span-5 lg:row-span-2">
          <Link
            href="/login?next=/dashboard/diagnosis"
            className="group relative flex h-full min-h-[460px] flex-col overflow-hidden rounded-[var(--r-2xl)] border border-panel-ink-border bg-panel-ink text-on-panel-ink shadow-md transition duration-260 hover:-translate-y-[3px] lg:min-h-[600px]"
          >
            <div className="relative z-10 p-7 sm:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-on-panel-ink-muted">
                {tr("Nhóm 1 · Phân tích lá", "Group 1 · Leaf analysis")}
              </p>
              <h3 className="mt-4 flex items-start gap-2.5 font-display text-[26px] font-extrabold leading-[1.12] tracking-[-0.035em] sm:text-[32px]">
                <ScanSearch size={20} aria-hidden className="mt-1.5 shrink-0" />
                {tr("Kiểm tra ảnh lá", "Check leaf image")}
              </h3>
              <p className="mt-3 max-w-[46ch] text-pretty text-[15px] leading-[1.7] text-on-panel-ink-muted">
                {tr(
                  "Xác nhận ảnh đủ rõ, xem các khả năng cần chú ý và tiếp tục đối chiếu triệu chứng khi cần.",
                  "Confirm the photo is clear enough, review the possibilities to watch and keep cross-checking symptoms when needed.",
                )}
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">
                {tr("Bắt đầu kiểm tra", "Start a check")}
                <ArrowUpRight
                  size={16}
                  aria-hidden
                  className="transition duration-180 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </span>
            </div>

            <div className="relative mt-auto h-[240px] w-full lg:h-[320px]">
              <Image
                src="/plant-leaves/feature-pepper-leaf.png"
                alt={tr(
                  "Lá ớt chuông có vùng vàng và đốm nâu trong nhà kính",
                  "Bell pepper leaf with yellow patches and brown spots in a greenhouse",
                )}
                fill
                sizes="(min-width: 1024px) 42vw, 100vw"
                className="object-cover object-center transition duration-700 group-hover:scale-[1.025] motion-reduce:transition-none"
              />
              <div
                className="absolute inset-0 bg-gradient-to-b from-panel-ink via-panel-ink/25 to-transparent"
                aria-hidden
              />
              <div className="absolute bottom-5 left-6">
                <SpecimenLabel code="TOP 5 · CONFIDENCE" tone="panel" />
              </div>
            </div>
          </Link>
        </Reveal>

        {/* ── Nhóm 2 · Theo dõi vườn ── */}
        <Reveal delay={0.06} className="lg:col-span-7">
          <div className="rounded-[var(--r-2xl)] border border-line bg-surface-soft p-6 sm:p-7">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-leaf-strong">
                {tr("Nhóm 2 · Theo dõi vườn", "Group 2 · Garden tracking")}
              </p>
              <p className="text-[13px] text-ink-soft">
                {tr("Gắn với đúng khu vực trồng của bạn", "Tied to your actual growing area")}
              </p>
            </div>

            <div className="mt-5 grid gap-3.5 sm:grid-cols-3">
              {trackFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Link
                    key={feature.title}
                    href={feature.href}
                    className="group flex min-h-[188px] flex-col justify-between gap-4 rounded-[var(--r-lg)] border border-line bg-surface-raised p-5 transition duration-200 hover:-translate-y-[3px] hover:border-leaf/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Icon size={18} aria-hidden className="shrink-0 text-leaf-strong" />
                      <FeatureVisual kind={feature.visual} tr={tr} />
                    </div>
                    <div>
                      <h4 className="font-display text-[17.5px] font-bold tracking-[-0.02em] text-ink">
                        {tr(feature.title, feature.titleEn)}
                      </h4>
                      <p className="mt-1.5 text-[13px] leading-[1.6] text-ink-soft">
                        {tr(feature.description, feature.descriptionEn)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* ── Nhóm 3 · Ra quyết định ── */}
        {decideFeatures.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Reveal
              key={feature.title}
              delay={0.1 + index * 0.05}
              className={index === 0 ? "lg:col-span-4" : "lg:col-span-3"}
            >
              <Link
                href={feature.href}
                className="group flex h-full min-h-[212px] flex-col justify-between gap-5 rounded-[var(--r-2xl)] border border-line bg-surface-raised p-6 shadow-sm transition duration-260 hover:-translate-y-[3px] hover:border-leaf/40 hover:shadow-md"
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-leaf-strong">
                    {tr("Nhóm 3 · Ra quyết định", "Group 3 · Decision making")}
                  </p>
                  <h4 className="mt-3 flex items-start gap-2 font-display text-[21px] font-bold tracking-[-0.02em] text-ink">
                    <Icon size={18} aria-hidden className="mt-1 shrink-0 text-leaf-strong" />
                    {tr(feature.title, feature.titleEn)}
                  </h4>
                  <p className="mt-2 text-[14px] leading-[1.65] text-ink-soft">
                    {tr(feature.description, feature.descriptionEn)}
                  </p>
                </div>
                <FeatureVisual kind={feature.visual} tr={tr} />
              </Link>
            </Reveal>
          );
        })}
      </div>
    </NotebookSection>
  );
}
