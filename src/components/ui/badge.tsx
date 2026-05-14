import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-medium leading-none no-underline [text-decoration:none]",
  {
    variants: {
      variant: {
        brand: "bg-leaf-100 text-leaf-800",
        muted: "bg-ink-100 text-ink-700",
        success: "bg-leaf-100 text-leaf-800",
        warning: "bg-leaf-200 text-leaf-900",
        locked: "bg-white/10 text-on-dark ring-1 ring-inset ring-white/15",
        dark: "bg-leaf-950/80 text-on-dark ring-1 ring-inset ring-border-dark",
        status: "h-[22px] px-2.5 text-overline tracking-normal normal-case",
        dot: "h-[22px] px-2.5 text-overline tracking-normal normal-case before:inline-block before:h-1.5 before:w-1.5 before:rounded-full before:bg-current before:opacity-90",
      },
    },
    defaultVariants: {
      variant: "brand",
    },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ children, variant, className, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  );
}

export { badgeVariants };
