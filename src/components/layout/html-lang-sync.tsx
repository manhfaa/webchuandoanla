"use client";

import { useEffect } from "react";

import { useLanguageStore } from "@/store/language-store";

/**
 * Keeps <html lang> in sync with the language toggle. Without this, English
 * content stays declared as Vietnamese, so screen readers announce it with a
 * Vietnamese voice (WCAG 3.1.1 Language of Page).
 */
export function HtmlLangSync() {
  const language = useLanguageStore((state) => state.language);

  useEffect(() => {
    document.documentElement.lang = language === "en" ? "en" : "vi";
  }, [language]);

  return null;
}
