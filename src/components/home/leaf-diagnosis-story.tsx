"use client";

import Image from "next/image";
import { Camera, CheckCircle2, ClipboardCheck, ScanSearch } from "lucide-react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";

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
    icon: Camera,
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
    icon: ScanSearch,
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
    icon: ClipboardCheck,
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
    icon: CheckCircle2,
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
  const Icon = stage.icon;
  const [start, peak, end] = ranges[index];
  const opacity = useTransform(
    progress,
    [start, peak, end],
    index === 0 ? [1, 1, 0.4] : index === stages.length - 1 ? [0.4, 1, 1] : [0.4, 1, 0.4],
  );
  const y = useTransform(
    progress,
    [start, peak, end],
    index === 0 ? [0, 0, -6] : index === stages.length - 1 ? [10, 0, 0] : [10, 0, -6],
  );
  const scale = useTransform(
    progress,
    [start, peak, end],
    index === 0 ? [1, 1, 0.992] : index === stages.length - 1 ? [0.992, 1, 1] : [0.992, 1, 0.992],
  );
  const iconScale = useTransform(progress, [start, peak, end], [0.88, 1, 0.88]);

  return (
    <motion.article
      className="relative grid gap-4 rounded-[var(--r-lg)] border border-line bg-surface/92 p-5 shadow-sm backdrop-blur-sm max-lg:!translate-y-0 max-lg:!scale-100 max-lg:!opacity-100 sm:grid-cols-[48px_minmax(0,1fr)] lg:ml-0 lg:border-transparent lg:bg-transparent lg:p-4 lg:pl-0 lg:shadow-none lg:backdrop-blur-none lg:will-change-transform"
      style={reduceMotion ? undefined : { opacity, y, scale }}
    >
      <motion.span
        className="relative z-10 flex h-12 w-12 items-center justify-center rounded-[var(--r-md)] border border-line-strong bg-surface-raised text-leaf-strong"
        style={reduceMotion ? undefined : { scale: iconScale }}
      >
        <Icon size={20} strokeWidth={1.8} aria-hidden />
      </motion.span>
      <div>
        <p className="text-sm font-semibold text-leaf-strong">{tr(stage.question, stage.questionEn)}</p>
        <h3 className="mt-1 font-display text-xl font-extrabold tracking-[-0.025em] text-ink sm:text-2xl">{tr(stage.title, stage.titleEn)}</h3>
        <p className="mt-2 text-sm leading-6 text-ink-soft">{tr(stage.description, stage.descriptionEn)}</p>
        <p className="mt-2 text-xs font-semibold leading-5 text-ink">{tr(stage.detail, stage.detailEn)}</p>
      </div>
    </motion.article>
  );
}

function VeinDot({ index, progress, reduceMotion }: { index: number; progress: MotionValue<number>; reduceMotion: boolean }) {
  const [start, peak, end] = ranges[index];
  const scale = useTransform(progress, [start, peak, end], [0.6, 1.15, 0.75]);
  const opacity = useTransform(progress, [start, peak, end], [0.35, 1, 0.55]);

  return (
    <motion.span
      className="absolute left-6 hidden h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-leaf shadow-[0_0_0_4px_color-mix(in_srgb,var(--leaf)_18%,transparent)] lg:block"
      style={{ top: `${peak * 100}%`, ...(reduceMotion ? { opacity: 1 } : { scale, opacity }) }}
      aria-hidden
    />
  );
}

/** story-grape-leaf.png là 1586x992. */
const IMAGE_ASPECT = 1586 / 992;

/**
 * Vị trí dấu hiệu bệnh, tính theo phần trăm TOẠ ĐỘ ẢNH GỐC.
 *
 * Đo trực tiếp trên tệp ảnh, không ước lượng bằng mắt: đốm hoại tử tìm bằng
 * cách dò vùng tối có viền xung quanh là lá xanh; lõi phấn trắng tìm bằng bản
 * đồ mật độ độ bão hoà, vì phấn trắng làm giảm bão hoà xuống 0.34-0.41 trong
 * khi lá sạch ở 0.48-0.50.
 *
 * Ba vòng cũ đặt ở 39%/31%, 55%/44% và 45%/37% đều rơi vào chỗ lá lành.
 */
