import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const cardVariants = cva("border transition duration-150 ease-out", {
  variants: {
    variant: {
      light: "rounded-lg border-border-light bg-white text-ink-900 shadow-sm",
      dark: "rounded-lg border-border-dark bg-app-surface text-on-dark shadow-sm",
      darkNested: "rounded-md border-border-dark bg-app-surface-2 text-on-dark shadow-sm",
    },
    padding: {
      none: "p-0",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    },
    interactive: {
      true: "hover:-translate-y-px hover:shadow-md",
      false: "",
    },
    glow: {
      true: "ring-1 ring-leaf-400/25 shadow-md",
      false: "",
    },
  },
  defaultVariants: {
    variant: "light",
    padding: "md",
    interactive: false,
    glow: false,
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({
  className,
  variant,
  padding,
  interactive,
  glow,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(cardVariants({ variant, padding, interactive, glow, className }))}
      {...props}
    />
  );
}

export { cardVariants };
