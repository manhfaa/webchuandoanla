import type { LucideIcon } from "lucide-react";

import { CountUp } from "@/components/ui/count-up";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  helper?: string;
  icon?: LucideIcon;
  tone?: "default" | "brand" | "warning";
  className?: string;
}) {
  const toneClasses = {
    default: {
      card: "border-line bg-surface",
      label: "text-ink-soft",
      value: "text-ink",
      helper: "text-ink-soft",
      icon: "bg-surface-soft text-leaf-strong",
    },
    brand: {
      card: "border-transparent bg-forest",
      label: "text-on-forest-muted",
      value: "text-on-forest",
      helper: "text-on-forest-muted",
      icon: "bg-on-forest/10 text-on-forest",
    },
    warning: {
      card: "border-sun/30 bg-sun-soft",
      label: "text-ink-soft",
      value: "text-ink",
      helper: "text-ink-soft",
      icon: "bg-sun-soft text-warning-ink",
    },
  }[tone];

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border p-5 shadow-sm transition duration-180 ease-out",
        toneClasses.card,
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className={cn("text-body-sm font-semibold", toneClasses.label)}>{label}</p>
        {Icon ? (
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", toneClasses.icon)}>
            <Icon strokeWidth={2} className="h-4 w-4" aria-hidden />
          </span>
        ) : null}
      </div>
      <div>
        <p className={cn("font-display text-[36px] font-bold leading-none tracking-[-0.035em]", toneClasses.value)}>
          <CountUp value={value} />
        </p>
        {helper ? (
          <p className={cn("mt-2 line-clamp-2 text-xs font-medium", toneClasses.helper)}>{helper}</p>
        ) : null}
      </div>
    </div>
  );
}

export const Stat = MetricCard;
