import * as React from "react";

import { cn } from "@/lib/utils";

export type CardVariant = "default" | "soft" | "raised" | "dark" | "warning" | "light" | "darkNested";
export type CardPadding = "none" | "sm" | "md" | "lg";

const variantClass: Record<CardVariant, string> = {
  default: "bg-surface border border-line",
  soft: "bg-surface-soft border border-transparent",
  raised: "bg-surface-raised border border-line shadow-lg",
  dark: "bg-forest border border-transparent text-on-forest",
  warning: "bg-sun-soft border border-sun/30 text-ink",
  light: "bg-surface-raised border border-line text-ink",
  darkNested: "bg-surface-soft border border-line text-ink",
};

const paddingClass: Record<CardPadding, string> = {
  none: "p-0",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
}

export function SurfaceCard({
  variant = "default",
  padding = "md",
  interactive = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg transition duration-180 ease-out",
        variantClass[variant],
        paddingClass[padding],
        interactive && "cursor-pointer hover:-translate-y-1 hover:border-line-strong hover:shadow-md",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Export as Card for backward compatibility while renaming to SurfaceCard
export const Card = SurfaceCard;
export const cardVariants = variantClass;
