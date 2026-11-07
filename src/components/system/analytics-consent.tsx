"use client";

import { useEffect, useState } from "react";

import { GoogleAnalytics } from "@/components/system/google-analytics";
import { useTr } from "@/lib/use-tr";

const STORAGE_KEY = "agromind-analytics-consent-v1";
const DISMISSED_KEY = "agromind-privacy-shortcut-dismissed-v1";
export const OPEN_ANALYTICS_SETTINGS_EVENT = "agromind:open-analytics-settings";
type Choice = "accepted" | "rejected" | null;

export function AnalyticsConsent() {
  const tr = useTr();
  const [choice, setChoice] = useState<Choice>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [shortcutDismissed, setShortcutDismissed] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as { choice?: string } | null;
      if (saved?.choice === "accepted" || saved?.choice === "rejected") setChoice(saved.choice);
      setShortcutDismissed(localStorage.getItem(DISMISSED_KEY) === "true");
    } catch {
      // Invalid or unavailable storage must never enable analytics.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    const openSettings = () => setOpen(true);
    window.addEventListener(OPEN_ANALYTICS_SETTINGS_EVENT, openSettings);
    return () => window.removeEventListener(OPEN_ANALYTICS_SETTINGS_EVENT, openSettings);
  }, []);

  function openFromShortcut() {
    setShortcutDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // Settings remain available in the footer if storage is unavailable.
    }
    setOpen(true);
  }

  function choose(next: Exclude<Choice, null>) {
    const wasEnabled = choice === "accepted";
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice: next, decidedAt: new Date().toISOString() }));
    } catch {
      // Without durable consent, do not load the analytics script.
      setChoice("rejected");
      setOpen(false);
      return;
    }
    setChoice(next);
    setOpen(false);
    // Unmounting a Script does not unload JavaScript already executed in this page.
    if (wasEnabled && next === "rejected") window.location.reload();
  }

  return (
    <>
      {ready && choice === "accepted" ? <GoogleAnalytics /> : null}
      {ready && choice !== null && !open && !shortcutDismissed ? (
        <button
          type="button"
          onClick={openFromShortcut}
          className="fixed bottom-3 left-3 z-[90] min-h-11 rounded-full border border-line bg-surface px-4 text-xs font-semibold text-ink shadow-lg hover:bg-surface-soft"
        >
          {tr("Cài đặt riêng tư", "Privacy settings")}
        </button>
      ) : null}
      {ready && (choice === null || open) ? (
        <section
          role="dialog"
          aria-modal="false"
          aria-label={tr("Lựa chọn phân tích", "Analytics choice")}
          className="fixed inset-x-3 bottom-3 z-[91] mx-auto max-w-xl rounded-[var(--r-lg)] border border-line bg-surface p-5 text-ink shadow-2xl sm:bottom-6 sm:p-6"
        >
          <h2 className="font-display text-lg font-bold">{tr("Quyền riêng tư của bạn", "Your privacy")}</h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            {tr(
              "Chúng tôi chỉ tải Google Analytics nếu bạn đồng ý. Từ chối không ảnh hưởng đến việc sử dụng Agromind AI. Bạn có thể đổi lựa chọn bất cứ lúc nào.",
              "We only load Google Analytics if you agree. Declining does not affect your use of Agromind AI. You can change your choice at any time.",
            )}
          </p>
          <a href="/privacy" className="mt-2 inline-block text-sm font-semibold text-leaf-strong underline underline-offset-2">
            {tr("Đọc chính sách quyền riêng tư", "Read the privacy policy")}
          </a>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => choose("rejected")} className="min-h-11 rounded-full border border-line px-5 text-sm font-semibold hover:bg-surface-soft">
              {tr("Từ chối phân tích", "Decline analytics")}
            </button>
            <button type="button" onClick={() => choose("accepted")} className="min-h-11 rounded-full bg-leaf px-5 text-sm font-semibold text-on-leaf hover:opacity-90">
              {tr("Đồng ý phân tích", "Allow analytics")}
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}
