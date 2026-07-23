import * as React from "react";
import { cn } from "@/lib/utils";

export function AppShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-h-[100dvh] bg-canvas bg-dashboard-mesh text-ink", className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4", className)}>
      <div>
        {eyebrow ? <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-leaf-strong">{eyebrow}</p> : null}
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-ink-soft">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function SectionHeader({
  label,
  title,
  description,
  action,
  className,
}: {
  label?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4", className)}>
      <div>
        {label ? <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-leaf-strong">{label}</p> : null}
        <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-1 max-w-xl text-sm text-ink-soft">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
