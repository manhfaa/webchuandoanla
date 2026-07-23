import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Clock, Info, ShieldAlert } from "lucide-react";

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted"
  | "elite"
  | "brand"
  | "locked"
  | "dark"
  | "status"
  | "dot";

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-success-soft text-success-ink",
  success: "bg-success-soft text-success-ink",
  warning: "bg-sun-soft text-warning-ink",
  danger: "bg-danger-soft text-danger-ink",
  info: "bg-info-soft text-info-ink",
  muted: "bg-surface-soft text-ink-soft border border-line",
  elite: "bg-sun-soft text-warning-ink",
  brand: "bg-success-soft text-success-ink",
  locked: "bg-surface-soft text-ink-soft border border-line",
  dark: "bg-surface-soft text-ink-soft border border-line",
  status: "bg-surface-soft text-ink-soft border border-line",
  dot: "bg-surface-soft text-ink-soft border border-line",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ children, variant = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
        "text-xs font-medium leading-none",
        "[text-decoration:none!important] no-underline",
        variantStyles[variant],
        className,
      )}
      style={{ textDecoration: "none" }}
      {...props}
    >
      {children}
    </span>
  );
}

export type StatusBadgeState = "healthy" | "watch" | "urgent" | "neutral" | "processing";

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: StatusBadgeState;
  label: string;
  className?: string;
}) {
  const config = {
    healthy: {
      color: "bg-success-soft text-success-ink",
      icon: CheckCircle2,
    },
    watch: {
      color: "bg-sun-soft text-warning-ink",
      icon: AlertCircle,
    },
    urgent: {
      color: "bg-danger-soft text-danger-ink",
      icon: ShieldAlert,
    },
    neutral: {
      color: "bg-surface-soft text-ink-soft border border-line",
      icon: Info,
    },
    processing: {
      color: "bg-info-soft text-info-ink",
      icon: Clock,
    },
  }[status];

  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium leading-none",
        config.color,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

export const badgeVariants = variantStyles;
