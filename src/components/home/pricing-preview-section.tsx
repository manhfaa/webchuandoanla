import Link from "next/link";

import { SectionShell } from "@/components/layout/section-shell";
import { Reveal } from "@/components/ui/reveal";
import { pricingPlans } from "@/data/mock/plans";
import { buttonVariants } from "@/components/ui/button";
import { PricingCard } from "@/components/pricing/pricing-card";

export function PricingPreviewSection() {
  return (
    <SectionShell
      id="goi-dich-vu"
      eyebrow="Gói dịch vụ"
      title="Chọn gói phù hợp với nhu cầu sử dụng của bạn."
      description="Bạn có thể bắt đầu miễn phí, sau đó nâng cấp khi cần lưu nhiều hơn hoặc dùng thêm phần chat hỗ trợ."
      className="bg-canvas"
    >
      <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
        {pricingPlans.map((plan, index) => (
          <Reveal key={plan.id} delay={index * 0.06}>
            <PricingCard plan={plan} />
          </Reveal>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Link href="/login" className={buttonVariants({ variant: "primary", size: "lg" })}>
          Dùng thử Agromind AI
        </Link>
      </div>
    </SectionShell>
  );
}
