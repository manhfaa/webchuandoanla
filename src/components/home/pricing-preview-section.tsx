"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Crown, ShieldCheck, Sprout, TrendingUp } from "lucide-react";

import { NotebookSection } from "@/components/ui/field-notebook";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { pricingPlans } from "@/data/mock/plans";
import { applyCatalogue, fetchServicePlans, type ServicePlanDto } from "@/lib/payments-client";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";

/* V2 — BẢNG GIÁ
   Trước: Bloom là khối forest 7 cột + 3 gói phụ nhỏ ⇒ so sánh khó, Bloom tách
          rời, giá hai cỡ khác nhau, CTA lệch baseline.
   Sau  : 4 cột ngang bằng nhau, cùng thang giá, CTA cùng baseline.
          Bloom nổi bật bằng nền botanical + border leaf + badge nắng,
          KHÔNG bằng cách biến thành khối tối.
   Giá, tên gói, quyền lợi, CTA: giữ nguyên dữ liệu từ catalogue/mock. */

const planIcons = {
  seed: Sprout,
  grow: TrendingUp,
  bloom: ShieldCheck,
  elite: Crown,
};

/** Giá luôn nowrap: "39.000đ" + "/tháng" trên cùng một dòng ở mọi breakpoint. */
function Price({ value }: { value: string }) {
  const [amount, cadence] = value.split("/");
  return (
    <p className="whitespace-nowrap font-display text-[30px] font-extrabold tracking-[-0.04em] text-ink sm:text-[32px]">
      {amount}
      {cadence ? (
        <span className="ml-1 text-sm font-semibold tracking-normal text-ink-soft">/{cadence}</span>
      ) : null}
    </p>
  );
}

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
    <NotebookSection
      id="goi-dich-vu"
      tab={tr("Bảng giá", "Pricing")}
      title={tr(
        "Bắt đầu vừa đủ. Nâng cấp khi khu vườn cần nhiều hơn",
        "Start with just enough. Upgrade when your garden needs more",
      )}
      description={tr(
        "Giới hạn sử dụng và quyền lợi được trình bày rõ trước khi bạn lựa chọn.",
        "Usage limits and benefits are shown clearly before you choose.",
      )}
      className="bg-surface"
    >
      <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan, index) => {
          const PlanIcon = planIcons[plan.id as keyof typeof planIcons] ?? Sprout;
          const featured = Boolean(plan.highlight);

          return (
            <Reveal key={plan.id} delay={index * 0.05} className="h-full">
              <article
                aria-label={tr(
                  `Gói ${plan.name}, ${plan.price}`,
                  `Plan ${plan.name}, ${plan.priceEn ?? plan.price}`,
                )}
                className={cn(
                  "relative flex h-full flex-col rounded-[var(--r-lg)] border p-6 transition duration-260",
                  featured
                    ? "border-[1.5px] border-leaf bg-surface-soft shadow-md"
                    : "border-line bg-surface-raised shadow-sm hover:-translate-y-[3px] hover:border-line-strong hover:shadow-md",
                )}
              >
                {featured && plan.badge ? (
                  <span className="absolute -top-3 left-6 rounded-[4px] bg-sun px-3 py-1 text-[11.5px] font-bold text-forest shadow-sm">
                    {tr(plan.badge, plan.badgeEn ?? plan.badge)}
                  </span>
                ) : null}

                {/* Icon inline 18px trong dòng tiêu đề — không còn chip 44x44 */}
                <div className="flex items-center gap-2.5">
                  <PlanIcon size={18} strokeWidth={1.8} aria-hidden className="text-leaf-strong" />
                  <h3 className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
                    {plan.name}
                  </h3>
                </div>

                <div className="mt-5">
                  <Price value={tr(plan.price, plan.priceEn ?? plan.price)} />
                </div>

                <p className="mt-4 text-[13.5px] leading-[1.6] text-ink-soft">
                  {tr(plan.description, plan.descriptionEn ?? plan.description)}
                </p>

                <ul className="mt-5 space-y-2.5 border-t border-paper-rule pt-5">
                  {plan.features.slice(0, 6).map((feature, i) => (
                    <li
                      key={feature}
                      className={cn(
                        "flex items-start gap-2.5 text-[13.5px] leading-[1.55] text-ink",
                        featured && "font-medium",
                      )}
                    >
                      <Check
                        size={15}
                        strokeWidth={2.6}
                        aria-hidden
                        className={cn(
                          "mt-[3px] shrink-0",
                          featured ? "text-leaf-strong" : "text-leaf",
                        )}
                      />
                      {tr(feature, plan.featuresEn?.[i] ?? feature)}
                    </li>
                  ))}
                </ul>

                {/* mt-auto => mọi CTA nằm cùng baseline dù danh sách dài khác nhau */}
                <Link
                  href="/login?next=/dashboard/pricing"
                  className={cn(
                    buttonVariants({ variant: featured ? "primary" : "secondary" }),
                    "mt-auto w-full",
                  )}
                  style={{ marginTop: "auto" }}
                >
                  {tr(plan.cta, plan.ctaEn ?? plan.cta)}
                </Link>
              </article>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={0.18}>
        <div className="mt-6 flex flex-col items-center justify-center gap-2 text-center sm:flex-row sm:gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">
              {tr("Muốn xem toàn bộ quyền lợi?", "Want to see all the benefits?")}
            </p>
            <p className="mt-0.5 text-sm leading-6 text-ink-soft">
              {tr("Mở bảng so sánh chi tiết trước khi quyết định nâng cấp.", "Open the detailed comparison table before deciding to upgrade.")}
            </p>
          </div>
          <Link
            href="/login?next=/dashboard/pricing"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-leaf-strong transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            {tr("So sánh các gói", "Compare plans")}
            <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
      </Reveal>
    </NotebookSection>
  );
}
