"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { NotebookSection } from "@/components/ui/field-notebook";
import { teamMembers } from "@/data/mock/team";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";

/* V2 — SECTION ĐỘI NGŨ
   Vấn đề nặng nhất của file cũ: section cao `calc(100svh + 5 * 88svh)` = 540svh
   trên desktop và việc chuyển thành viên bị gắn vào scrollYProgress. Người dùng
   phải cuộn hơn 5 màn để đi qua 5 thành viên, và không thể xem nhanh một người.

   Sau: section cao bình thường. Chuyển thành viên bằng
        - click / bàn phím (role="tablist", ArrowUp/Down/Left/Right, Home/End)
        - tự chuyển 7s, dừng khi hover / focus / tab không active
   Giữ: đúng 5 thành viên, ảnh, vai trò, mô tả, "Phụ trách chính",
        AnimatePresence 480–500ms, tỉ lệ scale ảnh theo từng người. */

const portraitStyles: Record<string, string> = {
  "pham-tuan-minh": "scale-[1.12]",
  "pham-duc-manh": "scale-[1.1]",
  "le-hoang-son": "scale-[1.02]",
  "nguyen-thi-thu-trang": "scale-[1.06]",
  "dinh-my-uyen": "scale-[1.05]",
};

/* object-position riêng cho từng ảnh để không crop sai khuôn mặt. */
const portraitPosition: Record<string, string> = {
  "pham-tuan-minh": "50% 100%",
  "pham-duc-manh": "50% 100%",
  "le-hoang-son": "50% 100%",
  "nguyen-thi-thu-trang": "48% 100%",
  "dinh-my-uyen": "52% 100%",
};

const AUTO_ADVANCE_MS = 7000;

export function TeamSection() {
  const tr = useTr();
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeMember = teamMembers[activeIndex] ?? teamMembers[0];

  useEffect(() => {
    if (paused || reduceMotion) return;

    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setActiveIndex((current) => (current + 1) % teamMembers.length);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [paused, reduceMotion]);

  const focusTab = useCallback((index: number) => {
    const next = (index + teamMembers.length) % teamMembers.length;
    setActiveIndex(next);
    tabRefs.current[next]?.focus();
  }, []);

  const onTabKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        focusTab(index + 1);
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        focusTab(index - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        focusTab(0);
      } else if (event.key === "End") {
        event.preventDefault();
        focusTab(teamMembers.length - 1);
      }
    },
    [focusTab],
  );

  return (
    <NotebookSection
      id="thanh-vien"
      title={tr("Đội ngũ dự án", "Project team")}
      description={tr(
        "Khảo sát, công nghệ, website, kiểm thử và truyền thông cùng hướng về một trải nghiệm dễ dùng cho người Việt Nam.",
        "Research, technology, website, testing, and communications all aimed at an easy-to-use experience for Vietnamese people.",
      )}
      className="bg-canvas"
    >
      <div
        className="grid items-stretch gap-6 lg:grid-cols-[280px_minmax(0,1fr)]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        {/* ── Rail thành viên: dòng kẻ + gạch leaf khi active ── */}
        <div
          role="tablist"
          aria-orientation="vertical"
          aria-label={tr("Chọn thành viên dự án", "Select a project member")}
          className="team-roster-scroll flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-0 lg:overflow-visible lg:pb-0"
        >
          {teamMembers.map((member, index) => {
            const active = index === activeIndex;

            return (
              <button
                key={member.id}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={`team-tab-${member.id}`}
                aria-selected={active}
                aria-controls="team-member-spotlight"
                tabIndex={active ? 0 : -1}
                onClick={() => setActiveIndex(index)}
                onKeyDown={(event) => onTabKeyDown(event, index)}
                className={cn(
                  "min-h-[64px] w-[224px] shrink-0 snap-start border-l-2 px-4 py-3 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/45 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas lg:w-full",
                  active
                    ? "border-leaf bg-surface-soft"
                    : "border-paper-rule hover:border-line-strong hover:bg-surface-soft",
                )}
              >
                <span
                  className={cn(
                    "block text-[12px] font-semibold leading-5",
                    active ? "text-leaf-strong" : "text-ink-soft",
                  )}
                >
                  {tr(member.role, member.roleEn ?? member.role)}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block font-display text-[17px] leading-6 tracking-[-0.02em]",
                    active ? "font-extrabold text-ink" : "font-bold text-ink-soft",
                  )}
                >
                  {member.name}
                </span>
              </button>
            );
          })}

          <p className="mt-4 hidden pl-4 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-soft lg:block">
            {tr("Tự chuyển 7s · hover để dừng", "Auto 7s · hover to pause")}
          </p>
        </div>

        {/* ── Sân khấu thành viên ── */}
        <article
          id="team-member-spotlight"
          role="tabpanel"
          aria-labelledby={`team-tab-${activeMember.id}`}
          aria-live="polite"
          className="grid min-h-[480px] overflow-hidden rounded-[var(--r-2xl)] border border-line bg-surface-raised shadow-lg md:grid-cols-[0.85fr_1.15fr]"
        >
          <div className="relative min-h-[300px] overflow-hidden bg-surface-soft sm:min-h-[360px] md:min-h-full">
            {/* Nền contour/gân lá opacity thấp — không dùng bg-forest để dark mode
                không bị hai vùng tối sát nhau. */}
            <svg
              viewBox="0 0 200 260"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden
              className="absolute inset-0 h-full w-full text-leaf opacity-40"
            >
              <path
                d="M100 20 L100 240 M100 70 C70 84 50 100 40 124 M100 70 C130 84 150 100 160 124 M100 130 C76 142 60 156 52 176 M100 130 C124 142 140 156 148 176"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.18"
                strokeWidth="1"
              />
              <ellipse cx="100" cy="130" rx="86" ry="112" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
              <ellipse cx="100" cy="130" rx="62" ry="84" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
            </svg>

            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={activeMember.id}
                className="absolute inset-0"
                initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -12, scale: 0.992 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <Image
                  src={activeMember.avatar}
                  alt={activeMember.name}
                  fill
                  sizes="(min-width: 1024px) 32vw, (min-width: 768px) 42vw, 100vw"
                  style={{ objectPosition: portraitPosition[activeMember.id] ?? "50% 100%" }}
                  className={cn(
                    "origin-bottom object-contain px-6 pt-7 sm:px-9 md:px-6 lg:px-9",
                    portraitStyles[activeMember.id],
                  )}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={activeMember.id}
              className="flex min-h-0 flex-col p-6 sm:p-9 lg:p-10"
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-leaf-strong">
                {tr(activeMember.role, activeMember.roleEn ?? activeMember.role)}
              </p>
              <h3 className="mt-3 max-w-xl font-display text-[28px] font-extrabold tracking-[-0.035em] text-ink sm:text-[34px]">
                {activeMember.name}
              </h3>
              <p className="mt-5 max-w-[52ch] text-pretty text-[15.5px] leading-[1.75] text-ink-soft">
                {tr(
                  activeMember.description,
                  activeMember.descriptionEn ?? activeMember.description,
                )}
              </p>

              <div className="mt-auto pt-8">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-soil">
                  {tr("Phụ trách chính", "Main responsibilities")}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {activeMember.responsibilities.map((responsibility, i) => (
                    <div
                      key={responsibility}
                      className="border-t-2 border-leaf pt-3 text-[13.5px] font-semibold leading-[1.5] text-ink"
                    >
                      {tr(
                        responsibility,
                        activeMember.responsibilitiesEn?.[i] ?? responsibility,
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </article>
      </div>
    </NotebookSection>
  );
}
