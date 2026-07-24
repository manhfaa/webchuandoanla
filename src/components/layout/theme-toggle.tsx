"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useTr } from "@/lib/use-tr";

export function ThemeToggle({ className }: { className?: string }) {
  const tr = useTr();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={className} aria-label={tr("Đang tải tùy chọn giao diện", "Loading theme options")} disabled>
        <div className="h-5 w-5" aria-hidden />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label={resolvedTheme === "dark" ? tr("Chuyển sang giao diện sáng", "Switch to light theme") : tr("Chuyển sang giao diện tối", "Switch to dark theme")}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-5 w-5 text-sun" aria-hidden />
      ) : (
        <Moon className="h-5 w-5 text-ink-soft" aria-hidden />
      )}
    </Button>
  );
}
