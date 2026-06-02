import * as React from "react";

import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "info"
  | "muted"
  | "elite"
  /* legacy aliases kept for backward-compat */
  | "brand"
  | "locked"
  | "dark"
  | "status"
  | "dot";

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-leaf-100 text-leaf-800",
  success: "bg-leaf-100 text-leaf-700",
  warning: "bg-sun-400/20 text-sun-600",
  info:    "bg-blue-100 text-blue-800",
  muted:   "bg-[--bg-surface-2] text-[--text-muted] border border-[--border]",
  elite:   "bg-earth-300/20 text-earth-300",
  /* legacy aliases */
  brand:   "bg-leaf-100 text-leaf-800",
  locked:  "bg-[--bg-surface-2] text-[--text-muted] border border-[--border]",
  dark:    "bg-[--bg-surface-2] text-[--text-muted] border border-[--border]",
  status:  "bg-[--bg-surface-2] text-[--text-muted] border border-[--border]",
  dot:     "bg-[--bg-surface-2] text-[--text-muted] border border-[--border]",
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

/* Keep named export for imports that use { badgeVariants } */
export const badgeVariants = variantStyles;
