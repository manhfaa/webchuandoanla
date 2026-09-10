"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";

import { SectionShell } from "@/components/layout/section-shell";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { pricingPlans } from "@/data/mock/plans";
import { applyCatalogue, fetchServicePlans, type ServicePlanDto } from "@/lib/payments-client";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";

function Price({ value, featured = false }: { value: string; featured?: boolean }) {
  const [amount, cadence] = value.split("/");

  return (
    <p className={cn("font-display font-extrabold tabular-nums tracking-[-0.045em]", featured ? "text-on-forest" : "text-ink")}>
      <span className={featured ? "text-4xl sm:text-[40px]" : "text-3xl"}>{amount}</span>
      {cadence ? (
        <span className={cn("ml-1 text-sm font-semibold tracking-[-0.01em]", featured ? "text-on-forest-muted" : "text-ink-soft")}>
          /{cadence}
        </span>
      ) : null}
    </p>
  );
}

/**
 * Four plans as one ruled table, in catalogue order, the featured column set
 * in forest. A rate card is how a company prints prices; a hero card with
 * concentric decorative circles beside three smaller cards is how a template
 * does it.
 */
export function PricingPreviewSection() {
  const tr = useTr();
  const [catalogue, setCatalogue] = useState<ServicePlanDto[] | null>(null);

  // The catalogue is public, so the landing page can advertise the real prices
  // and the real quotas instead of a checked-in copy of them.
  useEffect(() => {
    let cancelled = false;
    void fetchServicePlans()
      .then((live) => {
        if (!cancelled) setCatalogue(live);
      })
      .catch(() => {
        // Offline: the checked-in copy below still describes the plans.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const plans = useMemo(() => applyCatalogue(pricingPlans, catalogue), [catalogue]);

  return (
    <SectionShell
      id="goi-dich-vu"
      number="07"
      eyebrow={tr("Bảng giá", "Pricing")}
      title={tr("Bắt đầu vừa đủ. Nâng cấp khi khu vườn cần nhiều hơn", "Start with just enough. Upgrade when your garden needs more")}
      description={tr("Giới hạn sử dụng và quyền lợi được trình bày rõ trước khi bạn lựa chọn.", "Usage limits and benefits are shown clearly before you choose.")}
      className="bg-canvas"
    >
      <Reveal>
        <div className="grid border border-line bg-surface-raised md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan, index) => {
            const featured = Boolean(plan.highlight);
            const rule = featured ? "border-[color-mix(in_srgb,var(--on-forest)_18%,transparent)]" : "border-line";

            return (
              <article
                key={plan.id}
                aria-label={tr(
                  `Gói ${plan.name}, ${plan.price}${plan.promo ? ` ${plan.promo.periodLabel}` : ""}`,
                  `Plan ${plan.name}, ${plan.priceEn ?? plan.price}${plan.promo ? ` ${plan.promo.periodLabelEn}` : ""}`,
                )}
                className={cn(
                  "flex min-h-[440px] flex-col border-line p-6 sm:p-7",
                  index > 0 && "border-t md:border-t-0",
                  index % 2 === 1 && "md:border-l",
                  index >= 2 && "md:border-t lg:border-t-0",
                  index > 0 && "lg:border-l",
                  featured && "bg-forest text-on-forest dark:bg-[color-mix(in_srgb,var(--leaf)_14%,var(--surface-raised))]",
                )}
              >
                <header className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-2xl font-extrabold tracking-[-0.03em]">{plan.name}</h3>
                  {featured ? (
                    <span className="border border-[color-mix(in_srgb,var(--on-forest)_30%,transparent)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-on-forest">
                      {tr("Chọn nhiều", "Popular")}
                    </span>
                  ) : plan.badge ? (
                    <span className="border border-line px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-soft">
                      {tr(plan.badge, plan.badgeEn ?? plan.badge)}
                    </span>
                  ) : null}
                </header>

                <div className={cn("mt-6 border-b pb-6", rule)}>
                  <Price value={tr(plan.price, plan.priceEn ?? plan.price)} featured={featured} />
                  {/* Under a promotion `applyCatalogue` drops the "/tháng" suffix and
                      moves the term into `promo`, so `Price` alone would render a bare
                      amount with no period at all — a 9.000đ that looks permanent. */}
                  {plan.promo ? (
                    <p className={cn("mt-2 text-xs leading-5", featured ? "text-on-forest-muted" : "text-ink-soft")}>
                      {tr("giá thường", "standard rate")}{" "}
                      <span className="line-through">{tr(plan.promo.strikePrice, plan.promo.strikePriceEn)}</span>
                      {" · "}
                      <span className={cn("font-semibold", featured ? "text-on-forest" : "text-ink")}>
                        {tr(plan.promo.periodLabel, plan.promo.periodLabelEn)}
                      </span>
                    </p>
                  ) : null}
                  <p className={cn("mt-3 text-sm leading-6", featured ? "text-on-forest-muted" : "text-ink-soft")}>
                    {tr(plan.description, plan.descriptionEn ?? plan.description)}
                  </p>
                </div>

                <ul className="mt-6 space-y-2.5 text-sm font-medium leading-6">
                  {plan.features.slice(0, 5).map((feature, i) => (
                    <li key={feature} className="flex items-start gap-3">
                      <span className={cn("mt-[9px] h-1.5 w-1.5 shrink-0", featured ? "bg-leaf" : "bg-leaf-strong")} aria-hidden />
                      {tr(feature, plan.featuresEn?.[i] ?? feature)}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-8">
                  <Link
                    href="/login?next=/dashboard/pricing"
                    className={cn(buttonVariants({ variant: featured ? "primary" : "secondary" }), "w-full")}
                  >
                    {tr(plan.cta, plan.ctaEn ?? plan.cta)}
                    <ArrowRight size={16} aria-hidden />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </Reveal>

      <Reveal delay={0.1} className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-ink-soft">
          {tr("Toàn bộ giới hạn và quyền lợi nằm trong bảng so sánh chi tiết.", "Every limit and benefit is in the detailed comparison table.")}
        </p>
        <Link
          href="/login?next=/dashboard/pricing"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink underline decoration-line-strong decoration-1 underline-offset-[6px] transition hover:decoration-leaf"
        >
          {tr("So sánh các gói", "Compare plans")}
          <ArrowRight size={16} aria-hidden />
        </Link>
      </Reveal>
    </SectionShell>
  );
}
