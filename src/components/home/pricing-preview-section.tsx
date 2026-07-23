import Link from "next/link";
import { ArrowRight, Check, Crown, ShieldCheck, Sprout, TrendingUp } from "lucide-react";

import { SectionShell } from "@/components/layout/section-shell";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { pricingPlans } from "@/data/mock/plans";
import { cn } from "@/lib/utils";

const planIcons = {
  seed: Sprout,
  grow: TrendingUp,
  bloom: ShieldCheck,
  elite: Crown,
};

function Price({ value, featured = false }: { value: string; featured?: boolean }) {
  const [amount, cadence] = value.split("/");

  return (
    <p className={cn("font-display font-extrabold tracking-[-0.045em]", featured ? "text-on-forest" : "text-ink")}>
      <span className={featured ? "text-5xl sm:text-6xl" : "text-2xl sm:text-[28px]"}>{amount}</span>
      {cadence ? (
        <span className={cn("ml-1 tracking-[-0.02em]", featured ? "text-base text-on-forest-muted sm:text-lg" : "text-sm text-ink-soft")}>
          /{cadence}
        </span>
      ) : null}
    </p>
  );
}

export function PricingPreviewSection() {
  const featured = pricingPlans.find((plan) => plan.highlight) ?? pricingPlans[0];
  const alternatives = pricingPlans.filter((plan) => plan.id !== featured.id);
  const FeaturedIcon = planIcons[featured.id as keyof typeof planIcons] ?? ShieldCheck;

  return (
    <SectionShell
      id="goi-dich-vu"
      title="Bắt đầu vừa đủ. Nâng cấp khi khu vườn cần nhiều hơn"
      description="Giới hạn sử dụng và quyền lợi được trình bày rõ trước khi bạn lựa chọn."
      className="bg-surface"
    >
      <div className="grid gap-4 lg:grid-cols-12 lg:items-stretch">
        <Reveal className="lg:col-span-7">
          <article
            aria-label={`Gói ${featured.name}, ${featured.price}`}
            className="living-veins relative flex h-full min-h-[560px] flex-col overflow-hidden rounded-[var(--r-2xl)] border border-line-strong bg-forest p-6 text-on-forest shadow-lg sm:p-8 lg:p-9"
          >
            <div className="pointer-events-none absolute -right-28 -top-32 h-80 w-80 rounded-full border border-on-forest/10" aria-hidden />
            <div className="pointer-events-none absolute -right-14 -top-20 h-56 w-56 rounded-full border border-on-forest/10" aria-hidden />

            <header className="relative flex items-start justify-between gap-5">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-[var(--r-md)] border border-on-forest/20 bg-on-forest/10 text-on-forest">
                  <FeaturedIcon size={22} strokeWidth={1.8} aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-semibold text-on-forest-muted">Gói được lựa chọn nhiều</p>
                  <h3 className="mt-0.5 font-display text-2xl font-extrabold tracking-[-0.03em]">{featured.name}</h3>
                </div>
              </div>
              {featured.badge ? (
                <span className="rounded-[var(--r-pill)] border border-on-forest/20 bg-on-forest/10 px-3 py-1.5 text-xs font-semibold text-on-forest">
                  {featured.badge}
                </span>
              ) : null}
            </header>

            <div className="relative mt-10 border-b border-on-forest/15 pb-8">
              <Price value={featured.price} featured />
              <p className="mt-4 max-w-[52ch] text-sm font-medium leading-7 text-on-forest-muted sm:text-base">
                {featured.description}
              </p>
            </div>

            <ul className="relative mt-7 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {featured.features.slice(0, 6).map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm font-semibold leading-6">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-leaf text-on-leaf">
                    <Check size={12} strokeWidth={3} aria-hidden />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="relative mt-auto pt-9">
              <Link
                href="/login?next=/dashboard/pricing"
                className={`${buttonVariants({ variant: "primary", size: "lg" })} w-full sm:w-fit`}
              >
                {featured.cta}
                <ArrowRight size={17} aria-hidden />
              </Link>
            </div>
          </article>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-5">
          {alternatives.map((plan, index) => {
            const PlanIcon = planIcons[plan.id as keyof typeof planIcons] ?? Sprout;
            const isElite = plan.id === "elite";
            const isGrow = plan.id === "grow";

            return (
              <Reveal key={plan.id} delay={0.05 + index * 0.045} className={isElite ? "sm:col-span-2" : undefined}>
                <article
                  aria-label={`Gói ${plan.name}, ${plan.price}`}
                  className={cn(
                    "group flex h-full min-h-[260px] flex-col rounded-[var(--r-2xl)] border p-5 shadow-sm transition duration-260 hover:-translate-y-1 hover:border-line-strong hover:shadow-md sm:p-6",
                    isGrow ? "border-line-strong bg-surface-soft" : "border-line bg-surface-raised",
                    isElite && "sm:min-h-[276px] sm:grid sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start sm:gap-x-5",
                  )}
                >
                  <span className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-surface-soft text-leaf-strong",
                    isGrow && "bg-surface-raised",
                  )}>
                    <PlanIcon size={20} strokeWidth={1.8} aria-hidden />
                  </span>

                  <div className={cn("mt-6", isElite && "sm:mt-0")}>
                    <h3 className="font-display text-xl font-extrabold tracking-[-0.025em] text-ink">{plan.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink-soft">{plan.description}</p>
                  </div>

                  <div className={cn("mt-5", isElite && "sm:mt-0 sm:text-right")}>
                    <Price value={plan.price} />
                  </div>

                  <Link
                    href="/login?next=/dashboard/pricing"
                    className={cn(
                      "mt-auto inline-flex min-h-11 items-center gap-2 pt-4 text-sm font-semibold text-leaf-strong transition hover:text-ink",
                      isElite && "sm:col-start-2 sm:mt-6 sm:pt-0",
                    )}
                  >
                    {plan.cta}
                    <ArrowRight size={16} className="transition duration-180 group-hover:translate-x-1" aria-hidden />
                  </Link>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>

      <Reveal delay={0.15} className="mt-4 flex flex-col items-start justify-between gap-4 rounded-[var(--r-xl)] bg-surface-soft px-5 py-5 sm:flex-row sm:items-center sm:px-6">
        <div>
          <p className="font-semibold text-ink">Muốn xem toàn bộ quyền lợi?</p>
          <p className="mt-1 text-sm leading-6 text-ink-soft">Mở bảng so sánh chi tiết trước khi quyết định nâng cấp.</p>
        </div>
        <Link href="/login?next=/dashboard/pricing" className={buttonVariants({ variant: "secondary" })}>
          So sánh các gói
          <ArrowRight size={16} aria-hidden />
        </Link>
      </Reveal>
    </SectionShell>
  );
}
