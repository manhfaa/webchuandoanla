"use client";

import Link from "next/link";
import { ArrowRight, Sprout } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { useTr } from "@/lib/use-tr";
import type { PricingPlan } from "@/types";

/**
 * The campaign band.
 *
 * Every number it shows is derived from the catalogue by `applyCatalogue`, so
 * setting SEPAY_SUBSCRIPTION_DAYS back to 30 removes `plan.promo`, the server
 * stops passing a plan, and the band disappears with no deploy. Nothing here
 * contains a term, a percentage, an amount or a date.
 *
 * It deliberately does NOT use the `bg-forest` + `living-veins` panel that six
 * other landing sections already use. A promotion that looks identical to every
 * other band cannot do the one job it exists for, and a seventh forest panel
 * would make the accent the default. It borrows CapabilityStrip's idiom instead
 * — a bordered row on `bg-surface` — which reads as a field-log annotation
 * rather than a second hero, and stays about a fifth of the height on a phone.
 *
 * The struck amount is labelled "giá thường". It is `price × the period
 * multiple`, a rate this plan has never actually been sold at, so presenting it
 * bare beside the real price would be a former-price claim about a price that
 * never existed.
 */
export function PromoBand({ plan }: { plan: PricingPlan }) {
  const tr = useTr();
  const promo = plan.promo;
  if (!promo) return null;

  const price = tr(plan.price, plan.priceEn ?? plan.price);
  const strike = tr(promo.strikePrice, promo.strikePriceEn);
  const period = tr(promo.periodLabel, promo.periodLabelEn);

  return (
    <section
      className="section-grid border-y border-line bg-surface px-4 sm:px-6 lg:px-8"
      aria-label={tr("Ưu đãi thời hạn đang áp dụng", "Term promotion currently running")}
    >
      <Reveal className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 lg:py-8">
          <div className="flex min-w-0 gap-4">
            <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-soft text-leaf-strong">
              <Sprout size={20} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-display text-xl font-extrabold tracking-[-0.03em] text-ink">
                {tr(
                  `Trả một kỳ, dùng ${period.replace(/^cho /, "")}`,
                  `Pay for one period, use it ${period.replace(/^for /, "for ")}`,
                )}
              </p>
              <p className="mt-1 max-w-[46ch] text-xs font-medium leading-5 text-ink-soft">
                {tr(
                  `Gói ${plan.name} đang bán theo kỳ dài hơn. Cùng số tiền, cùng quyền lợi — chỉ dài hơn.`,
                  `${plan.name} is on a longer term right now. Same amount, same benefits — just longer.`,
                )}
              </p>
            </div>
          </div>

          {/* One aria-hidden container plus one sr-only sentence, so a screen
              reader hears the offer once as prose rather than as loose numbers. */}
          <div className="flex shrink-0 flex-wrap items-baseline gap-x-3 gap-y-1 sm:justify-end">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1" aria-hidden="true">
              <span className="font-display text-2xl font-extrabold tracking-[-0.03em] text-ink sm:text-[28px]">
                {price}
              </span>
              <span className="text-sm text-ink-soft">
                {tr("giá thường", "standard rate")} <span className="line-through">{strike}</span>
              </span>
              <span className="rounded-full bg-[color-mix(in_srgb,var(--leaf)_15%,transparent)] px-2 py-0.5 text-[11px] font-bold text-leaf-strong">
                {tr(`Tiết kiệm ${promo.savePercent}%`, `Save ${promo.savePercent}%`)}
              </span>
            </div>
            <p className="sr-only">
              {tr(
                `Gói ${plan.name} hiện có giá ${price} ${period}, so với ${strike} theo giá thường, tiết kiệm ${promo.savePercent} phần trăm.`,
                `${plan.name} is currently ${price} ${period}, against ${strike} at the standard rate, a saving of ${promo.savePercent} percent.`,
              )}
            </p>
            <Link
              href="#goi-dich-vu"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-leaf-strong transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-leaf)] focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              {tr("Xem bảng giá", "See the plans")}
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
