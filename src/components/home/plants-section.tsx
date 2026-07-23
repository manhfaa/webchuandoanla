"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

import { Reveal } from "@/components/ui/reveal";
import { supportedPlants } from "@/data/mock/plants";
import { cn } from "@/lib/utils";

const priorityPlantIds = ["tomato", "pepper", "grape", "corn", "potato", "squash"];

export function PlantsSection() {
  const [filter, setFilter] = useState<"priority" | "all">("priority");
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const visiblePlants = filter === "priority"
    ? priorityPlantIds.flatMap((plantId) => supportedPlants.filter((plant) => plant.id === plantId))
    : supportedPlants;

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;

    if (!section || !viewport || !track || reduceMotion) return;

    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();

    media.add("(min-width: 1024px)", () => {
      const getDistance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);

      gsap.set(track, { x: 0 });
      const horizontalTween = gsap.to(track, {
        x: () => -getDistance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${getDistance()}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      return () => {
        horizontalTween.scrollTrigger?.kill();
        horizontalTween.kill();
        gsap.set(track, { clearProps: "transform" });
      };
    });

    const refreshFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      window.cancelAnimationFrame(refreshFrame);
      media.revert();
    };
  }, [filter, reduceMotion]);

  return (
    <section
      ref={sectionRef}
      id="cay-trong"
      aria-label="Cây trồng Agromind đang hỗ trợ"
      className="living-veins relative scroll-mt-20 bg-canvas lg:min-h-[100dvh] lg:overflow-hidden"
    >
      <div className="flex min-h-[100dvh] flex-col justify-center py-20 sm:py-24 lg:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <h2 className="max-w-3xl font-display text-3xl font-bold tracking-[-0.035em] text-ink sm:text-4xl lg:text-[40px] lg:leading-[1.15]">
              Nhận biết dấu hiệu trên những cây quen thuộc
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-ink-soft sm:text-lg sm:leading-8">
              Bắt đầu từ các nhóm cây gần với nhu cầu canh tác tại Việt Nam, sau đó mở rộng khi cần.
            </p>
          </Reveal>

          <Reveal className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex w-fit rounded-[var(--r-md)] border border-line-strong bg-surface/90 p-1 shadow-sm backdrop-blur" role="group" aria-label="Lọc cây trồng">
              <button
                type="button"
                onClick={() => setFilter("priority")}
                aria-pressed={filter === "priority"}
                className={cn(
                  "min-h-11 rounded-[var(--r-sm)] px-4 text-sm font-semibold transition duration-180",
                  filter === "priority"
                    ? "bg-forest text-on-forest shadow-sm"
                    : "text-ink-soft hover:bg-surface-soft hover:text-ink",
                )}
              >
                Cây phổ biến
              </button>
              <button
                type="button"
                onClick={() => setFilter("all")}
                aria-pressed={filter === "all"}
                className={cn(
                  "min-h-11 rounded-[var(--r-sm)] px-4 text-sm font-semibold transition duration-180",
                  filter === "all"
                    ? "bg-forest text-on-forest shadow-sm"
                    : "text-ink-soft hover:bg-surface-soft hover:text-ink",
                )}
              >
                Tất cả {supportedPlants.length} nhóm
              </button>
            </div>
            <p className="text-sm leading-6 text-ink-soft">Mỗi ảnh đều dẫn tới nguồn tham khảo gốc.</p>
          </Reveal>
        </div>

        <div
          ref={viewportRef}
          className={cn(
            "mt-9 overflow-x-auto overscroll-x-contain pb-4 [scrollbar-color:var(--line-strong)_transparent] [scrollbar-width:thin] lg:overflow-hidden lg:overscroll-auto lg:pb-0",
            reduceMotion && "lg:overflow-x-auto lg:overscroll-x-contain lg:pb-4",
          )}
        >
          <div
            ref={trackRef}
            className="flex w-max snap-x snap-mandatory gap-5 px-4 sm:px-6 lg:snap-none lg:px-[max(2rem,calc((100vw-80rem)/2))]"
          >
            {visiblePlants.map((plant, index) => {
              const isWide = filter === "priority" && (index === 0 || index === visiblePlants.length - 1);

              return (
                <article
                  key={plant.id}
                  data-horizontal-card
                  className={cn(
                    "group flex h-[470px] w-[84vw] flex-none snap-start flex-col overflow-hidden rounded-[var(--r-xl)] border border-line bg-surface-raised shadow-sm transition duration-260 hover:-translate-y-1 hover:border-line-strong hover:shadow-lg sm:w-[520px] lg:h-[500px] lg:will-change-transform lg:[scroll-snap-align:none]",
                    isWide ? "lg:w-[min(58vw,720px)]" : "lg:w-[min(40vw,520px)]",
                  )}
                >
                  <div className={cn(
                    "relative h-[220px] shrink-0 overflow-hidden bg-surface-soft sm:h-[250px] lg:h-[260px]",
                    isWide && "lg:h-[280px]",
                  )}>
                    <Image
                      src={plant.image}
                      alt={plant.imageAlt}
                      fill
                      sizes={isWide
                        ? "(min-width: 1024px) 58vw, (min-width: 640px) 520px, 84vw"
                        : "(min-width: 1024px) 40vw, (min-width: 640px) 520px, 84vw"}
                      className="object-cover transition duration-700 group-hover:scale-[1.035] motion-reduce:transition-none"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-forest/25 to-transparent" aria-hidden />
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col p-5 sm:p-6">
                    <p className="text-xs font-semibold italic text-leaf-strong">{plant.latinLabel}</p>
                    <h3 className="mt-1 font-display text-2xl font-extrabold tracking-[-0.03em] text-ink">{plant.name}</h3>
                    <p className="mt-3 text-sm leading-6 text-ink-soft">{plant.insight}</p>
                    <a
                      href={plant.imageSourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-auto inline-flex min-h-11 items-center gap-2 self-start pt-3 text-xs font-semibold text-leaf-strong transition hover:text-ink"
                    >
                      Mở ảnh tham khảo
                      <ArrowUpRight size={14} aria-hidden />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <span className="sr-only" aria-live="polite">
          Đang hiển thị {visiblePlants.length} nhóm cây.
        </span>
      </div>
    </section>
  );
}
