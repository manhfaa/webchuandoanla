import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({
  href = "/",
  dark = false,
  compact = false,
  className,
}: {
  href?: string;
  dark?: boolean;
  /** Thu gọn chữ ở breakpoint lg (dùng cùng sidebar thu gọn). */
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex min-w-0 items-center gap-3", compact && "lg:gap-2", className)}
    >
      <img
        src="/logos/agromind_app_icon_animated_128.gif"
        alt="Agromind AI logo"
        width={44}
        height={44}
        className="h-11 w-11 shrink-0 rounded-2xl object-cover"
      />
      <span className={cn("flex min-w-0 flex-col", compact && "lg:sr-only")}>
        <span
          className={cn(
            "font-display text-xl font-semibold tracking-tight",
            dark ? "text-on-dark" : "text-ink-900",
          )}
        >
          Agromind AI
        </span>
        <span
          className={cn(
            "text-xs font-medium",
            dark ? "text-muted-on-dark" : "text-ink-500",
          )}
        >
          Agro intelligence studio
        </span>
      </span>
    </Link>
  );
}
