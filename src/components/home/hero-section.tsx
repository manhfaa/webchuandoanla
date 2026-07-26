"use client";

import type { CSSProperties } from "react";

import Link from "next/link";
import { ArrowDownRight, ArrowRight } from "lucide-react";

import { LeafFieldBackground } from "@/components/home/leaf-field-background";
import { LeafLens } from "@/components/home/leaf-lens";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";

/* V2 — HERO
   Sửa: min-h 100dvh -> 88vh (cắt 1 màn cuộn), container 1440, tỉ lệ 5/7,
        headline lên cấp Display (đây là khoảnh khắc typographic duy nhất của
        trang), overline bỏ icon chip 32x32 -> gạch ngang mảnh.
   Giữ: toàn bộ copy, LeafFieldBackground, LeafLens, parallax --mockup-shift. */

export function HeroSection() {
  const tr = useTr();

  return (
    <section
      id="top"
      className="living-veins relative isolate flex min-h-[88vh] items-center overflow-hidden px-5 pb-16 pt-28 sm:px-6 lg:px-8 lg:pb-20 lg:pt-32"
    >
      <LeafFieldBackground />

      <div className="mx-auto grid w-full max-w-[1440px] items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12 xl:gap-16">
        <div className="min-w-0">
          <p className="fl-rise flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.12em] text-leaf-strong">
            <span aria-hidden className="inline-block h-px w-7 bg-leaf" />
            {tr("Trợ lý sức khỏe cây trồng", "Plant health assistant")}
          </p>

          <h1
            className="fl-rise mt-6 max-w-[19ch] text-balance font-display text-[36px] font-extrabold leading-[1.1] tracking-[-0.045em] text-ink sm:text-[46px] sm:leading-[1.06] lg:text-[62px] lg:leading-[1.02] xl:text-[72px]"
            style={{ "--fl-i": 1 } as CSSProperties}
          >
            {tr(
              "Nhìn dấu hiệu trên lá. Hành động trước khi bệnh lan rộng.",
              "Read the signs on the leaf. Act before disease spreads.",
            )}
          </h1>

          <p
            className="fl-rise mt-6 max-w-[42ch] text-pretty text-[15.5px] font-medium leading-[1.7] text-ink-soft sm:text-[17px]"
            style={{ "--fl-i": 1.5 } as CSSProperties}
          >
            {tr(
              "Tải ảnh lá để nhận gợi ý bệnh, đối chiếu triệu chứng và biết việc cần làm tiếp theo.",
              "Upload a leaf photo to get disease suggestions, cross-check symptoms and know what to do next.",
            )}
          </p>

          <div
            className="fl-rise mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            style={{ "--fl-i": 2 } as CSSProperties}
          >
            <Link
              href="/login?next=/dashboard/diagnosis"
              className={cn(
                buttonVariants({ variant: "primary", size: "lg" }),
                "chlorophyll-button min-w-[160px]",
              )}
            >
              {tr("Kiểm tra lá", "Check a leaf")}
              <ArrowRight size={18} aria-hidden />
            </Link>
            <a href="#quy-trinh" className={buttonVariants({ variant: "secondary", size: "lg" })}>
              {tr("Xem quy trình", "See how it works")}
              <ArrowDownRight size={18} aria-hidden />
            </a>
          </div>
        </div>

        <Reveal delay={0.1} y={16} className="min-w-0">
          <div
            className="min-w-0"
            style={{
              transform:
                "translate3d(var(--mockup-shift-x, 0px), var(--mockup-shift-y, 0px), 0)",
              transition: "transform 320ms var(--ease-out)",
            }}
          >
            <LeafLens />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
