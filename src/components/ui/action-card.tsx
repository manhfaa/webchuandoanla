import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

export interface ActionCardProps {
  title: string;
  priority: "high" | "medium" | "low";
  time?: string;
  onClick?: () => void;
  className?: string;
}

export function ActionCard({ title, priority, time, onClick, className }: ActionCardProps) {
  const priorityConfig = {
    high: {
      borderColor: "border-danger/30",
      iconColor: "text-danger",
      Icon: AlertCircle,
    },
    medium: {
      borderColor: "border-sun/40",
      iconColor: "text-sun",
      Icon: Clock,
    },
    low: {
      borderColor: "border-line",
      iconColor: "text-leaf",
      Icon: CheckCircle2,
    },
  }[priority];

  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl border bg-surface p-4 text-left shadow-sm transition-all duration-180",
        priorityConfig.borderColor,
        onClick && "hover:-translate-y-1 hover:shadow-md cursor-pointer hover:bg-surface-soft",
        className
      )}
    >
      <priorityConfig.Icon className={cn("mt-0.5 h-5 w-5 shrink-0", priorityConfig.iconColor)} />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-ink">{title}</span>
        {time ? <span className="mt-1 text-xs text-ink-soft">{time}</span> : null}
      </div>
    </Component>
  );
}
