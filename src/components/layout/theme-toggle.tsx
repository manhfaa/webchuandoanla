"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={className} aria-label="Đang tải tùy chọn giao diện" disabled>
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
      aria-label={resolvedTheme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-5 w-5 text-sun" aria-hidden />
      ) : (
        <Moon className="h-5 w-5 text-ink-soft" aria-hidden />
      )}
    </Button>
  );
}
