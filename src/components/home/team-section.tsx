"use client";

import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { teamMembers } from "@/data/mock/team";
import { cn } from "@/lib/utils";

const portraitStyles: Record<string, string> = {
  "pham-tuan-minh": "scale-[1.12]",
  "pham-duc-manh": "scale-[1.1]",
  "le-hoang-son": "scale-[1.02]",
  "nguyen-thi-thu-trang": "scale-[1.06]",
  "dinh-my-uyen": "scale-[1.05]",
};

const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";
const MEMBER_SCROLL_DISTANCE_SVH = 88;

export function TeamSection() {
  const storyRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [isDesktop, setIsDesktop] = useState(false);
  const [activeMemberId, setActiveMemberId] = useState(teamMembers[0].id);
  const activeMember = teamMembers.find((member) => member.id === activeMemberId) ?? teamMembers[0];
  const storyEnabled = isDesktop && !reduceMotion;
  const { scrollYProgress } = useScroll({
    target: storyRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const updateDesktopState = () => setIsDesktop(mediaQuery.matches);

    updateDesktopState();
    mediaQuery.addEventListener("change", updateDesktopState);
    return () => mediaQuery.removeEventListener("change", updateDesktopState);
  }, []);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (!storyEnabled) return;

    const nextIndex = Math.min(
      teamMembers.length - 1,
      Math.floor(latest * teamMembers.length),
    );
    const nextMemberId = teamMembers[nextIndex].id;
    setActiveMemberId((currentId) => currentId === nextMemberId ? currentId : nextMemberId);
  });

  const selectMember = (memberId: string, memberIndex: number) => {
    const story = storyRef.current;
    if (!storyEnabled || !story) {
      setActiveMemberId(memberId);
      return;
    }

    const storyTop = window.scrollY + story.getBoundingClientRect().top;
    const scrollableDistance = Math.max(0, story.offsetHeight - window.innerHeight);
    const memberProgress = (memberIndex + 0.38) / teamMembers.length;

    window.scrollTo({
      top: storyTop + scrollableDistance * memberProgress,
      behavior: "smooth",
    });
  };

  return (
    <section
      id="thanh-vien"
      aria-labelledby="team-heading"
      className="scroll-mt-24 bg-surface px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
    >
      <div className="mx-auto max-w-7xl">
        <header className="max-w-3xl">
          <h2
            id="team-heading"
            className="font-display text-3xl font-extrabold tracking-[-0.04em] text-ink sm:text-4xl lg:text-[44px] lg:leading-[1.12]"
          >
            Đội ngũ dự án
          </h2>
          <p className="mt-4 max-w-[64ch] text-base leading-7 text-ink-soft sm:text-lg sm:leading-8">
            Khảo sát, công nghệ, website, kiểm thử và truyền thông cùng hướng về một trải nghiệm dễ dùng cho người Việt Nam.
          </p>
        </header>

        <div
          ref={storyRef}
          className={cn("mt-10", storyEnabled && "relative")}
          style={storyEnabled ? {
            height: `calc(100svh + ${teamMembers.length * MEMBER_SCROLL_DISTANCE_SVH}svh)`,
          } : undefined}
        >
          <div
            className={cn(
              storyEnabled && "sticky top-20 flex h-[calc(100svh-5rem)] items-center overflow-hidden py-4",
            )}
          >
            <div className="grid w-full items-stretch gap-5 lg:grid-cols-[292px_minmax(0,1fr)] lg:gap-6">
              <div
                className="team-roster-scroll grid snap-x snap-mandatory grid-flow-col grid-cols-none gap-2 overflow-x-auto pb-2 lg:grid-flow-row lg:grid-cols-1 lg:overflow-visible lg:pb-0"
                aria-label="Chọn thành viên dự án"
              >
                {teamMembers.map((member, memberIndex) => {
                  const active = member.id === activeMember.id;

                  return (
                    <button
                      key={member.id}
                      type="button"
                      aria-pressed={active}
                      aria-controls="team-member-spotlight"
                      onClick={() => selectMember(member.id, memberIndex)}
                      className={cn(
                        "group min-h-[96px] w-[232px] snap-start rounded-[var(--r-lg)] border px-5 py-4 text-left transition duration-260 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/45 focus-visible:ring-offset-2 focus-visible:ring-offset-surface lg:w-full",
                        active
                          ? "border-leaf bg-leaf text-on-leaf shadow-md"
                          : "border-line bg-surface-raised text-ink shadow-sm hover:-translate-y-0.5 hover:border-line-strong hover:bg-surface-soft hover:shadow-md",
                      )}
                    >
                      <span
                        className={cn(
                          "block text-xs font-semibold leading-5",
                          active ? "text-on-leaf/80" : "text-leaf-strong",
                        )}
                      >
                        {member.role}
                      </span>
                      <span className="mt-1 block font-display text-lg font-extrabold leading-6 tracking-[-0.025em]">
                        {member.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <article
                id="team-member-spotlight"
                aria-live="polite"
                className="grid min-h-[520px] overflow-hidden rounded-[var(--r-2xl)] border border-line-strong bg-surface-raised shadow-lg md:grid-cols-[0.9fr_1.1fr]"
              >
                <div className="living-veins relative min-h-[320px] overflow-hidden bg-forest sm:min-h-[380px] md:min-h-full">
                  <AnimatePresence initial={false} mode="wait">
                    <motion.div
                      key={activeMember.id}
                      className="absolute inset-0"
                      initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.985 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={reduceMotion ? undefined : { opacity: 0, y: -12, scale: 0.992 }}
                      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Image
                        src={activeMember.avatar}
                        alt={activeMember.name}
                        fill
                        sizes="(min-width: 1024px) 34vw, (min-width: 768px) 44vw, 100vw"
                        className={cn(
                          "origin-bottom object-contain object-bottom px-6 pt-8 sm:px-10 md:px-6 lg:px-10",
                          portraitStyles[activeMember.id],
                        )}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>

                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    key={activeMember.id}
                    className="flex min-h-0 flex-col p-6 sm:p-8 lg:p-10"
                    initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
                    transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <p className="text-sm font-semibold leading-6 text-leaf-strong">{activeMember.role}</p>
                    <h3 className="mt-3 max-w-xl font-display text-3xl font-extrabold tracking-[-0.04em] text-ink sm:text-4xl">
                      {activeMember.name}
                    </h3>
                    <p className="mt-5 max-w-[54ch] text-base leading-8 text-ink-soft">
                      {activeMember.description}
                    </p>

                    <div className="mt-auto pt-9">
                      <p className="text-sm font-semibold text-ink">Phụ trách chính</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        {activeMember.responsibilities.map((responsibility) => (
                          <div
                            key={responsibility}
                            className="border-t-2 border-leaf pt-3 text-sm font-semibold leading-6 text-ink"
                          >
                            {responsibility}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </article>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
