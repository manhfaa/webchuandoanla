import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function MobileBottomAction({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <>
      {/* No inline spacer. This component is mounted inside a card partway up the
          page, so an in-flow `h-20` reserved its clearance *there* rather than at
          the end of the document — the bar still covered the last card. The
          clearance now lives on the dashboard <main>, which is the element that
          actually ends where the bar sits. */}
      <div
        className={cn(
          // bg-surface/95 compiled to nothing (bare `var(--token)` colours take no
          // opacity modifier), so the bar was transparent apart from its blur and
          // page content read straight through the label.
          "fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[color-mix(in_srgb,var(--surface)_95%,transparent)] px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md md:hidden",
          className,
        )}
      >
        <div className="mx-auto max-w-md">{children}</div>
      </div>
    </>
  );
}
