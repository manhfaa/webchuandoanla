import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, id: idProp, ...props }, ref) => {
    const genId = React.useId();
    const id = idProp ?? genId;

    return (
      <div className="block space-y-1.5">
        {label ? (
          <label htmlFor={id} className="text-body-sm font-medium text-ink-700 dark:text-muted-on-dark">
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={id}
          className={cn(
            "h-11 w-full rounded-[10px] border border-ink-300/40 bg-white px-3.5 py-3 text-body text-ink-900 shadow-sm outline-none transition placeholder:text-ink-500 focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/30 dark:border-border-dark dark:bg-app-surface-2 dark:text-on-dark dark:placeholder:text-muted-on-dark",
            className,
          )}
          {...props}
        />
        {hint ? <p className="text-caption text-ink-500 dark:text-muted-on-dark">{hint}</p> : null}
      </div>
    );
  },
);

Input.displayName = "Input";
