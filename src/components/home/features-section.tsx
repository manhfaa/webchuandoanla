"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CloudSun, History, MessageSquareText, ScanSearch, Sprout } from "lucide-react";

import { SectionShell } from "@/components/layout/section-shell";
import { Reveal } from "@/components/ui/reveal";
import { useTr } from "@/lib/use-tr";

const compactFeatures = [
  {
    title: "Thời tiết và cảnh báo",
    titleEn: "Weather and alerts",
    description: "Theo dõi điều kiện thực tế tại vị trí vườn trước khi chăm sóc cây.",
    descriptionEn: "Track real conditions at your garden location before caring for plants.",
    href: "/login?next=/dashboard/weather-alerts",
    icon: CloudSun,
    className: "lg:col-span-5 bg-forest text-on-forest living-veins",
    micro: "sun" as const,
  },
  {
    title: "Lịch sử kiểm tra",
    titleEn: "Check history",
    description: "Xem lại ảnh, kết quả và những lần nên chụp lại để so sánh.",
    descriptionEn: "Review photos, results and the times worth re-shooting to compare.",
    href: "/login?next=/dashboard/history",
    icon: History,
    className: "lg:col-span-5 bg-surface-raised text-ink",
    micro: "stack" as const,
  },
  {
    title: "Chat tư vấn",
    titleEn: "Advisory chat",
    description: "Đặt câu hỏi từ kết quả đã lưu hoặc hỏi vấn đề canh tác khác.",
    descriptionEn: "Ask questions from a saved result or about other farming issues.",
    href: "/login?next=/dashboard/chat",
    icon: MessageSquareText,
    className: "lg:col-span-4 bg-surface-soft text-ink",
    micro: "bubble" as const,
  },
  {
    title: "Lô vườn",
    titleEn: "Garden plots",
    description: "Gắn ảnh kiểm tra và nhật ký chăm sóc với đúng khu vực trồng.",
    descriptionEn: "Link check photos and care logs to the right growing area.",
    href: "/login?next=/dashboard/farms",
    icon: Sprout,
    className: "lg:col-span-4 bg-surface-raised text-ink",
    micro: "contour" as const,
  },
  {
    title: "Kế hoạch chăm sóc",
    titleEn: "Care plan",
    description: "Sắp xếp việc tưới, bón và theo dõi cây theo từng giai đoạn.",
    descriptionEn: "Organize watering, fertilizing and plant tracking by each stage.",
    href: "/login?next=/dashboard/crop-plans",
    icon: Sprout,
    className: "lg:col-span-4 bg-leaf text-on-leaf",
    micro: "sprout" as const,
  },
];

