"use client";

import { useLanguageStore } from "@/store/language-store";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguageStore();
  const isEn = language === "en";

  return (
    <div
      role="group"
      aria-label="Ngôn ngữ / Language"
      className={cn(
        "relative inline-flex h-9 select-none items-center rounded-full border border-line bg-surface-soft p-0.5",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-leaf shadow-sm transition-transform duration-260 ease-out motion-reduce:transition-none",
          isEn && "translate-x-full",
        )}
      />
      <button
        type="button"
        onClick={() => setLanguage("vi")}
        aria-pressed={!isEn}
        className={cn(
          "relative z-10 h-8 w-9 rounded-full text-[12px] font-bold transition-colors duration-180",
          !isEn ? "text-on-leaf" : "text-ink-soft hover:text-ink",
        )}
      >
        VI
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        aria-pressed={isEn}
        className={cn(
          "relative z-10 h-8 w-9 rounded-full text-[12px] font-bold transition-colors duration-180",
          isEn ? "text-on-leaf" : "text-ink-soft hover:text-ink",
        )}
      >
        EN
      </button>
    </div>
  );
}
