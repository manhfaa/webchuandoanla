import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const chipVariants = cva(
  "inline-flex h-8 max-w-full items-center rounded-full px-3 text-caption font-medium no-underline [text-decoration:none!important] transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500/40",
  {
    variants: {
      tone: {
        default: "bg-leaf-100 text-leaf-700",
        muted: "border border-border-dark bg-white/5 text-muted-on-dark",
        dark: "border border-border-dark bg-app-surface-2 text-on-dark hover:bg-white/5",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  },
);

export type ChipProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof chipVariants>;

export function Chip({ className, tone, ...props }: ChipProps) {
  return <span className={cn(chipVariants({ tone }), className)} {...props} />;
}

export { chipVariants };
