"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Đếm chạy từ 0 tới giá trị số trong chuỗi (vd "12", "85%").
 * Chuỗi không bắt đầu bằng số sẽ hiển thị nguyên trạng.
 * Tôn trọng prefers-reduced-motion.
 */
export function CountUp({ value, duration = 800 }: { value: string; duration?: number }) {
  const match = value.match(/^(\d+)(.*)$/);
  const target = match ? Number(match[1]) : null;
  const suffix = match ? match[2] : "";
  const [display, setDisplay] = useState(target === null || target === 0 ? value : `0${suffix}`);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === null) {
      setDisplay(value);
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || target === 0) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(`${Math.round(target * eased)}${suffix}`);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [value, target, suffix, duration]);

  return <span>{display}</span>;
}
