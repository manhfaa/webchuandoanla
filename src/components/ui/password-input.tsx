"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input, type InputProps } from "@/components/ui/input";

export function PasswordInput(props: Omit<InputProps, "type" | "suffix">) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      {...props}
      type={visible ? "text" : "password"}
      suffix={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-ink-soft transition hover:bg-surface-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/35"
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
        </button>
      }
    />
  );
}
