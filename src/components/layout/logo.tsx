import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({
  href = "/",
  dark = false,
  compact = false,
  dense = false,
  className,
}: {
  href?: string;
  dark?: boolean;
  /** Thu gọn chữ ở breakpoint lg (dùng cùng sidebar thu gọn). */
  compact?: boolean;
  /** Thu gọn kích thước logo cho navbar landing. */
  dense?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex min-w-0 items-center gap-3", dense && "gap-2.5", compact && "lg:gap-2", className)}
    >
      <img
        src="/logos/agromind_app_icon_animated_128.gif"
        alt="Agromind AI logo"
        width={dense ? 36 : 44}
        height={dense ? 36 : 44}
        className={cn(
          "shrink-0 object-cover",
          dense ? "h-9 w-9 rounded-xl" : "h-11 w-11 rounded-2xl",
        )}
      />
      <span className={cn("flex min-w-0 flex-col", compact && "lg:sr-only")}>
        <span
          className={cn(
            "font-display font-semibold tracking-tight",
            dense ? "text-lg leading-5" : "text-xl",
            dark ? "text-on-dark" : "text-ink-900",
          )}
        >
          Agromind AI
        </span>
        <span
          className={cn(
            "font-semibold uppercase tracking-[0.16em]",
            dense ? "text-[9px] leading-4" : "text-xs",
            dark ? "text-emerald-50/80" : "text-leaf-800",
          )}
        >
          Agro intelligence studio
        </span>
      </span>
    </Link>
  );
}
