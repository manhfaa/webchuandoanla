"use client";

import type { CSSProperties } from "react";

import { ArrowRight, Sprout } from "lucide-react";

import { useTr } from "@/lib/use-tr";
import type { PricingPlan } from "@/types";

/**
 * The campaign line, above the fold in the hero's left column.
 *
 * It deliberately carries the TERM and the SAVING but NOT the struck price.
 * `promo.strikePrice` is `price × the period multiple` — a rate no plan has
 * ever actually been sold at — so it needs the "giá thường" qualifier to stay
 * an honest comparison rather than a former-price claim. That qualifier has
 * room on the pricing card and in the band; it does not have room in one line
 * at 390px. Rather than drop the qualifier to fit, the claim stays downstream
 * where it can be made properly.
 *
 * Everything shown is derived from the catalogue. Nothing here contains a term,
 * a percentage, an amount or a date.
 *
 * No `position: fixed` descendant may live in here. The hero's children carry
 * `.fl-rise`, whose `animation-fill-mode: both` leaves a permanent
 * `translateY(0)` — a transform list, not `none` — which makes this element the
 * containing block for fixed positioning. The reduced-motion block in
 * globals.css only zeroes the duration, so the fill still applies and the trap
 * is identical there (see modal.tsx:81-86).
 */
export function CampaignLine({ plan }: { plan: PricingPlan }) {
  const tr = useTr();
  const promo = plan.promo;
  if (!promo) return null;

  const period = tr(promo.periodLabel, promo.periodLabelEn);

  return (
    <a
      href="#goi-dich-vu"
      // --fl-i 2 continues the hero's existing sequence (eyebrow 0, h1 1,
      // sub-copy 1.5, CTA 1.5). The hero sets these per element rather than
      // through the .fl-stagger nth-child chain, so nothing renumbers.
      style={{ "--fl-i": 2 } as CSSProperties}
      // Hover lightens the forest by mixing, not by opacity: `bg-forest/92`
      // would compile to nothing, because every colour in tailwind.config.ts is
      // a bare var(--token) with no <alpha-value> slot for Tailwind to fill.
      className="fl-rise mt-6 inline-flex max-w-full items-center gap-3 rounded-[var(--r-pill)] bg-forest py-2 pl-2 pr-4 text-on-forest transition duration-180 hover:bg-[color-mix(in_srgb,var(--forest)_88%,var(--on-forest))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-leaf)] focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--on-forest)_14%,transparent)]">
        <Sprout size={16} aria-hidden />
      </span>
      <span className="min-w-0 text-sm font-semibold leading-5">
        {tr(
          `Trả một kỳ, dùng ${period.replace(/^cho /, "")}`,
          `Pay one period, use it ${period.replace(/^for /, "for ")}`,
        )}
        <span className="ml-2 rounded-full bg-[color-mix(in_srgb,var(--on-forest)_14%,transparent)] px-2 py-0.5 text-[11px] font-bold">
          {tr(`Tiết kiệm ${promo.savePercent}%`, `Save ${promo.savePercent}%`)}
        </span>
      </span>
      <ArrowRight size={16} className="shrink-0" aria-hidden />
    </a>
  );
}
