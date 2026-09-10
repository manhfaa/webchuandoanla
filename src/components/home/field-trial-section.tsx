"use client";

import Image from "next/image";
import { MapPin } from "lucide-react";

import { SectionShell } from "@/components/layout/section-shell";
import { Reveal } from "@/components/ui/reveal";
import { TEAM_NAME, TRIAL_DATE, TRIAL_HOST, TRIAL_PROVINCE } from "@/constants/field-trial";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";

type Shot = {
  src: string;
  alt: string;
  altEn: string;
  caption: string;
  captionEn: string;
  /** Row 1 is the evidence pair; row 2 is context. */
  span: string;
  height: string;
  sizes: string;
};

const shots: Shot[] = [
  {
    src: "/field-trial/app-result.webp",
    alt: "Bàn tay cầm điện thoại hiển thị màn hình Agromind AI với năm khả năng bệnh kèm phần trăm, phía sau là khay cây giống cà chua",
    altEn:
      "A hand holding a phone showing the Agromind AI screen with five disease possibilities and their confidence, tomato seedling trays behind",
    caption: "Năm khả năng kèm mức tin cậy, hiện thẳng trên điện thoại.",
    captionEn: "Five possibilities with confidence, shown right on the phone.",
    // Full width from tablet up: this is the shot carrying the argument, so it
    // must not share a row with the decorative leaf and come out smaller.
    span: "sm:col-span-2 lg:col-span-8",
    // Taller than natural on phones on purpose: a short box scales the handset
    // down until the five-result list is unreadable. object-cover crops the
    // margins instead.
    height: "h-[400px] sm:h-[460px] lg:h-[520px]",
    sizes: "(min-width: 1280px) 780px, (min-width: 1024px) 62vw, (min-width: 640px) 92vw, 100vw",
  },
  {
    src: "/field-trial/leaf-damage.webp",
    alt: "Cận cảnh lá mướp bị sâu ăn thủng nhiều lỗ, nắng xuyên qua phiến lá, quả mướp treo bên cạnh",
    altEn: "Close-up of a luffa leaf eaten through with holes, sunlight through the blade, a luffa fruit hanging beside it",
    caption: "Lá mướp bị sâu ăn — đúng thứ người trồng cần biết tên.",
    captionEn: "A pest-eaten luffa leaf — exactly what a grower needs named.",
    span: "lg:col-span-4",
    height: "h-[360px] sm:h-[420px] lg:h-[520px]",
    sizes: "(min-width: 1280px) 390px, (min-width: 1024px) 31vw, (min-width: 640px) 45vw, 100vw",
  },
  {
    src: "/field-trial/trellis-check.webp",
    alt: "Dưới giàn mướp, bốn sinh viên và một nông dân đội nón lá cùng xem điện thoại giữa luống cây",
    altEn: "Under a luffa trellis, four students and a farmer in a conical hat look at a phone among the beds",
    caption: "Dưới giàn mướp, chụp tại chỗ.",
    captionEn: "Under the luffa trellis, photographed on the spot.",
    span: "lg:col-span-4",
    height: "h-[200px] sm:h-[220px] lg:h-[250px]",
    sizes: "(min-width: 1280px) 390px, (min-width: 1024px) 31vw, (min-width: 640px) 45vw, 100vw",
  },
  {
    src: "/field-trial/nursery-advice.webp",
    alt: "Trong nhà lưới, một sinh viên đưa điện thoại cho người trồng xem bên luống cây giống",
    altEn: "Inside a net house, a student hands the phone to a grower beside a bed of seedlings",
    caption: "Đưa máy cho chủ vườn tự xem kết quả.",
    captionEn: "Handing the phone over so the grower reads it themselves.",
    span: "lg:col-span-4",
    height: "h-[200px] sm:h-[220px] lg:h-[250px]",
    sizes: "(min-width: 1280px) 390px, (min-width: 1024px) 31vw, (min-width: 640px) 45vw, 100vw",
  },
  {
    src: "/field-trial/nursery-wide.webp",
    alt: "Toàn cảnh nhà lưới, các thành viên trong đội cúi soi từng khay cây giống",
    altEn: "Wide view of the net house, team members leaning in to inspect each seedling tray",
    caption: "Soi từng khay cây giống trong nhà lưới.",
    captionEn: "Inspecting the seedling trays tray by tray.",
    span: "lg:col-span-4",
    height: "h-[200px] sm:h-[220px] lg:h-[250px]",
    sizes: "(min-width: 1280px) 390px, (min-width: 1024px) 31vw, (min-width: 640px) 45vw, 100vw",
  },
];

/**
 * Photographs framed like a report: numbered plate, image, caption printed
 * below on its own strip rather than burned over the picture. A caption over a
 * dark scrim is a magazine move; a caption under a hairline is a document.
 */
export function FieldTrialSection() {
  const tr = useTr();

  return (
    <SectionShell
      id="thuc-nghiem"
      number="06"
      eyebrow={tr("Thực nghiệm ngoài đồng", "Field trial")}
      title={tr(
        "Đã mang ra vườn thật, không chỉ chạy trong phòng máy",
        "Taken to a real garden, not just run in a lab",
      )}
      description={tr(
        `Đội ${TEAM_NAME} mang Agromind AI ra vườn thật, chụp lá ngay tại luống và đưa máy cho người trồng tự xem kết quả.`,
        `The ${TEAM_NAME} team took Agromind AI out to a real garden, photographed leaves right at the bed and handed the phone to the grower.`,
      )}
      className="bg-surface"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
        {shots.map((shot, index) => (
          <Reveal key={shot.src} delay={index * 0.06} className={shot.span}>
            <figure className="group flex h-full flex-col border border-line bg-surface-raised">
              <div className={cn("relative overflow-hidden", shot.height)}>
                <Image
                  src={shot.src}
                  alt={tr(shot.alt, shot.altEn)}
                  fill
                  sizes={shot.sizes}
                  loading={index < 2 ? "eager" : "lazy"}
                  className="object-cover transition duration-700 group-hover:scale-[1.03] motion-reduce:transition-none"
                />
                <span className="absolute left-3 top-3 border border-line bg-surface px-2 py-1 font-display text-[11px] font-bold tabular-nums tracking-[0.12em] text-ink">
                  {tr("Ảnh", "Plate")} {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <figcaption className="border-t border-line px-4 py-3 text-sm font-medium leading-6 text-ink">
                {tr(shot.caption, shot.captionEn)}
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.2} className="mt-8 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <p className="flex items-start gap-2 text-sm font-semibold text-ink">
          <MapPin size={16} className="mt-1 shrink-0 text-leaf-strong" aria-hidden />
          <span>
            {tr(
              `Thực nghiệm tại ${TRIAL_HOST}, ${TRIAL_PROVINCE.vi}`,
              `Trialled at ${TRIAL_HOST}, ${TRIAL_PROVINCE.en}`,
            )}
            {TRIAL_DATE ? (
              <span className="font-normal text-ink-soft"> · {tr(TRIAL_DATE.vi, TRIAL_DATE.en)}</span>
            ) : null}
          </span>
        </p>
        <p className="max-w-md text-sm leading-6 text-ink-soft">
          {tr(
            "Kết quả hiện đủ năm khả năng kèm phần trăm, không rút gọn thành một đáp án chắc chắn.",
            "Results show all five possibilities with their confidence, never reduced to one certain answer.",
          )}
        </p>
      </Reveal>
    </SectionShell>
  );
}
