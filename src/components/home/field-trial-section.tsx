"use client";

import Image from "next/image";
import { MapPin } from "lucide-react";

import { SectionShell } from "@/components/layout/section-shell";
import { Reveal } from "@/components/ui/reveal";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";

// The host is named at the project owner's instruction. Everything user-facing
// says "thực nghiệm tại" — where the trial took place — and never "đối tác",
// "hợp tác cùng" or "được tin dùng bởi": hosting a visit is not an endorsement
// and the copy must not imply one. Kept in constants so the name can be pulled
// in a single edit if that permission is ever withdrawn.
const TRIAL_HOST = "Công ty TNHH Nông nghiệp Công nghệ cao Dabaco";
const TRIAL_PROVINCE = { vi: "Bắc Ninh", en: "Bac Ninh" };
const TEAM_NAME = "Green Green";

// Every photo from this trip lost its EXIF passing through a messaging app, so
// there is no verified capture date. Rather than invent one, the caption strip
// renders a date only once someone fills this in with a real one.
const TRIAL_DATE: { vi: string; en: string } | null = null;

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
  priority?: boolean;
};

const shots: Shot[] = [
  {
    src: "/field-trial/app-result.webp",
    alt: "Bàn tay cầm điện thoại hiển thị màn hình Agromind AI với năm khả năng bệnh kèm phần trăm, phía sau là khay cây giống cà chua",
    altEn:
      "A hand holding a phone showing the Agromind AI screen with five disease possibilities and their confidence, tomato seedling trays behind",
    caption: "Năm khả năng kèm mức tin cậy, hiện thẳng trên điện thoại.",
    captionEn: "Five possibilities with confidence, shown right on the phone.",
    // Full width from tablet up. Sharing the row with the portrait leaf left the
    // evidence shot at 347px while the leaf beside it stood 440px tall, so the
    // decorative photo out-shouted the one carrying the argument.
    span: "sm:col-span-2 lg:col-span-8",
    // Taller than its natural ratio on phones on purpose. This is a wide frame
    // with the handset in the middle, so a short box scales the whole photo down
    // until the five-result list is 142px across and unreadable — losing the one
    // thing the photo is here to show. A 420px box makes object-cover crop the
    // margins instead and renders the phone at ~224px.
    height: "h-[420px] sm:h-[500px] lg:h-[560px]",
    sizes: "(min-width: 1280px) 780px, (min-width: 1024px) 62vw, (min-width: 640px) 92vw, 100vw",
  },
  {
    src: "/field-trial/leaf-damage.webp",
    alt: "Cận cảnh lá mướp bị sâu ăn thủng nhiều lỗ, nắng xuyên qua phiến lá, quả mướp treo bên cạnh",
    altEn: "Close-up of a luffa leaf eaten through with holes, sunlight through the blade, a luffa fruit hanging beside it",
    caption: "Lá mướp bị sâu ăn — đúng thứ người trồng cần biết tên.",
    captionEn: "A pest-eaten luffa leaf — exactly what a grower needs named.",
    span: "lg:col-span-4",
    height: "h-[380px] sm:h-[440px] lg:h-[560px]",
    sizes: "(min-width: 1280px) 390px, (min-width: 1024px) 31vw, (min-width: 640px) 45vw, 100vw",
  },
  {
    src: "/field-trial/trellis-check.webp",
    alt: "Dưới giàn mướp, bốn sinh viên và một nông dân đội nón lá cùng xem điện thoại giữa luống cây",
    altEn: "Under a luffa trellis, four students and a farmer in a conical hat look at a phone among the beds",
    caption: "Dưới giàn mướp, chụp tại chỗ.",
    captionEn: "Under the luffa trellis, photographed on the spot.",
    span: "lg:col-span-4",
    height: "h-[200px] sm:h-[230px] lg:h-[280px]",
    sizes: "(min-width: 1280px) 390px, (min-width: 1024px) 31vw, (min-width: 640px) 45vw, 100vw",
  },
  {
    src: "/field-trial/nursery-advice.webp",
    alt: "Trong nhà lưới, một sinh viên đưa điện thoại cho người trồng xem bên luống cây giống",
    altEn: "Inside a net house, a student hands the phone to a grower beside a bed of seedlings",
    caption: "Đưa máy cho chủ vườn tự xem kết quả.",
    captionEn: "Handing the phone over so the grower reads it themselves.",
    span: "lg:col-span-4",
    height: "h-[200px] sm:h-[230px] lg:h-[280px]",
    sizes: "(min-width: 1280px) 390px, (min-width: 1024px) 31vw, (min-width: 640px) 45vw, 100vw",
  },
  {
    src: "/field-trial/nursery-wide.webp",
    alt: "Toàn cảnh nhà lưới, các thành viên trong đội cúi soi từng khay cây giống",
    altEn: "Wide view of the net house, team members leaning in to inspect each seedling tray",
    caption: "Soi từng khay cây giống trong nhà lưới.",
    captionEn: "Inspecting the seedling trays tray by tray.",
    span: "lg:col-span-4",
    height: "h-[200px] sm:h-[230px] lg:h-[280px]",
    sizes: "(min-width: 1280px) 390px, (min-width: 1024px) 31vw, (min-width: 640px) 45vw, 100vw",
  },
];

