"use client";

import Image from "next/image";
import { useState } from "react";

import { SectionShell } from "@/components/layout/section-shell";
import { SurfaceCard } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { supportedPlants } from "@/data/mock/plants";
import { cn } from "@/lib/utils";

const priorityPlantIds = new Set(["tomato", "pepper", "grape", "corn", "potato", "squash"]);

export function PlantsSection() {
  const [filter, setFilter] = useState<"priority" | "all">("priority");
  const visiblePlants = filter === "priority" ? supportedPlants.filter((plant) => priorityPlantIds.has(plant.id)) : supportedPlants;

  return (
    <SectionShell
      id="cay-trong"
      eyebrow="Cây trồng hỗ trợ"
      title="Bắt đầu với những nhóm cây quen thuộc trong vườn"
      description="Chọn nhóm ưu tiên để xem nhanh các loại cây gần với nhu cầu canh tác phổ biến, hoặc mở toàn bộ danh sách đang được hỗ trợ."
      className="bg-canvas"
    >
      <div className="mb-7 inline-flex rounded-xl border border-line bg-surface p-1" role="group" aria-label="Lọc cây trồng">
        <button type="button" onClick={() => setFilter("priority")} className={cn("min-h-11 rounded-lg px-4 text-sm font-semibold transition duration-180", filter === "priority" ? "bg-forest text-on-forest shadow-sm" : "text-ink-soft hover:bg-surface-soft hover:text-ink")}>
          Phổ biến tại Việt Nam
        </button>
        <button type="button" onClick={() => setFilter("all")} className={cn("min-h-11 rounded-lg px-4 text-sm font-semibold transition duration-180", filter === "all" ? "bg-forest text-on-forest shadow-sm" : "text-ink-soft hover:bg-surface-soft hover:text-ink")}>
          Tất cả {supportedPlants.length} nhóm
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visiblePlants.map((plant, index) => (
          <Reveal key={plant.id} delay={Math.min(index * 0.035, 0.2)}>
            <SurfaceCard variant="raised" padding="none" className="group h-full overflow-hidden">
              <div className="relative h-48 overflow-hidden bg-surface-soft">
                <Image
                  src={plant.image}
                  alt={plant.imageAlt}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-[1.035]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-forest/65 via-transparent to-transparent" aria-hidden />
                <span className="absolute bottom-3 left-3 rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-semibold text-ink shadow-sm backdrop-blur">Ảnh lá thật</span>
              </div>
              <div className="p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-xl font-bold text-ink">{plant.name}</h3>
                  <p className="text-xs italic text-ink-soft">{plant.latinLabel}</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-ink-soft">{plant.insight}</p>
                <a href={plant.imageSourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-xs font-semibold text-leaf-strong hover:underline">
                  Xem nguồn ảnh
                </a>
              </div>
            </SurfaceCard>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}
