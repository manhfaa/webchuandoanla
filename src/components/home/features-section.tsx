"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { SectionShell } from "@/components/layout/section-shell";
import { Reveal } from "@/components/ui/reveal";
import { useTr } from "@/lib/use-tr";

/**
 * Six modules as a numbered index next to one photograph. The old bento of
 * five differently coloured cards with icon chips is the layout every generated
 * SaaS page ships with; an index with hairlines reads as a product catalogue.
 * The first module is the product, so it gets the photo.
 */
const modules = [
  {
    title: "Kiểm tra ảnh lá",
    titleEn: "Leaf image check",
    description: "Xác nhận ảnh đủ rõ, xem các khả năng cần chú ý và tiếp tục đối chiếu triệu chứng khi cần.",
    descriptionEn: "Confirm the photo is clear enough, review the possibilities to watch and keep cross-checking symptoms when needed.",
    href: "/login?next=/dashboard/diagnosis",
  },
  {
    title: "Thời tiết và cảnh báo",
    titleEn: "Weather and alerts",
    description: "Theo dõi điều kiện thực tế tại vị trí vườn trước khi chăm sóc cây.",
    descriptionEn: "Track real conditions at your garden location before caring for plants.",
    href: "/login?next=/dashboard/weather-alerts",
  },
  {
    title: "Lịch sử kiểm tra",
    titleEn: "Check history",
    description: "Xem lại ảnh, kết quả và những lần nên chụp lại để so sánh.",
    descriptionEn: "Review photos, results and the times worth re-shooting to compare.",
    href: "/login?next=/dashboard/history",
  },
  {
    title: "Chat tư vấn",
    titleEn: "Advisory chat",
    description: "Đặt câu hỏi từ kết quả đã lưu hoặc hỏi vấn đề canh tác khác.",
    descriptionEn: "Ask questions from a saved result or about other farming issues.",
    href: "/login?next=/dashboard/chat",
  },
  {
    title: "Lô vườn",
    titleEn: "Garden plots",
    description: "Gắn ảnh kiểm tra và nhật ký chăm sóc với đúng khu vực trồng.",
    descriptionEn: "Link check photos and care logs to the right growing area.",
    href: "/login?next=/dashboard/farms",
  },
  {
    title: "Kế hoạch chăm sóc",
    titleEn: "Care plan",
    description: "Sắp xếp việc tưới, bón và theo dõi cây theo từng giai đoạn.",
    descriptionEn: "Organize watering, fertilizing and plant tracking by each stage.",
    href: "/login?next=/dashboard/crop-plans",
  },
];

export function FeaturesSection() {
  const tr = useTr();
  const [primary, ...rest] = modules;

  return (
    <SectionShell
      id="tinh-nang"
      number="03"
      eyebrow={tr("Tính năng", "Features")}
      title={tr("Một không gian để quan sát, theo dõi và chăm sóc cây", "One space to observe, track and care for your plants")}
      description={tr("Agromind gom ảnh lá, điều kiện vườn và việc cần làm vào cùng một hành trình dễ theo dõi.", "Agromind brings leaf photos, garden conditions and to-dos into one easy-to-follow journey.")}
      className="bg-surface"
    >
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
        <Reveal className="lg:col-span-5">
          <Link href={primary.href} className="group corner-marks flex h-full flex-col border border-line bg-surface-raised">
            <span className="relative block aspect-[4/3] overflow-hidden sm:aspect-[16/9] lg:aspect-[4/3] lg:flex-1">
              <Image
                src="/plant-leaves/feature-pepper-leaf.png"
                alt={tr("Lá ớt chuông có vùng vàng và đốm nâu trong nhà kính", "Bell pepper leaf with yellow patches and brown spots in a greenhouse")}
                fill
                sizes="(min-width: 1024px) 42vw, 100vw"
                className="object-cover object-center transition duration-700 group-hover:scale-[1.02] motion-reduce:transition-none"
              />
              <span className="absolute left-3 top-3 border border-line bg-surface px-2 py-1 font-display text-[11px] font-bold tabular-nums tracking-[0.12em] text-ink">
                01
              </span>
            </span>
            <span className="block border-t border-line p-5 sm:p-6">
              <span className="flex items-start justify-between gap-4">
                <span className="font-display text-2xl font-extrabold tracking-[-0.03em] text-ink">{tr(primary.title, primary.titleEn)}</span>
                <ArrowUpRight size={20} className="mt-1 shrink-0 text-ink-muted transition duration-180 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-leaf-strong" aria-hidden />
              </span>
              <span className="mt-2 block text-sm leading-6 text-ink-soft">{tr(primary.description, primary.descriptionEn)}</span>
            </span>
          </Link>
        </Reveal>

        <div className="lg:col-span-7">
          <ol className="border-t border-line">
            {rest.map((module, index) => (
              <li key={module.href} className="border-b border-line">
                <Reveal delay={index * 0.04}>
                  <Link
                    href={module.href}
                    className="group -mx-3 grid grid-cols-[44px_minmax(0,1fr)_auto] items-start gap-4 px-3 py-6 transition duration-180 hover:bg-surface-soft sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:py-7"
                  >
                    <span className="pt-1 font-display text-sm font-bold tabular-nums tracking-[0.1em] text-leaf-strong">
                      {String(index + 2).padStart(2, "0")}
                    </span>
                    <span>
                      <span className="block font-display text-xl font-bold tracking-[-0.02em] text-ink sm:text-2xl">{tr(module.title, module.titleEn)}</span>
                      <span className="mt-1.5 block max-w-[54ch] text-sm leading-6 text-ink-soft">{tr(module.description, module.descriptionEn)}</span>
                    </span>
                    <ArrowUpRight size={18} className="mt-1.5 text-ink-muted transition duration-180 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-leaf-strong" aria-hidden />
                  </Link>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </SectionShell>
  );
}
