import type { CSSProperties } from "react";

import Link from "next/link";
import { ArrowDownRight, ArrowRight, Leaf } from "lucide-react";

import { LeafFieldBackground } from "@/components/home/leaf-field-background";
import { LeafLens } from "@/components/home/leaf-lens";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

export function HeroSection() {
  return (
    <section
      id="top"
      className="living-veins relative isolate flex min-h-[100dvh] items-center overflow-hidden px-4 pb-14 pt-24 sm:px-6 lg:px-8 lg:pb-16 lg:pt-24"
    >
      <LeafFieldBackground />
      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-10 xl:gap-14">
        <div className="min-w-0 max-w-[680px]">
          <div className="fl-rise inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.11em] text-leaf-strong">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-leaf/20 bg-surface-soft">
              <Leaf size={15} aria-hidden />
            </span>
            Trợ lý sức khỏe cây trồng
          </div>

          <h1
            className="fl-rise mt-6 max-w-[680px] font-display text-[42px] font-extrabold leading-[1.06] tracking-[-0.05em] text-ink sm:text-[50px] lg:text-[52px] xl:text-[56px]"
            style={{ "--fl-i": 1 } as CSSProperties}
          >
            Nhìn dấu hiệu trên lá. Hành động trước khi bệnh lan rộng.
          </h1>

          <p
            className="fl-rise mt-6 max-w-[560px] text-base font-medium leading-7 text-ink-soft sm:text-lg sm:leading-8"
            style={{ "--fl-i": 1.5 } as CSSProperties}
          >
            Tải ảnh lá để nhận gợi ý bệnh, đối chiếu triệu chứng và biết việc cần làm tiếp theo.
          </p>

          <div className="fl-rise mt-8 flex flex-col gap-3 sm:flex-row sm:items-center" style={{ "--fl-i": 1.5 } as CSSProperties}>
            <Link
              href="/login?next=/dashboard/diagnosis"
              className={cn(buttonVariants({ variant: "primary", size: "lg" }), "chlorophyll-button min-w-[156px]")}
            >
              Kiểm tra lá
              <ArrowRight size={18} aria-hidden />
            </Link>
            <a href="#quy-trinh" className={buttonVariants({ variant: "secondary", size: "lg" })}>
              Xem quy trình
              <ArrowDownRight size={18} aria-hidden />
            </a>
          </div>
        </div>

        <Reveal
          delay={0.1}
          y={16}
          className="min-w-0"
        >
          <div
            className="min-w-0"
            style={{
              transform: "translate3d(var(--mockup-shift-x, 0px), var(--mockup-shift-y, 0px), 0)",
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
