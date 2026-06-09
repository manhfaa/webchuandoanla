import Image from "next/image";

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
            <Card className="group h-full overflow-hidden rounded-[28px] border-white/75 bg-white/90 p-4 transition duration-300 hover:-translate-y-1 hover:shadow-float">
              <div className={`relative overflow-hidden rounded-[24px] bg-gradient-to-br ${plant.accent} p-2`}>
                <div className="relative h-36 overflow-hidden rounded-[20px] bg-brand-950/10">
                  <Image
                    src={plant.image}
                    alt={plant.imageAlt}
                    fill
                    sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-white/10" />
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-800 shadow-sm">
                    Lá thật
                  </span>
                </div>
              </div>
              <div className="mt-5">
                <h3 className="font-display text-2xl font-semibold text-ink">{plant.name}</h3>
                <p className="mt-1 text-sm font-medium text-brand-700">{plant.latinLabel}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">{plant.insight}</p>
                <a
                  href={plant.imageSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex text-xs font-medium text-slate-500 transition hover:text-brand-700"
                >
                  Ảnh: {plant.imageCredit}
                </a>
              </div>
            </Card>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}