export function FeaturesSection() {
  const tr = useTr();
  return (
    <SectionShell
      id="tinh-nang"
      title={tr("Một không gian để quan sát, theo dõi và chăm sóc cây", "One space to observe, track and care for your plants")}
      description={tr("Agromind gom ảnh lá, điều kiện vườn và việc cần làm vào cùng một hành trình dễ theo dõi.", "Agromind brings leaf photos, garden conditions and to-dos into one easy-to-follow journey.")}
      className="section-grid bg-surface"
    >
      <div className="grid gap-4 lg:grid-cols-12">
        <Reveal className="lg:col-span-7 lg:row-span-2">
          <Link
            href="/login?next=/dashboard/diagnosis"
            className="group relative flex min-h-[430px] h-full overflow-hidden rounded-[22px] border border-line-strong bg-forest text-on-forest shadow-lg"
          >
            <Image
              src="/plant-leaves/feature-pepper-leaf.png"
              alt={tr("Lá ớt chuông có vùng vàng và đốm nâu trong nhà kính", "Bell pepper leaf with yellow patches and brown spots in a greenhouse")}
              fill
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover object-center transition duration-700 group-hover:scale-[1.025] motion-reduce:transition-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/30 to-transparent" aria-hidden />
            <div className="relative mt-auto w-full p-6 sm:p-8">
              <span className="fl-feat-focus flex h-12 w-12 items-center justify-center rounded-xl border border-on-forest/20 bg-forest/65 backdrop-blur-sm">
                <ScanSearch size={22} aria-hidden />
              </span>
              <div className="mt-5 flex items-end justify-between gap-5">
                <div>
                  <h3 className="font-display text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">{tr("Kiểm tra ảnh lá", "Check leaf image")}</h3>
                  <p className="mt-3 max-w-lg text-sm font-medium leading-7 text-on-forest-muted sm:text-base">
                    {tr("Xác nhận ảnh đủ rõ, xem các khả năng cần chú ý và tiếp tục đối chiếu triệu chứng khi cần.", "Confirm the photo is clear enough, review the possibilities to watch and keep cross-checking symptoms when needed.")}
                  </p>
                </div>
                <ArrowUpRight size={24} className="mb-1 shrink-0 transition duration-180 group-hover:-translate-y-1 group-hover:translate-x-1" aria-hidden />
              </div>
            </div>
          </Link>
        </Reveal>

        {compactFeatures.slice(0, 2).map((feature, index) => {
          const Icon = feature.icon;
          const onForest = index === 0;
          return (
            <Reveal key={feature.title} delay={0.05 + index * 0.05} className={feature.className.split(" ")[0]}>
              <Link
                href={feature.href}
                className={`group relative flex min-h-[207px] h-full flex-col justify-between overflow-hidden rounded-[22px] border p-6 transition duration-180 hover:-translate-y-0.5 hover:shadow-md ${feature.className} ${onForest ? "border-transparent" : "border-line"}`}
              >
                {feature.micro === "sun" ? <span className="fl-feat-sun-layer" aria-hidden /> : null}
                <div className="relative flex items-start justify-between gap-4">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${onForest ? "bg-on-forest/10 text-on-forest" : "bg-surface-soft text-leaf-strong"} ${feature.micro === "stack" ? "fl-feat-stack" : ""}`}
                  >
                    <Icon size={20} aria-hidden />
                  </span>
                  <ArrowUpRight size={18} className="transition duration-180 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                </div>
                <div className="relative">
                  <h3 className="font-display text-2xl font-bold tracking-[-0.03em]">{tr(feature.title, feature.titleEn)}</h3>
                  <p className={`mt-2 text-sm leading-6 ${onForest ? "text-on-forest-muted" : "text-ink-soft"}`}>{tr(feature.description, feature.descriptionEn)}</p>
                </div>
              </Link>
            </Reveal>
          );
        })}

        {compactFeatures.slice(2).map((feature, index) => {
          const Icon = feature.icon;
          const onLeaf = index === 2;
          return (
            <Reveal key={feature.title} delay={0.08 + index * 0.045} className={feature.className.split(" ")[0]}>
              <Link
                href={feature.href}
                className={`group relative flex min-h-[236px] h-full flex-col justify-between overflow-hidden rounded-[22px] border p-6 transition duration-180 hover:-translate-y-0.5 hover:shadow-md ${feature.className} ${onLeaf ? "border-transparent" : "border-line"}`}
              >
                {feature.micro === "contour" ? <span className="fl-feat-contour field-contours" aria-hidden /> : null}
                <div className="relative flex items-start justify-between gap-4">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${onLeaf ? "bg-on-leaf/10 text-on-leaf" : "bg-surface text-leaf-strong"} ${feature.micro === "bubble" ? "fl-feat-bubble" : ""} ${feature.micro === "sprout" ? "fl-feat-sprout" : ""}`}
                  >
                    <Icon size={20} aria-hidden />
                  </span>
                  <ArrowUpRight size={18} className="transition duration-180 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                </div>
                <div className="relative">
                  <h3 className="font-display text-xl font-bold tracking-[-0.025em]">{tr(feature.title, feature.titleEn)}</h3>
                  <p className={`mt-2 text-sm leading-6 ${onLeaf ? "text-on-leaf/80" : "text-ink-soft"}`}>{tr(feature.description, feature.descriptionEn)}</p>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </SectionShell>
  );
}
