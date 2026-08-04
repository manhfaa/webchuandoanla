"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Play, RotateCcw } from "lucide-react";
import Link from "next/link";

import { SectionShell } from "@/components/layout/section-shell";
import { Reveal } from "@/components/ui/reveal";
import { buttonVariants } from "@/components/ui/button";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";

const POSTER = "/demo/agromind-demo-poster.webp";
const SRC_720 = "/demo/agromind-demo-720.mp4";

/** Size and length are stated up front rather than discovered after the tap. */
const WEIGHT_MB = "13,7 MB";
const LENGTH = "1 phút 10 giây";
const LENGTH_EN = "1 min 10 sec";

/**
 * Chapters. Each is a real frame from the recording, so the strip is the video's
 * own story rather than an illustration of it.
 */
const CHAPTERS = [
  {
    at: 12,
    stamp: "0:12",
    src: "/demo/demo-01-ra-vuon.webp",
    label: "Ra vườn",
    labelEn: "Into the garden",
    alt: "Người dùng đứng cạnh luống cây, mở Agromind AI trên điện thoại",
    altEn: "A user standing by a plant bed, opening Agromind AI on their phone",
  },
  {
    at: 40,
    stamp: "0:40",
    src: "/demo/demo-02-chup-la.webp",
    label: "Chụp lá",
    labelEn: "Photograph the leaf",
    alt: "Cận cảnh điện thoại đang chụp một chiếc lá",
    altEn: "Close-up of the phone photographing a leaf",
  },
  {
    at: 66,
    stamp: "1:06",
    src: "/demo/demo-03-ket-qua.webp",
    label: "Nhận kết quả",
    labelEn: "Read the result",
    alt: "Màn hình điện thoại hiển thị danh sách các khả năng bệnh",
    altEn: "The phone screen showing the list of possible diseases",
  },
];

/**
 * The product demo, shot in a real garden.
 *
 * Nothing downloads until the grower asks for it. `preload="none"` plus a poster
 * means arriving on the page costs one small image; the 13.7 MB file is fetched
 * only on a deliberate press. This audience is on mobile data standing in a
 * field, so a landing page that spends their bundle to autoplay something they
 * did not ask for is a bad trade however impressive it looks.
 *
 * The three chapter stills exist for the same reason. A single poster tells a
 * visitor nothing about what they are about to pay for, and 70 seconds is a long
 * time outdoors — the strip both sells the play and lets someone who only wants
 * to see the answer jump straight to it. Together they cost 56 KB.
 *
 * The source recording is HEVC, which Chrome and Firefox largely refuse to decode
 * in a <video> element; it is re-encoded to H.264 before shipping. The 2560x1440
 * 92 MB original is never served.
 */
