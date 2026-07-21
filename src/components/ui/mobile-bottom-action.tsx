import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function MobileBottomAction({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <>
      <div className="h-20 md:hidden" aria-hidden />
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md md:hidden",
          className,
        )}
      >
        <div className="mx-auto max-w-md">{children}</div>
      </div>
    </>
  );
}
