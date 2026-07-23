"use client";

import { useEffect, useRef } from "react";

function LeafGlyph({ className, opacity = 1 }: { className?: string; opacity?: number }) {
  return (
    <svg viewBox="0 0 100 130" className={className} style={{ opacity }} fill="none" aria-hidden="true">
      <path
        d="M50 6 C24 18 8 46 8 74 C8 102 26 120 50 124 C74 120 92 102 92 74 C92 46 76 18 50 6 Z"
        fill="currentColor"
      />
      <path
        d="M50 18 L50 112 M50 40 L30 54 M50 58 L70 72 M50 78 L32 92"
        stroke="var(--canvas)"
        strokeOpacity="0.35"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Decorative leaf motif + ambient sunlight for the hero. Purely visual: aria-hidden,
 * pointer-events-none, clipped by the hero's own overflow-hidden so it can never
 * cause horizontal scroll or cover interactive content.
 */
export function LeafFieldBackground() {
  const bigLeafRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bigLeafRef.current;
    const section = el?.closest("section");
    if (!el || !section) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (reduceMotion || !canHover) return;

    const sectionEl = section as HTMLElement;
    let frame = 0;
    const handlePointerMove = (event: PointerEvent) => {
      const rect = sectionEl.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty("--leaf-tilt-x", `${(py * -3).toFixed(2)}deg`);
        el.style.setProperty("--leaf-tilt-y", `${(px * 3).toFixed(2)}deg`);
        sectionEl.style.setProperty("--mockup-shift-x", `${(px * 6).toFixed(2)}px`);
        sectionEl.style.setProperty("--mockup-shift-y", `${(py * 6).toFixed(2)}px`);
      });
    };
    const resetTilt = () => {
      el.style.setProperty("--leaf-tilt-x", "0deg");
      el.style.setProperty("--leaf-tilt-y", "0deg");
      sectionEl.style.setProperty("--mockup-shift-x", "0px");
      sectionEl.style.setProperty("--mockup-shift-y", "0px");
    };

    section.addEventListener("pointermove", handlePointerMove);
    section.addEventListener("pointerleave", resetTilt);
    return () => {
      cancelAnimationFrame(frame);
      section.removeEventListener("pointermove", handlePointerMove);
      section.removeEventListener("pointerleave", resetTilt);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div
        className="absolute -top-[18%] right-[-8%] h-[65%] w-[52%] rounded-full opacity-[0.16] blur-3xl"
        style={{ background: "radial-gradient(circle, var(--sun) 0%, transparent 70%)" }}
      />

      <div
        ref={bigLeafRef}
        className="fl-leaf-open absolute right-[-8%] top-[6%] h-[58%] w-[42%] max-w-[520px] text-leaf"
        style={{
          transform: "perspective(900px) rotateX(var(--leaf-tilt-x, 0deg)) rotateY(var(--leaf-tilt-y, 0deg))",
          transition: "transform 320ms var(--ease-out)",
        }}
      >
        <LeafGlyph className="h-full w-full" opacity={0.18} />
      </div>

      <div className="fl-leaf-fade absolute left-[-5%] top-[14%] h-24 w-24 text-mint sm:h-32 sm:w-32">
        <LeafGlyph className="h-full w-full -rotate-[18deg]" opacity={0.22} />
      </div>

      <div className="fl-leaf-fade absolute bottom-[8%] left-[7%] h-16 w-16 text-forest sm:h-20 sm:w-20" style={{ animationDelay: "160ms" }}>
        <LeafGlyph className="h-full w-full rotate-[22deg]" opacity={0.16} />
      </div>

      <svg className="absolute bottom-0 left-1/2 hidden h-16 w-2 -translate-x-1/2 opacity-40 lg:block" viewBox="0 0 8 64" aria-hidden="true">
        <path d="M4 0 L4 64" stroke="var(--leaf)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}