const POWDER_CORE = { x: 56.9, y: 48.1 };
const LESIONS = [
  { x: 65.9, y: 66.8, size: "h-7 w-7", ring: 7 },
  { x: 73.8, y: 50.0, size: "h-5 w-5", ring: 6 },
  { x: 27.4, y: 65.7, size: "h-6 w-6", ring: 6 },
];

/**
 * Chuyển toạ độ ảnh sang toạ độ khung.
 *
 * Không thể dùng phần trăm cố định: khung là aspect-16/10 ở khổ sm nhưng
 * `lg:min-h-[500px]` kéo nó thành 646x500 (tỉ lệ 1.293) ở màn hình lớn, còn
 * điện thoại là 360px cao. Mỗi tỉ lệ khiến `object-cover` cắt một lượng khác
 * nhau — đo được ở lg chỉ còn thấy 80.9% chiều ngang ảnh. Vòng khoanh vì thế
 * phải tính lại theo kích thước thật của khung.
 */
function useImagePointToBox(ref: React.RefObject<HTMLElement | null>) {
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Đo ngay khi gắn, không chờ ResizeObserver gọi lần đầu: nếu chờ thì có một
    // khung hình các vòng còn nằm ở toạ độ chưa bù. Việc lắng nghe resize của
    // window là lớp dự phòng cho môi trường mà ResizeObserver bị chặn.
    const measure = () => setBox({ w: node.clientWidth, h: node.clientHeight });
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ref]);

  return useCallback(
    (x: number, y: number) => {
      if (!box?.w || !box?.h) return { left: `${x}%`, top: `${y}%` };
      const boxAspect = box.w / box.h;
      if (boxAspect < IMAGE_ASPECT) {
        const visible = boxAspect / IMAGE_ASPECT; // phần chiều ngang ảnh còn thấy
        return { left: `${((x / 100 - (1 - visible) / 2) / visible) * 100}%`, top: `${y}%` };
      }
      const visible = IMAGE_ASPECT / boxAspect; // cắt trên dưới thay vì hai bên
      return { left: `${x}%`, top: `${((y / 100 - (1 - visible) / 2) / visible) * 100}%` };
    },
    [box],
  );
}

