import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-60 active:scale-[0.98] active:duration-80 dark:focus-visible:ring-offset-app",
  {
    variants: {
      variant: {
        primary:
          "bg-leaf-500 text-white shadow-sm hover:-translate-y-px hover:bg-leaf-600 hover:shadow-md",
        secondary:
          "border border-white/12 bg-white/8 text-on-dark shadow-sm hover:bg-white/10 dark:border-white/12",
        secondaryOnLight:
          "border border-border-light bg-leaf-50 text-ink-900 shadow-sm hover:bg-leaf-100",
        ghost: "bg-transparent text-ink-700 hover:bg-ink-100/90",
        ghostOnDark: "bg-transparent text-on-dark hover:bg-white/5",
        outline:
          "border border-white/12 bg-transparent text-on-dark hover:bg-white/8 dark:text-on-dark",
        dark: "bg-ink-900 text-white shadow-sm hover:bg-leaf-950",
      },
      size: {
        sm: "h-8 rounded-md px-4 text-body-sm",
        md: "h-10 rounded-md px-5 text-body",
        lg: "h-12 rounded-md px-6 text-body-lg",
        icon: "h-10 w-10 shrink-0 rounded-md p-0",
        iconSm: "h-8 w-8 shrink-0 rounded-md p-0",
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
