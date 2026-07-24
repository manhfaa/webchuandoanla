"use client";

import { useLanguageStore } from "@/store/language-store";

/**
 * Inline bilingual helper: `const tr = useTr(); tr("Tiếng Việt", "English")`.
 * Reads the active language from the persisted store. Because the store
 * defaults to "vi", server and first client render agree (no hydration
 * mismatch); the persisted choice re-applies after rehydration.
 */
export function useTr() {
  const language = useLanguageStore((state) => state.language);
  return (vi: string, en: string) => (language === "en" ? en : vi);
}