export function LeafDiagnosisStory() {
  const tr = useTr();
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const pointToBox = useImagePointToBox(frameRef);
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

  return (
    <section
      ref={sectionRef}
      id="quy-trinh"
      aria-label={tr("Quy trình từ ảnh lá đến hành động", "Workflow from leaf photo to action")}
      className="relative scroll-mt-20 bg-canvas lg:h-[240dvh]"
    >
      <div className="lg:sticky lg:top-0 lg:flex lg:min-h-[100dvh] lg:items-center lg:overflow-hidden lg:pb-10 lg:pt-24">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-0">
          <div className="mb-9 max-w-3xl lg:mb-8">
            <h2 className="font-display text-3xl font-extrabold leading-[1.12] tracking-[-0.04em] text-ink sm:text-4xl lg:text-[44px]">
              {tr("Một đường sinh mạch từ ảnh lá đến hành động.", "A vein of life from leaf photo to action.")}
            </h2>
            <p className="mt-4 max-w-[62ch] text-base leading-7 text-ink-soft sm:text-lg sm:leading-8">
              {tr(
                "Mỗi giai đoạn trả lời đúng một câu hỏi để kết quả dễ hiểu và có thể theo dõi ngoài vườn.",
                "Each stage answers exactly one question so the result stays easy to understand and trackable out in the garden.",
              )}
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)] lg:items-center lg:gap-12">
            <div className="relative overflow-hidden rounded-[var(--r-xl)] border border-line-strong bg-forest shadow-lg">
              <motion.div
                ref={frameRef}
                className="relative h-[360px] w-full sm:h-auto sm:aspect-[16/10] lg:min-h-[500px]"
                style={reduceMotion ? undefined : { scale: imageScale, y: imageY }}
              >
                <Image
                  src="/plant-leaves/story-grape-leaf.png"
                  alt={tr("Lá nho có phấn trắng và đốm nâu đang được kiểm tra", "Grape leaf with white powder and brown spots being examined")}
                  fill
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  className="object-cover object-center"
                />
                <motion.div
                  className="absolute inset-0 bg-forest"
                  style={reduceMotion ? { opacity: 0.22 } : { opacity: veilOpacity }}
                  aria-hidden
                />

                {/* x/y = -50% nằm trong style của motion, không dùng lớp
                    -translate-x-1/2: framer-motion ghi transform inline nên lớp
                    Tailwind sẽ bị đè và vòng lệch đi nửa đường kính. */}
                <motion.div
                  className="absolute h-36 w-36 rounded-full border border-[color-mix(in_srgb,var(--on-forest)_75%,transparent)] shadow-[inset_0_0_0_9px_rgba(239,249,241,0.08)] sm:h-44 sm:w-44"
                  style={{
                    ...pointToBox(POWDER_CORE.x, POWDER_CORE.y),
                    x: "-50%",
                    y: "-50%",
                    ...(reduceMotion ? { opacity: 1 } : { opacity: lensOpacity, scale: lensScale }),
                  }}
                  aria-hidden
                >
                  <span className="absolute inset-5 rounded-full border border-[color-mix(in_srgb,var(--on-forest)_35%,transparent)]" />
                  <span className="absolute left-1/2 top-3 h-[calc(100%-1.5rem)] w-px -translate-x-1/2 bg-[color-mix(in_srgb,var(--on-forest)_35%,transparent)]" />
                  <span className="absolute left-3 top-1/2 h-px w-[calc(100%-1.5rem)] -translate-y-1/2 bg-[color-mix(in_srgb,var(--on-forest)_35%,transparent)]" />
                </motion.div>

                {LESIONS.map((lesion) => (
                  <motion.div
                    key={`${lesion.x}-${lesion.y}`}
                    className={cn(
                      "absolute rounded-full border-2 border-sun bg-[color-mix(in_srgb,var(--sun)_15%,transparent)]",
                      lesion.size,
                    )}
                    style={{
                      ...pointToBox(lesion.x, lesion.y),
                      x: "-50%",
                      y: "-50%",
                      boxShadow: `0 0 0 ${lesion.ring}px color-mix(in srgb, var(--sun) 12%, transparent)`,
                      ...(reduceMotion ? { opacity: 1 } : { opacity: lesionOpacity }),
                    }}
                    aria-hidden
                  />
                ))}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest via-forest/80 to-transparent px-5 pb-5 pt-16 text-on-forest sm:px-7 sm:pb-7">
                  <p className="max-w-lg text-sm font-semibold leading-6 text-on-forest-muted">
                    {tr(
                      "Tải ảnh lá để nhận gợi ý bệnh, đối chiếu triệu chứng và biết việc cần làm tiếp theo.",
                      "Upload a leaf photo to get disease suggestions, cross-check symptoms, and know what to do next.",
                    )}
                  </p>
                </div>
              </motion.div>
            </div>

            <div className="relative">
              {/* Desktop: gân lá vẽ dần theo scroll, có chấm nhánh tới từng bước */}
              <svg
                className="absolute bottom-8 left-6 top-8 hidden w-3 -translate-x-1/2 overflow-visible lg:block"
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
                <VeinDot key={`dot-${index}`} index={index} progress={smoothProgress} reduceMotion={Boolean(reduceMotion)} />
              ))}

              {/* Mobile: timeline dọc đơn giản, không scroll-scrub */}
              <div className="absolute bottom-6 left-[44px] top-6 w-px bg-gradient-to-b from-leaf/15 via-leaf to-leaf/15 lg:hidden" aria-hidden="true" />

              <div className="grid gap-3 lg:min-h-[500px] lg:content-center">
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