export function DemoVideoSection() {
  const tr = useTr();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);

  function playFrom(seconds: number | null) {
    const video = videoRef.current;
    if (!video) return;
    setStarted(true);
    setEnded(false);
    if (seconds !== null) {
      // The metadata may not exist yet on the first press, and seeking before it
      // does is silently ignored — so the seek waits for the browser to know how
      // long the video is.
      if (video.readyState >= 1) {
        video.currentTime = seconds;
      } else {
        video.addEventListener("loadedmetadata", () => { video.currentTime = seconds; }, { once: true });
      }
    }
    void video.play();
  }

  return (
    <SectionShell
      id="video-demo"
      eyebrow={tr("Xem thử", "See it work")}
      title={tr("Một lần kiểm tra lá, quay ngoài vườn", "One leaf check, filmed in the garden")}
      description={tr(
        "Toàn bộ quá trình: mở máy, chụp lá, đọc kết quả. Không dựng lại, không tua nhanh.",
        "The whole thing: open the app, photograph a leaf, read the result. Not staged, not sped up.",
      )}
      className="bg-surface"
    >
      <Reveal>
        <figure className="overflow-hidden rounded-[var(--r-xl)] border border-line-strong bg-forest shadow-md">
          <div className="relative aspect-video w-full">
            <video
              ref={videoRef}
              preload="none"
              poster={POSTER}
              controls={started}
              playsInline
              // Without playsInline, iOS takes over the whole screen with its own
              // player and the page around the video disappears.
              className="h-full w-full bg-forest object-contain"
              onPlay={() => { setStarted(true); setEnded(false); }}
              onEnded={() => setEnded(true)}
            >
              <source src={SRC_720} type="video/mp4" />
              {tr("Trình duyệt của bạn không phát được video này.", "Your browser cannot play this video.")}
            </video>

            {!started ? (
              <button
                type="button"
                onClick={() => playFrom(null)}
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[color-mix(in_srgb,var(--forest)_38%,transparent)] transition hover:bg-[color-mix(in_srgb,var(--forest)_24%,transparent)] motion-reduce:transition-none"
                aria-label={tr(
                  `Phát video demo, ${LENGTH}, ${WEIGHT_MB}`,
                  `Play the demo video, ${LENGTH_EN}, ${WEIGHT_MB}`,
                )}
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface text-leaf-strong shadow-lg sm:h-20 sm:w-20">
                  <Play size={28} className="ml-1" aria-hidden />
                </span>
                {/* The cost is on the button itself, not buried in a caption. */}
                <span className="rounded-full border border-[color-mix(in_srgb,var(--on-forest)_24%,transparent)] bg-[color-mix(in_srgb,var(--forest)_72%,transparent)] px-3 py-1 font-display text-xs font-bold tracking-[0.06em] text-on-forest">
                  {tr(`${LENGTH} · ${WEIGHT_MB}`, `${LENGTH_EN} · ${WEIGHT_MB}`)}
                </span>
              </button>
            ) : null}

            {ended ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[color-mix(in_srgb,var(--forest)_82%,transparent)] px-5 text-center">
                <p className="font-display text-lg font-bold text-on-forest sm:text-xl">
                  {tr("Bạn cũng làm được như vậy với vườn của mình", "You can do the same with your own garden")}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link href="/register" className={cn(buttonVariants({ variant: "primary" }))}>
                    {tr("Dùng thử miễn phí", "Try it free")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => playFrom(0)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-[var(--r-md)] border border-[color-mix(in_srgb,var(--on-forest)_28%,transparent)] px-4 text-sm font-semibold text-on-forest transition hover:bg-[color-mix(in_srgb,var(--on-forest)_10%,transparent)] motion-reduce:transition-none"
                  >
                    <RotateCcw size={16} aria-hidden /> {tr("Xem lại", "Watch again")}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Chapter strip: the video's own frames, in order, each a shortcut. */}
          <div className="grid grid-cols-3 gap-px border-t border-line-strong bg-line-strong">
            {CHAPTERS.map((chapter, index) => (
              <button
                key={chapter.at}
                type="button"
                onClick={() => playFrom(chapter.at)}
                className="group flex flex-col bg-surface-raised text-left transition hover:bg-surface-soft motion-reduce:transition-none"
                aria-label={tr(
                  `Xem từ phút ${chapter.stamp}: ${chapter.label}`,
                  `Play from ${chapter.stamp}: ${chapter.labelEn}`,
                )}
              >
                <span className="relative block aspect-video w-full overflow-hidden">
                  <Image
                    src={chapter.src}
                    alt={tr(chapter.alt, chapter.altEn)}
                    fill
                    sizes="(min-width: 1280px) 400px, (min-width: 640px) 32vw, 33vw"
                    className="object-cover transition duration-500 group-hover:scale-[1.04] motion-reduce:transition-none"
                  />
                  <span
                    aria-hidden
                    className="absolute left-1.5 top-1.5 rounded-[var(--r-sm)] border border-[color-mix(in_srgb,var(--on-forest)_22%,transparent)] bg-[color-mix(in_srgb,var(--forest)_74%,transparent)] px-1.5 py-0.5 font-display text-[10px] font-bold tabular-nums tracking-[0.12em] text-on-forest"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </span>
                <span className="flex min-h-11 flex-col justify-center px-2 py-2 sm:px-3">
                  <span className="font-display text-[11px] font-bold tabular-nums text-leaf-strong">
                    {chapter.stamp}
                  </span>
                  <span className="text-xs font-semibold leading-tight text-ink sm:text-sm">
                    {tr(chapter.label, chapter.labelEn)}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <figcaption className="flex flex-col gap-1 border-t border-line-strong bg-surface-raised px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <span className="text-sm font-semibold text-ink">
              {tr("Quay tại vườn, có phụ đề sẵn trên hình", "Filmed on site, subtitles burned in")}
            </span>
            <span className="text-xs text-ink-muted">
              {tr(
                `Bấm một mốc để xem thẳng đoạn đó · chỉ tải khi bạn bấm`,
                `Tap a chapter to jump straight there · only downloads when you press`,
              )}
            </span>
          </figcaption>
        </figure>
      </Reveal>
    </SectionShell>
  );
}
