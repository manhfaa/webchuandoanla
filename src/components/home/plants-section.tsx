"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { NotebookSection } from "@/components/ui/field-notebook";
import { supportedPlants } from "@/data/mock/plants";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";

/* V2 — SECTION CÂY TRỒNG
   Trước: GSAP ScrollTrigger pin + `lg:min-h-[100dvh] lg:overflow-hidden` ⇒ khóa
          cuộn dọc gần 1 màn; card rộng không đều (58vw vs 40vw) và `lg:snap-none`
          ⇒ trông như lỗi crop; card 470px cao trên mobile ⇒ 1 card/màn.
   Sau  : carousel native, KHÔNG pin, mọi card cùng chiều rộng, snap ở mọi
          breakpoint, có nút trước/sau, điều khiển bàn phím và progress bar.
          Bỏ luôn gsap khỏi section này.
   Giữ: dữ liệu cây, bộ lọc, link nguồn ảnh, thông báo aria-live. */

const priorityPlantIds = ["tomato", "pepper", "grape", "corn", "potato", "squash"];
const CARD_STEP = 336; // 320px card + 16px gap

export function PlantsSection() {
  const tr = useTr();
  const [filter, setFilter] = useState<"priority" | "all">("priority");
  const [progress, setProgress] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);

  const visiblePlants =
    filter === "priority"
      ? priorityPlantIds.flatMap((plantId) =>
          supportedPlants.filter((plant) => plant.id === plantId),
        )
      : supportedPlants;

  const syncProgress = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const max = viewport.scrollWidth - viewport.clientWidth;
    setProgress(max > 0 ? viewport.scrollLeft / max : 0);
  }, []);

  useEffect(() => {
    viewportRef.current?.scrollTo({ left: 0 });
    setProgress(0);
  }, [filter]);

  const scrollByCards = useCallback((direction: -1 | 1) => {
    viewportRef.current?.scrollBy({ left: direction * CARD_STEP, behavior: "smooth" });
  }, []);

  return (
    <NotebookSection
      id="cay-trong"
      tab={tr("Cây trồng", "Crops")}
      title={tr(
        "Nhận biết dấu hiệu trên những cây quen thuộc",
        "Spot the signs on familiar crops",
      )}
      description={tr(
        "Bắt đầu từ các nhóm cây gần với nhu cầu canh tác tại Việt Nam, sau đó mở rộng khi cần.",
        "Starting with crop groups close to farming needs in Vietnam, then expanding as needed.",
      )}
      className="living-veins bg-canvas"
      aside={
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="inline-flex w-fit rounded-[var(--r-md)] border border-line-strong bg-surface/90 p-1 shadow-sm backdrop-blur"
            role="group"
            aria-label={tr("Lọc cây trồng", "Filter crops")}
          >
            <button
              type="button"
              onClick={() => setFilter("priority")}
              aria-pressed={filter === "priority"}
              className={cn(
                "min-h-11 rounded-[var(--r-sm)] px-4 text-sm font-semibold transition duration-180",
                filter === "priority"
                  ? "bg-panel-ink text-on-panel-ink shadow-sm"
                  : "text-ink-soft hover:bg-surface-soft hover:text-ink",
              )}
            >
              {tr("Cây phổ biến", "Popular crops")}
            </button>
            <button
              type="button"
              onClick={() => setFilter("all")}
              aria-pressed={filter === "all"}
              className={cn(
                "min-h-11 rounded-[var(--r-sm)] px-4 text-sm font-semibold transition duration-180",
                filter === "all"
                  ? "bg-panel-ink text-on-panel-ink shadow-sm"
                  : "text-ink-soft hover:bg-surface-soft hover:text-ink",
              )}
            >
              {tr(`Tất cả ${supportedPlants.length} nhóm`, `All ${supportedPlants.length} groups`)}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollByCards(-1)}
              aria-label={tr("Xem cây trước", "Previous crops")}
              className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--r-md)] border border-line bg-surface text-ink transition hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40"
            >
              <ArrowLeft size={18} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => scrollByCards(1)}
              aria-label={tr("Xem cây tiếp theo", "Next crops")}
              className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--r-md)] border border-line bg-surface text-ink transition hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40"
            >
              <ArrowRight size={18} aria-hidden />
            </button>
          </div>
        </div>
      }
    >
      {/* Carousel tràn mép phải để lộ card kế tiếp — vẫn cuộn dọc bình thường */}
      <div className="-mr-5 sm:-mr-6 lg:-mr-8">
        <div
          ref={viewportRef}
          onScroll={syncProgress}
          tabIndex={0}
          role="region"
          aria-label={tr("Danh sách cây trồng, cuộn ngang", "Crop list, scrolls horizontally")}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              scrollByCards(1);
            } else if (event.key === "ArrowLeft") {
              event.preventDefault();
              scrollByCards(-1);
            }
          }}
          className="overflow-x-auto overscroll-x-contain pb-3 [scrollbar-color:var(--line-strong)_transparent] [scrollbar-width:thin] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40 focus-visible:ring-offset-4 focus-visible:ring-offset-canvas"
        >
          <div className="flex w-max snap-x snap-mandatory gap-4 pr-5 sm:pr-6 lg:pr-8">
            {visiblePlants.map((plant) => (
              <article
                key={plant.id}
                className="group flex h-[400px] w-[min(78vw,300px)] flex-none snap-start flex-col overflow-hidden rounded-[var(--r-lg)] border border-line bg-surface-raised shadow-sm transition duration-260 hover:-translate-y-[3px] hover:border-line-strong hover:shadow-md sm:w-[300px] lg:w-[320px]"
              >
                <div className="relative h-[190px] shrink-0 overflow-hidden bg-surface-soft">
                  <Image
                    src={plant.image}
                    alt={tr(plant.imageAlt, plant.imageAltEn ?? plant.imageAlt)}
                    fill
                    sizes="(min-width: 1024px) 320px, (min-width: 640px) 300px, 78vw"
                    className="object-cover transition duration-700 group-hover:scale-[1.04] motion-reduce:transition-none"
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-forest/30 to-transparent transition-[background] duration-260 group-hover:from-forest/45"
                    aria-hidden
                  />
                </div>

                <div className="flex min-h-0 flex-1 flex-col p-5">
                  <p className="font-mono text-[11.5px] font-semibold tracking-[0.02em] text-leaf-strong">
                    {plant.latinLabel}
                  </p>
                  <h3 className="mt-1 font-display text-[21px] font-extrabold tracking-[-0.025em] text-ink">
                    {tr(plant.name, plant.nameEn ?? plant.name)}
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-[1.6] text-ink-soft">
                    {tr(plant.insight, plant.insightEn ?? plant.insight)}
                  </p>
                  <a
                    href={plant.imageSourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-auto inline-flex min-h-11 items-center gap-2 self-start pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-leaf-strong transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40"
                  >
                    {tr("Mở ảnh tham khảo", "Open reference image")}
                    <ArrowUpRight size={13} aria-hidden />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {/* Progress + chú thích */}
      <div className="mt-5 flex items-center gap-4">
        <div className="h-[2px] flex-1 overflow-hidden rounded-full bg-leaf/16">
          <div
            className="h-full rounded-full bg-leaf transition-[width] duration-150 ease-linear"
            style={{ width: `${Math.max(8, progress * 100)}%` }}
          />
        </div>
        <p className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft">
          {tr(
            `${visiblePlants.length} nhóm · kéo để xem thêm`,
            `${visiblePlants.length} groups · drag to see more`,
          )}
        </p>
      </div>

      <p className="mt-3 text-sm leading-6 text-ink-soft">
        {tr(
          "Mỗi ảnh đều dẫn tới nguồn tham khảo gốc.",
          "Every image links back to its original reference.",
        )}
      </p>

      <span className="sr-only" aria-live="polite">
        {tr(
          `Đang hiển thị ${visiblePlants.length} nhóm cây.`,
          `Showing ${visiblePlants.length} crop groups.`,
        )}
      </span>
    </NotebookSection>
  );
}
