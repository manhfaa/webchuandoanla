"use client";

import { Languages } from "lucide-react";

import { t } from "@/lib/i18n";
import { useLanguageStore } from "@/store/language-store";

export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguageStore();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface-soft px-3 text-body-sm font-semibold text-ink transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40"
      aria-label="Đổi ngôn ngữ"
    >
      <Languages className="h-4 w-4" />
      {t(language, "language.toggle")}
    </button>
  );
}
