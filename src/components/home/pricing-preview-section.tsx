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

export function PricingPreviewSection() {
  return (
    <SectionShell
      id="goi-dich-vu"
      eyebrow="Gói dịch vụ"
      title="Bắt đầu miễn phí, nâng cấp khi khu vườn cần nhiều hơn"
      description="Mỗi gói đều nêu rõ giới hạn sử dụng. Bạn có thể xem đầy đủ quyền lợi trước khi quyết định."
      className="bg-canvas"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {pricingPlans.map((plan, index) => {
          const PlanIcon = planIcons[plan.id as keyof typeof planIcons] ?? Sprout;
          const highlighted = Boolean(plan.highlight);

          return (
            <Reveal key={plan.id} delay={index * 0.055}>
              <article
                className={cn(
                  "group relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border p-5 transition duration-180 hover:-translate-y-1 hover:shadow-lg",
                  highlighted
                    ? "border-forest bg-forest text-on-forest shadow-lg"
                    : "border-line bg-surface-raised text-ink hover:border-leaf/35",
                )}
              >
                <span className={cn("absolute inset-x-0 top-0 h-1", highlighted ? "bg-sun" : "bg-leaf")} aria-hidden />

                <div className="flex items-start justify-between gap-3">
                  <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", highlighted ? "bg-on-forest/10 text-on-forest" : "bg-surface-soft text-leaf-strong")}>
                    <PlanIcon size={20} aria-hidden />
                  </span>
                  {plan.badge ? (
                    <span className="rounded-full bg-sun px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-forest">
                      {plan.badge}
                    </span>
                  ) : null}
                </div>

                <div className="mt-5">
                  <p className={cn("text-[11px] font-bold uppercase tracking-[0.12em]", highlighted ? "text-on-forest-muted" : "text-leaf-strong")}>{plan.name}</p>
                  <h3 className={cn("mt-2 font-display text-2xl font-extrabold tracking-[-0.03em]", highlighted ? "text-on-forest" : "text-ink")}>{plan.price}</h3>
                  <p className={cn("mt-3 min-h-[72px] text-sm leading-6", highlighted ? "text-on-forest-muted" : "text-ink-soft")}>{plan.description}</p>
                </div>

                <div className={cn("my-5 h-px", highlighted ? "bg-on-forest/15" : "bg-line")} />

                <ul className="flex-1 space-y-3">
                  {plan.features.slice(0, 3).map((feature) => (
                    <li key={feature} className={cn("flex items-start gap-2.5 text-xs font-medium leading-5", highlighted ? "text-on-forest" : "text-ink")}>
                      <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full", highlighted ? "bg-on-forest/10 text-on-forest" : "bg-surface-soft text-leaf-strong")}>
                        <Check size={12} strokeWidth={2.5} aria-hidden />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login?next=/dashboard/pricing"
                  className={cn(
                    "mt-6 inline-flex min-h-11 items-center justify-between gap-3 rounded-md px-4 text-sm font-bold transition duration-180",
                    highlighted
                      ? "bg-on-forest text-forest hover:bg-surface-soft hover:text-ink"
                      : "border border-line bg-surface text-ink hover:border-leaf/35 hover:bg-surface-soft",
                  )}
                >
                  {plan.cta}
                  <ArrowRight size={16} aria-hidden />
                </Link>
              </article>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={0.16} className="mt-8 flex flex-col items-center justify-between gap-4 rounded-xl border border-line bg-surface px-5 py-4 sm:flex-row">
        <div>
          <p className="font-bold text-ink">Chưa chắc gói nào phù hợp?</p>
          <p className="mt-1 text-sm text-ink-soft">Đăng nhập để xem bảng so sánh đầy đủ trước khi nâng cấp.</p>
        </div>
        <Link href="/login?next=/dashboard/pricing" className={buttonVariants({ variant: "secondary" })}>
          So sánh đầy đủ
          <ArrowRight size={16} aria-hidden />
        </Link>
      </Reveal>
    </SectionShell>
  );
}
