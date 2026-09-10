"use client";

import type { CSSProperties } from "react";

import Link from "next/link";
import { ArrowDownRight, ArrowRight } from "lucide-react";

import { CampaignLine } from "@/components/home/campaign-line";
import { LeafFieldBackground } from "@/components/home/leaf-field-background";
import { LeafLens } from "@/components/home/leaf-lens";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { DEVELOPER } from "@/constants/brand";
import { TRIAL_HOST_SHORT, TRIAL_PROVINCE } from "@/constants/field-trial";
import { CLASS_COUNT, VALIDATION_ACCURACY, VALIDATION_ACCURACY_EN } from "@/constants/model-facts";
import { supportedPlants } from "@/data/mock/plants";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";
import type { PricingPlan } from "@/types";

/** `campaign` arrives resolved from the server; absent means nothing to say. */
export function HeroSection({ campaign }: { campaign?: PricingPlan | null }) {
  const tr = useTr();

  // Three facts under the buttons, the way an equipment maker prints a spec
  // line under the product name. Every number is measured, none is a promise.
  const facts = [
    { value: String(supportedPlants.length), label: tr("nhóm cây đang hỗ trợ", "crop groups supported") },
    { value: String(CLASS_COUNT), label: tr("loại bệnh và trạng thái lá", "diseases and leaf conditions") },
    { value: tr(VALIDATION_ACCURACY, VALIDATION_ACCURACY_EN), label: tr("đúng trên tập ảnh kiểm định", "correct on the validation set") },
  ];

  return (
    <section
      id="top"
      className="living-veins relative isolate flex min-h-[100dvh] items-center overflow-hidden px-4 pb-14 pt-24 sm:px-6 lg:px-8 lg:pb-16 lg:pt-28"
    >
      <LeafFieldBackground />
      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-10 xl:gap-14">
        <div className="min-w-0 max-w-[680px]">
          <p className="fl-rise kicker flex-wrap">
            <span>{tr("Trợ lý sức khỏe cây trồng", "Plant health assistant")}</span>
            <span className="hidden h-1 w-1 bg-current opacity-50 sm:block" aria-hidden />
            <span>{tr(`Phát triển bởi ${DEVELOPER}`, `Developed by ${DEVELOPER}`)}</span>
          </p>

          <h1
            className="fl-rise mt-6 max-w-[680px] font-display text-[42px] font-extrabold leading-[1.06] tracking-[-0.05em] text-ink sm:text-[50px] lg:text-[52px] xl:text-[56px]"
            style={{ "--fl-i": 1 } as CSSProperties}
          >
            {tr("Thấy dấu hiệu trên lá. Biết bước tiếp theo.", "See a sign on the leaf. Know what to do next.")}
          </h1>

          <p
            className="fl-rise mt-6 max-w-[560px] text-base font-medium leading-7 text-ink-soft sm:text-lg sm:leading-8"
            style={{ "--fl-i": 1.5 } as CSSProperties}
          >
            {tr(
              "Chụp lá để xem top 5 khả năng, đối chiếu triệu chứng và chọn bước xử lý phù hợp.",
              "Photograph a leaf, review the top five possibilities, compare symptoms and choose the right next step.",
            )}
          </p>

          <div className="fl-rise mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6" style={{ "--fl-i": 1.5 } as CSSProperties}>
            <Link
              href="/login?next=/dashboard/diagnosis"
              className={cn(buttonVariants({ variant: "primary", size: "lg" }), "chlorophyll-button min-w-[172px]")}
            >
              {tr("Kiểm tra lá", "Check a leaf")}
              <ArrowRight size={18} aria-hidden />
            </Link>
            <a
              href="#quy-trinh"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink underline decoration-line-strong decoration-1 underline-offset-[6px] transition hover:decoration-leaf"
            >
              {tr("Xem quy trình", "See how it works")}
              <ArrowDownRight size={16} aria-hidden />
            </a>
          </div>

          {/* Below the CTAs, never above: someone arriving with a sick plant is
              here to upload a photo, and a price offer must not compete with
              that. It is a link, not a button, for the same reason. */}
          {campaign ? <CampaignLine plan={campaign} /> : null}

          <dl className="fl-rise mt-10 grid grid-cols-3 border-t border-line" style={{ "--fl-i": 2 } as CSSProperties}>
            {facts.map((fact, index) => (
              <div key={fact.label} className={cn("flex flex-col-reverse pt-4", index > 0 ? "border-l border-line pl-4" : "pr-4")}>
                <dt className="mt-1 text-[11px] font-medium leading-4 text-ink-soft sm:text-xs sm:leading-5">{fact.label}</dt>
                <dd className="font-display text-2xl font-extrabold tabular-nums tracking-[-0.03em] text-ink sm:text-3xl">{fact.value}</dd>
              </div>
            ))}
          </dl>

          <p className="fl-rise mt-5 text-xs leading-5 text-ink-muted" style={{ "--fl-i": 2.5 } as CSSProperties}>
            {tr(
              `Đã thực nghiệm ngoài đồng tại ${TRIAL_HOST_SHORT}, ${TRIAL_PROVINCE.vi}. Kết quả mang tính tham khảo.`,
              `Field-trialled at ${TRIAL_HOST_SHORT}, ${TRIAL_PROVINCE.en}. Results are advisory.`,
            )}
          </p>
        </div>

        <Reveal delay={0.1} y={16} className="min-w-0">
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
