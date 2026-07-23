import { cn } from "@/lib/utils";

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
  return (
    <div className={cn("fl-stagger grid gap-3", className)} role="status" aria-label="Đang tải nội dung">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className={cn("h-[120px] w-full rounded-xl", itemClassName)} />
      ))}
    </div>
  );
}
