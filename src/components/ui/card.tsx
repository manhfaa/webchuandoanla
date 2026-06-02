import * as React from "react";

import { cn } from "@/lib/utils";

type CardVariant = "default" | "light" | "dark" | "darkNested";
type CardPadding = "none" | "sm" | "md" | "lg";

const variantClass: Record<CardVariant, string> = {
  default:    "bg-[--bg-surface] border-[--border]",
  dark:       "bg-[--bg-surface] border-[--border]",
  darkNested: "bg-[--bg-surface-2] border-[--border]",
  light:      "bg-white border-[--border-light] text-[--ink-900]",
};

const paddingClass: Record<CardPadding, string> = {
  none: "p-0",
  sm:   "p-4",
  md:   "p-5",
  lg:   "p-6",
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
  glow?: boolean;
}

export function Card({
  variant = "default",
  padding = "md",
  interactive = false,
  glow = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[--r-lg] border transition duration-150 ease-out",
        variantClass[variant],
        paddingClass[padding],
        interactive && "hover:-translate-y-px hover:shadow-md cursor-pointer",
        glow && "ring-1 ring-leaf-400/25 shadow-md",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* Nested / secondary card — always bg-surface-2 */
export function CardNested({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[--r-md] border border-[--border] p-4",
        "bg-[--bg-surface-2]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export const cardVariants = variantClass;
