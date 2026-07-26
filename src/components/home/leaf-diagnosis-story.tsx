"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";

import { PlateNumber, VeinGlyph } from "@/components/ui/field-notebook";
import { useTr } from "@/lib/use-tr";

/* V2 — SECTION QUY TRÌNH
   Sửa: `lg:h-[240dvh]` -> `130dvh` (tiết kiệm hơn 1 màn cuộn);
        bỏ `max-lg:!translate-y-0 !scale-100 !opacity-100` — mobile không còn là
        "bản tắt animation" mà có vein path dọc vẽ dần thật;
        icon chip 48x48 -> số hiệu mono + glyph sinh trưởng;
        `bg-forest` -> `bg-panel-ink` để dark mode giữ được phân cấp.
   Giữ: 4 giai đoạn, câu hỏi, mô tả, detail, toàn bộ transform theo scroll. */

const stages = [
  {
    title: "Chụp lá",
    titleEn: "Capture leaf",
    question: "Ảnh có đủ rõ không?",
    questionEn: "Is the photo clear enough?",
    description: "Chụp một chiếc lá chính, đủ sáng và không bị vật khác che khuất.",
    descriptionEn: "Photograph one main leaf, well-lit and not blocked by anything.",
    detail: "Ảnh được kiểm tra trước khi phân tích.",
    detailEn: "The photo is checked before analysis.",
  },
  {
    title: "Phân tích",
    titleEn: "Analyze",
    question: "Lá đang có dấu hiệu gì?",
    questionEn: "What signs does the leaf show?",
    description: "Các khả năng được xếp hạng cùng độ tin cậy thay vì chỉ đưa ra một nhãn.",
    descriptionEn: "Possibilities are ranked with confidence instead of giving just one label.",
    detail: "Năm khả năng nổi bật được trình bày rõ.",
    detailEn: "The five most likely possibilities are shown clearly.",
  },
  {
    title: "Đối chiếu",
    titleEn: "Cross-check",
    question: "Triệu chứng có phù hợp không?",
    questionEn: "Do the symptoms match?",
    description: "Mô tả thực tế của bạn được so sánh với nguồn tham khảo có thể mở lại.",
    descriptionEn: "Your real-world description is compared with references you can reopen.",
    detail: "Bạn luôn biết nguồn thông tin đến từ đâu.",
    detailEn: "You always know where the information comes from.",
  },
  {
    title: "Theo dõi",
    titleEn: "Follow up",
    question: "Việc nào cần làm tiếp?",
    questionEn: "What should be done next?",
    description: "Kết quả và khuyến nghị được lưu để bạn chụp lại và so sánh theo thời gian.",
    descriptionEn: "Results and recommendations are saved so you can re-photograph and compare over time.",
    detail: "Mỗi lần kiểm tra trở thành một mốc chăm sóc.",
    detailEn: "Each check becomes a care milestone.",
  },
];

const ranges = [
  [0, 0.08, 0.29],
  [0.17, 0.34, 0.55],
  [0.43, 0.61, 0.82],
  [0.69, 0.87, 1],
] as const;

interface StoryStageProps {
  stage: (typeof stages)[number];
  index: number;
  progress: MotionValue<number>;
  reduceMotion: boolean;
}

function StoryStage({ stage, index, progress, reduceMotion }: StoryStageProps) {
  const tr = useTr();
  const [start, peak, end] = ranges[index];
  const opacity = useTransform(
    progress,
    [start, peak, end],
    index === 0 ? [1, 1, 0.45] : index === stages.length - 1 ? [0.45, 1, 1] : [0.45, 1, 0.45],
  );
  const y = useTransform(
    progress,
    [start, peak, end],
    index === 0 ? [0, 0, -6] : index === stages.length - 1 ? [10, 0, 0] : [10, 0, -6],
  );
  const glyphScale = useTransform(progress, [start, peak, end], [0.9, 1, 0.9]);

  return (
    <motion.article
      className="relative grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-5 gap-y-2 border-t border-paper-rule py-6 lg:border-transparent lg:py-4 lg:pl-0"
      style={reduceMotion ? undefined : { opacity, y }}
    >
      <span className="relative z-10 pt-0.5">
        <PlateNumber n={index + 1} tone="leaf" size="md" />
      </span>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] font-semibold text-leaf-strong">
              {tr(stage.question, stage.questionEn)}
            </p>
            <h3 className="mt-1 font-display text-[21px] font-extrabold tracking-[-0.025em] text-ink sm:text-[23px]">
              {tr(stage.title, stage.titleEn)}
            </h3>
          </div>
          <motion.span
            className="shrink-0"
            style={reduceMotion ? undefined : { scale: glyphScale }}
          >
            <VeinGlyph stage={(index + 1) as 1 | 2 | 3 | 4} size={30} />
          </motion.span>
        </div>
        <p className="mt-2 max-w-[54ch] text-[14.5px] leading-[1.65] text-ink-soft">
          {tr(stage.description, stage.descriptionEn)}
        </p>
        <p className="mt-2 text-[12.5px] font-semibold leading-5 text-ink">
          {tr(stage.detail, stage.detailEn)}
        </p>
      </div>
    </motion.article>
  );
}

