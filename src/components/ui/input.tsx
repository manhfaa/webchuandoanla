import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className, id: idProp, ...props }, ref) => {
    const genId = `input-${Math.random().toString(36).slice(2, 7)}`;
    const id = idProp ?? genId;

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={id} className="text-sm font-medium text-[--text-default]">
            {label}
          </label>
        ) : null}
        <div className="relative">
          {icon ? (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[--text-muted]">
              {icon}
            </div>
          ) : null}
          <input
            ref={ref}
            id={id}
            className={cn(
              "h-11 w-full rounded-[--r-md] px-3.5",
              "bg-[--bg-surface]",
              "border",
              error ? "border-berry-500 focus:shadow-[0_0_0_3px_rgba(216,86,86,0.25)]" : "border-[--border-primary]",
              "text-[15px] text-[--text-default]",
              "placeholder:text-[--text-hint]",
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
        {hint && !error ? <p className="text-xs text-[--text-muted]">{hint}</p> : null}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
export type { InputProps };
