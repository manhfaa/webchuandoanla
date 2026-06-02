import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "dark" | "light";
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className, id: idProp, tone = "dark", ...props }, ref) => {
    const genId = `input-${Math.random().toString(36).slice(2, 7)}`;
    const id = idProp ?? genId;
    const isLight = tone === "light";

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={id} className={cn("text-sm font-medium", isLight ? "text-ink-800" : "text-[--text-default]")}>
            {label}
          </label>
        ) : null}
        <div className="relative">
          {icon ? (
            <div className={cn("pointer-events-none absolute left-3 top-1/2 -translate-y-1/2", isLight ? "text-ink-400" : "text-[--text-muted]")}>
              {icon}
            </div>
          ) : null}
          <input
            ref={ref}
            id={id}
            className={cn(
              "h-11 w-full rounded-[--r-md] px-3.5",
              isLight ? "bg-white" : "bg-[--bg-surface]",
              "border",
              error
                ? "border-berry-500 focus:shadow-[0_0_0_3px_rgba(216,86,86,0.25)]"
                : isLight
                  ? "border-ink-200"
                  : "border-[--border-primary]",
              "text-[15px]",
              isLight ? "text-ink-950" : "text-[--text-default]",
              isLight ? "placeholder:text-ink-400" : "placeholder:text-[--text-hint]",
              isLight
                ? "[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#ffffff] [&:-webkit-autofill]:[-webkit-text-fill-color:#0C1410]"
                : "[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_var(--bg-surface)] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--text-default)]",
              "outline-none transition-all duration-[--d-fast]",
              "focus:border-leaf-500 focus:shadow-[--shadow-focus]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              icon ? "pl-10" : "",
              className,
            )}
            {...props}
          />
        </div>
        {error ? <p className="text-xs text-berry-500">{error}</p> : null}
        {hint && !error ? <p className={cn("text-xs", isLight ? "text-ink-500" : "text-[--text-muted]")}>{hint}</p> : null}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
export type { InputProps };
