"use client";

import { useTr } from "@/lib/use-tr";

export function SkipLink() {
  const tr = useTr();
  return (
    <a
      href="#main-content"
      className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-md bg-leaf px-4 py-2 text-sm font-medium text-on-leaf opacity-0 shadow-lg transition duration-200 focus-visible:translate-y-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
    >
      {tr("Bỏ qua đến nội dung chính", "Skip to main content")}
    </a>
  );
}
