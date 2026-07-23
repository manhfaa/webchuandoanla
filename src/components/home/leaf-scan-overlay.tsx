"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const MARKERS = [
  { top: "40%", left: "36%", tone: "bg-mint", delay: "0.4s" },
  { top: "58%", left: "60%", tone: "bg-leaf", delay: "2.1s" },
  { top: "72%", left: "48%", tone: "bg-sun", delay: "3.6s" },
];

/**
 * Ambient AI-scan layer for the hero mockup. Intentionally independent from
 * LeafLens's own GSAP hover-inspection system: it never touches those DOM
 * nodes, so it can't fight or desync with that timeline.
 */
export function LeafScanOverlay({ className }: { className?: string }) {
  const [ready, setReady] = useState<"loop" | "static" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => setReady(mediaQuery.matches ? "static" : "loop");

    syncMotionPreference();
    mediaQuery.addEventListener("change", syncMotionPreference);
    return () => mediaQuery.removeEventListener("change", syncMotionPreference);
  }, []);

  useEffect(() => {
    if (ready !== "loop") return;
    const root = rootRef.current;
    if (!root) return;

    let isInViewport = true;
    const syncPlayState = () => {
      const state = document.hidden || !isInViewport ? "paused" : "running";
      root.querySelectorAll<HTMLElement>("[data-scan-anim]").forEach((node) => {
        node.style.animationPlayState = state;
      });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isInViewport = entry.isIntersecting;
        syncPlayState();
      },
      { rootMargin: "100px 0px", threshold: 0.01 },
    );

    observer.observe(root);
    syncPlayState();
    document.addEventListener("visibilitychange", syncPlayState);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncPlayState);
    };
  }, [ready]);

  if (!ready) return null;

  if (ready === "static") {
    return (
      <div className={cn("pointer-events-none absolute inset-0 z-[5]", className)} aria-hidden="true">
        {MARKERS.map((marker) => (
          <span
            key={marker.top + marker.left}
            className={cn("absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70", marker.tone)}
            style={{ top: marker.top, left: marker.left }}
          />
        ))}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={cn("pointer-events-none absolute inset-0 z-[5] overflow-hidden", className)} aria-hidden="true">
      <span data-scan-anim className="fl-ai-scan" />
      {MARKERS.map((marker) => (
        <span
          key={marker.top + marker.left}
          data-scan-anim
          className={cn("fl-ai-marker absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full", marker.tone)}
          style={{ top: marker.top, left: marker.left, animationDelay: marker.delay }}
        />
      ))}
    </div>
  );
}