// Every colour token in tailwind.config.ts is a bare `var(--token)` with no
// <alpha-value>, so `from-forest/80` compiles to invalid CSS and is dropped
// entirely — the overlay would silently disappear and the caption would sit on
// bare photo. color-mix() is the working form. It goes in `style` rather than an
// arbitrary Tailwind class because a multi-stop gradient of color-mix() values is
// past the point where the arbitrary-value escaping stays readable.
const captionScrim =
  "linear-gradient(to top," +
  " color-mix(in srgb, var(--forest) 92%, transparent) 0%," +
  " color-mix(in srgb, var(--forest) 62%, transparent) 42%," +
  " transparent 78%)";

export function FieldTrialSection() {
  const tr = useTr();

  return (
    <SectionShell
      id="thuc-nghiem"
      eyebrow={tr("Thực nghiệm ngoài đồng", "Field trial")}
      title={tr(
        "Đã mang ra vườn thật, không chỉ chạy trong phòng máy",
        "Taken to a real garden, not just run in a lab",
      )}
      // The host is named once, down in the location strip. Repeating a name this
      // long here as well would put the same clause twice on one screen.
      description={tr(
        `Đội ${TEAM_NAME} mang Agromind AI ra vườn thật, chụp lá ngay tại luống và đưa máy cho người trồng tự xem kết quả.`,
        `The ${TEAM_NAME} team took Agromind AI out to a real garden, photographed leaves right at the bed and handed the phone to the grower.`,
      )}
      className="bg-canvas"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
        {shots.map((shot, index) => (
          <Reveal
            key={shot.src}
            delay={index * 0.06}
            // With the evidence shot spanning both tablet columns, the remaining
            // four pair off cleanly — leaf/trellis, then advice/wide — so nothing
            // needs a span override and no card is left orphaned.
            className={shot.span}
          >
            <figure
              className={cn(
                "group relative overflow-hidden rounded-[var(--r-lg)] border border-line-strong shadow-md",
                shot.height,
              )}
            >
              <Image
                src={shot.src}
                alt={tr(shot.alt, shot.altEn)}
                fill
                sizes={shot.sizes}
                // Only the first two are plausibly above the fold on a phone;
                // the context row can wait for the viewport to reach it.
                loading={index < 2 ? "eager" : "lazy"}
                className="object-cover transition duration-700 group-hover:scale-[1.03] motion-reduce:transition-none"
              />
              <figcaption
                className="absolute inset-x-0 bottom-0 px-4 pb-3 pt-10 text-sm font-medium leading-6 text-on-forest"
                style={{ backgroundImage: captionScrim }}
              >
                {tr(shot.caption, shot.captionEn)}
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>

      <Reveal
        delay={0.2}
        className="mt-5 flex flex-col gap-3 rounded-[var(--r-lg)] border border-line bg-surface-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
      >
        {/* items-start, not items-center: the host's full legal name wraps to two
            lines on a phone, and centring would float the pin against the middle
            of the wrapped block instead of the first line. */}
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
        <p className="text-sm leading-6 text-ink-soft">
          {tr(
            "Kết quả hiện đủ năm khả năng kèm phần trăm, không rút gọn thành một đáp án chắc chắn.",
            "Results show all five possibilities with their confidence, never reduced to one certain answer.",
          )}
        </p>
      </Reveal>
    </SectionShell>
  );
}
