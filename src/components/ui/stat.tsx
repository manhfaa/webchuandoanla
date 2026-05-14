import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  helper,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  helper?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-[120px] flex-col rounded-lg border border-border-dark bg-app-surface p-4 text-on-dark shadow-sm transition duration-150 ease-out",
        className,
      )}
    >
      {Icon ? (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-leaf-500/15 text-leaf-300">
          <Icon strokeWidth={1.75} className="h-5 w-5" aria-hidden />
        </span>
      ) : null}
      <div className="mt-auto min-h-0">
        <p className="font-display text-[32px] font-semibold leading-none tracking-tight text-on-dark">
          {value}
        </p>
        <p className="mt-1 text-body-sm text-muted-on-dark">{label}</p>
        {helper ? (
          <p className="mt-0.5 line-clamp-2 text-caption text-muted-on-dark/90">{helper}</p>
        ) : null}
      </div>
    </div>
  );
}
