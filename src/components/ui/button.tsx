import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition duration-180 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-strong/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-70 active:scale-[0.98] active:duration-80",
  {
    variants: {
      variant: {
        primary:
          "bg-leaf text-on-leaf shadow-sm hover:bg-leaf-strong hover:shadow-md",
        secondary:
          "border border-line bg-surface text-ink shadow-sm hover:bg-surface-soft",
        secondaryOnLight:
          "border border-line bg-surface-soft text-ink shadow-sm hover:bg-surface",
        tertiary:
          "bg-transparent text-ink-soft hover:bg-surface-soft hover:text-ink",
        ghost: "bg-transparent text-ink hover:bg-surface-soft",
        ghostOnDark: "bg-transparent text-ink hover:bg-surface-soft",
        outline:
          "border border-line bg-transparent text-ink hover:bg-surface-soft",
        dark: "bg-forest text-on-forest shadow-sm hover:opacity-90",
        danger: "bg-danger text-on-danger shadow-sm hover:brightness-110",
      },
      size: {
        sm: "h-9 rounded-md px-4 text-body-sm",
        md: "h-11 rounded-md px-5 text-body",
        lg: "h-12 rounded-lg px-6 text-body-lg",
        icon: "h-11 w-11 shrink-0 rounded-md p-0",
        iconSm: "h-9 w-9 shrink-0 rounded-md p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
  };

export { buttonVariants };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {loading ? (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden
          />
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
