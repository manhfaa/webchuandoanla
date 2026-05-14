import { Leaf } from "lucide-react";

import { SectionShell } from "@/components/layout/section-shell";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { supportedPlants } from "@/data/mock/plants";

export function PlantsSection() {
  return (
    <SectionShell
      id="cay-trong"
      eyebrow="Cây trồng hỗ trợ"
      title="Hỗ trợ 14 nhóm cây trồng với card hiển thị sạch, rõ và nhất quán."
      description="Từ cây ăn trái đến cây công nghiệp, mỗi card mang một mảng màu riêng để tạo cảm giác hệ sinh thái nông nghiệp hiện đại và dễ quét thông tin."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {supportedPlants.map((plant, index) => (
          <Reveal key={plant.id} delay={index * 0.03}>
            <Card className="group h-full rounded-[28px] border-white/75 bg-white/90 p-5 transition duration-300 hover:-translate-y-1 hover:shadow-float">
              <div className={`rounded-[24px] bg-gradient-to-br ${plant.accent} p-4`}>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 text-brand-800 shadow-sm">
                  <Leaf size={20} />
                </div>
              </div>
              <div className="mt-5">
                <h3 className="font-display text-2xl font-semibold text-ink">{plant.name}</h3>
                <p className="mt-1 text-sm font-medium text-brand-700">{plant.latinLabel}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">{plant.insight}</p>
              </div>
            </Card>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}