function VeinDot({
  index,
  progress,
  reduceMotion,
}: {
  index: number;
  progress: MotionValue<number>;
  reduceMotion: boolean;
}) {
  const [start, peak, end] = ranges[index];
  const scale = useTransform(progress, [start, peak, end], [0.6, 1.15, 0.75]);
  const opacity = useTransform(progress, [start, peak, end], [0.35, 1, 0.55]);

  return (
    <motion.span
      className="absolute left-[18px] hidden h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-leaf shadow-[0_0_0_4px_color-mix(in_srgb,var(--leaf)_18%,transparent)] lg:block"
      style={{ top: `${peak * 100}%`, ...(reduceMotion ? { opacity: 1 } : { scale, opacity }) }}
      aria-hidden
    />
  );
}

export function LeafDiagnosisStory() {
  const tr = useTr();
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 72,
    damping: 24,
    mass: 0.35,
    restDelta: 0.001,
  });

  const imageScale = useTransform(smoothProgress, [0, 0.5, 1], [1, 1.035, 1]);
  const imageY = useTransform(smoothProgress, [0, 1], [18, -18]);
  const veilOpacity = useTransform(smoothProgress, [0.08, 0.32, 0.78, 0.98], [0.5, 0.12, 0.22, 0.48]);
  const lensScale = useTransform(smoothProgress, [0.18, 0.42, 0.7], [0.72, 1, 1.16]);
  const lensOpacity = useTransform(smoothProgress, [0.12, 0.25, 0.72, 0.84], [0, 1, 1, 0]);
  const lesionOpacity = useTransform(smoothProgress, [0.3, 0.45, 0.72, 0.86], [0, 1, 1, 0.15]);
  const pathScale = useTransform(smoothProgress, [0.58, 0.92], [0, 1]);
  // Mobile dùng cùng nguồn scroll nhưng vẽ sớm hơn vì section thấp hơn.
  const mobilePathScale = useTransform(smoothProgress, [0.05, 0.85], [0, 1]);

  return (
    <section
      ref={sectionRef}
      id="quy-trinh"
      aria-label={tr("Quy trình từ ảnh lá đến hành động", "Workflow from leaf photo to action")}
      className="relative scroll-mt-24 bg-canvas lg:h-[130dvh]"
    >
      <div className="lg:sticky lg:top-0 lg:flex lg:min-h-[92dvh] lg:items-center lg:overflow-hidden lg:pb-10 lg:pt-24">
        <div className="mx-auto w-full max-w-[1440px] px-5 py-[72px] sm:px-6 md:py-24 lg:px-8 lg:py-0">
          <div className="mb-10 max-w-[720px] lg:mb-12">
            <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.12em] text-leaf-strong">
              <span aria-hidden className="inline-block h-px w-7 bg-leaf" />
              {tr("Quy trình", "How it works")}
            </p>
            <h2 className="mt-6 max-w-[22ch] text-balance font-display text-[28px] font-extrabold leading-[1.12] tracking-[-0.04em] text-ink sm:text-[34px] md:text-[40px] lg:text-[46px] lg:leading-[1.08]">
              {tr(
                "Một đường sinh mạch từ ảnh lá đến hành động.",
                "A vein of life from leaf photo to action.",
              )}
            </h2>
            <p className="mt-4 max-w-[62ch] text-pretty text-[15.5px] leading-[1.7] text-ink-soft sm:text-base lg:text-[17px]">
              {tr(
                "Mỗi giai đoạn trả lời đúng một câu hỏi để kết quả dễ hiểu và có thể theo dõi ngoài vườn.",
                "Each stage answers exactly one question so the result stays easy to understand and trackable out in the garden.",
              )}
            </p>
          </div>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)] lg:items-center lg:gap-14">
            <div className="relative overflow-hidden rounded-[var(--r-2xl)] border border-panel-ink-border bg-panel-ink shadow-md">
              <motion.div
                className="relative h-[340px] w-full sm:h-auto sm:aspect-[16/10] lg:min-h-[480px]"
                style={reduceMotion ? undefined : { scale: imageScale, y: imageY }}
              >
                <Image
                  src="/plant-leaves/story-grape-leaf.png"
                  alt={tr(
                    "Lá nho có phấn trắng và đốm nâu đang được kiểm tra",
                    "Grape leaf with white powder and brown spots being examined",
                  )}
                  fill
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  className="object-cover object-center"
                />
                <motion.div
                  className="absolute inset-0 bg-forest"
                  style={reduceMotion ? { opacity: 0.22 } : { opacity: veilOpacity }}
                  aria-hidden
                />

                <motion.div
                  className="absolute left-[39%] top-[31%] h-36 w-36 rounded-full border border-on-forest/75 shadow-[inset_0_0_0_9px_rgba(239,249,241,0.08)] sm:h-44 sm:w-44"
                  style={reduceMotion ? { opacity: 1 } : { opacity: lensOpacity, scale: lensScale }}
                  aria-hidden
                >
                  <span className="absolute inset-5 rounded-full border border-on-forest/35" />
                  <span className="absolute left-1/2 top-3 h-[calc(100%-1.5rem)] w-px -translate-x-1/2 bg-on-forest/35" />
                  <span className="absolute left-3 top-1/2 h-px w-[calc(100%-1.5rem)] -translate-y-1/2 bg-on-forest/35" />
                </motion.div>

                <motion.div
                  className="absolute left-[55%] top-[44%] h-7 w-7 rounded-full border-2 border-sun bg-sun/15 shadow-[0_0_0_7px_rgba(234,182,75,0.12)]"
                  style={reduceMotion ? { opacity: 1 } : { opacity: lesionOpacity }}
                  aria-hidden
                />
                <motion.div
                  className="absolute left-[45%] top-[37%] h-5 w-5 rounded-full border-2 border-sun bg-sun/15 shadow-[0_0_0_6px_rgba(234,182,75,0.1)]"
                  style={reduceMotion ? { opacity: 1 } : { opacity: lesionOpacity }}
                  aria-hidden
                />

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest via-forest/80 to-transparent px-5 pb-5 pt-16 text-on-forest sm:px-7 sm:pb-7">
                  <p className="max-w-lg text-[13.5px] font-semibold leading-6 text-on-forest-muted">
                    {tr(
                      "Tải ảnh lá để nhận gợi ý bệnh, đối chiếu triệu chứng và biết việc cần làm tiếp theo.",
                      "Upload a leaf photo to get disease suggestions, cross-check symptoms, and know what to do next.",
                    )}
                  </p>
                </div>
              </motion.div>
            </div>

            <div className="relative">
              {/* Desktop: gân lá vẽ dần theo scroll, chấm nhánh tới từng bước */}
              <svg
                className="absolute bottom-8 left-[18px] top-8 hidden w-2 -translate-x-1/2 overflow-visible lg:block"
                viewBox="0 0 2 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <motion.path
                  d="M1 0 L1 100"
                  fill="none"
                  stroke="var(--leaf)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  style={reduceMotion ? { pathLength: 1 } : { pathLength: pathScale }}
                />
              </svg>
              {stages.map((_, index) => (
                <VeinDot
                  key={`dot-${index}`}
                  index={index}
                  progress={smoothProgress}
                  reduceMotion={Boolean(reduceMotion)}
                />
              ))}

              {/* Mobile: vein path dọc THẬT, vẽ dần theo scroll của chính section */}
              <svg
                className="pointer-events-none absolute bottom-6 left-[18px] top-6 w-2 -translate-x-1/2 overflow-visible lg:hidden"
                viewBox="0 0 2 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M1 0 L1 100" fill="none" stroke="var(--leaf)" strokeOpacity="0.16" strokeWidth="1.5" />
                <motion.path
                  d="M1 0 L1 100"
                  fill="none"
                  stroke="var(--leaf)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  style={reduceMotion ? { pathLength: 1 } : { pathLength: mobilePathScale }}
                />
              </svg>

              <div className="grid lg:min-h-[480px] lg:content-center">
                {stages.map((stage, index) => (
                  <StoryStage
                    key={stage.title}
                    stage={stage}
                    index={index}
                    progress={smoothProgress}
                    reduceMotion={Boolean(reduceMotion)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
