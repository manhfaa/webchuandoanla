import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  suffix?: ReactNode;
  tone?: "dark" | "light"; // kept for backward compatibility, ignored
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, suffix, className, id: idProp, tone, ...props }, ref) => {
    const generatedId = useId();
    const genId = `input-${generatedId.replace(/:/g, "")}`;
    const id = idProp ?? genId;

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={id} className="text-sm font-medium text-ink">
            {label}
          </label>
        ) : null}
        <div className="relative">
          {icon ? (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft">
              {icon}
            </div>
          ) : null}
          {suffix ? (
            <div className="absolute right-1 top-1/2 -translate-y-1/2">{suffix}</div>
          ) : null}
          <input
            ref={ref}
            id={id}
            className={cn(
              "h-11 w-full rounded-md px-3.5",
              "bg-surface",
              "border",
              error
                ? "border-danger focus:ring-2 focus:ring-danger/25"
                : "border-line",
              "text-[15px]",
              "text-ink",
              "placeholder:text-ink-soft",
              "[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_var(--canvas)] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--ink)]",
              "outline-none transition-all duration-180",
              "focus:border-leaf focus:shadow-focus",
              "disabled:cursor-not-allowed disabled:opacity-50",
              icon ? "pl-10" : "",
              suffix ? "pr-12" : "",
              className,
            )}
            {...props}
          />
        </div>
        {error ? <p className="text-xs text-danger">{error}</p> : null}
        {hint && !error ? <p className="text-xs text-ink-soft">{hint}</p> : null}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
export type { InputProps };
