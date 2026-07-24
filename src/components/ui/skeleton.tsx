"use client";

import { cn } from "@/lib/utils";
import { useTr } from "@/lib/use-tr";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("fl-skeleton rounded-lg", className)} aria-hidden />;
}

export function ListSkeleton({
  count = 3,
  itemClassName,
  className,
}: {
  count?: number;
  itemClassName?: string;
  className?: string;
}) {
  const tr = useTr();
  return (
    <div className={cn("fl-stagger grid gap-3", className)} role="status" aria-label={tr("Đang tải nội dung", "Loading content")}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className={cn("h-[120px] w-full rounded-xl", itemClassName)} />
      ))}
    </div>
  );
}
