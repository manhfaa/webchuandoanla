"use client";

import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: string;
}

export function Tabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-full border border-line bg-surface-soft p-1",
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition",
              active
                ? "bg-surface text-ink shadow-sm"
                : "text-ink-soft hover:text-ink",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
