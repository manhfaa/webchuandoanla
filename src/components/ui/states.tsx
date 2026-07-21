import type { LucideIcon } from "lucide-react";
import { AlertCircle, LoaderCircle, Sprout } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon: Icon = Sprout, action, className }: StateProps) {
  return (
    <div className={cn("flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-dashed border-line bg-surface-soft px-6 py-10 text-center", className)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface text-leaf-strong shadow-sm">
        <Icon size={22} aria-hidden />
      </span>
      <h3 className="mt-4 text-lg font-bold tracking-[-0.02em] text-ink">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-7 text-ink-soft">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ title = "Đang tải dữ liệu", description = "Vui lòng chờ trong giây lát.", className }: Partial<StateProps>) {
  return (
    <div className={cn("flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-line bg-surface px-6 py-10 text-center", className)} role="status">
      <LoaderCircle className="h-7 w-7 animate-spin text-leaf" aria-hidden />
      <h3 className="mt-4 text-base font-bold text-ink">{title}</h3>
      <p className="mt-2 text-sm text-ink-soft">{description}</p>
    </div>
  );
}

export function ErrorState({ title = "Chưa tải được dữ liệu", description, action, onRetry, className }: StateProps & { onRetry?: () => void }) {
  return (
    <div className={cn("flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-danger/25 bg-danger/10 px-6 py-10 text-center", className)} role="alert">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface text-danger">
        <AlertCircle size={21} aria-hidden />
      </span>
      <h3 className="mt-4 text-base font-bold text-ink">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-7 text-ink-soft">{description}</p>
      {onRetry ? <Button type="button" variant="secondary" size="sm" onClick={onRetry} className="mt-5">Thử lại</Button> : action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
