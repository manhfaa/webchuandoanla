"use client";

import type { FormEvent } from "react";
import { SendHorizonal } from "lucide-react";

import { Card } from "@/components/ui/card";

export function ChatComposer({
  label,
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  placeholder: string;
  disabled?: boolean;
  helperText?: string;
}) {
  return (
    <Card className="rounded-[30px] border-white/10 bg-white/5 text-white">
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm font-semibold text-emerald-50/75">{label}</label>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[120px] w-full rounded-[26px] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-7 text-white outline-none transition placeholder:text-emerald-50/40 focus:border-lime-200/50 focus:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <div className="flex items-center justify-between gap-4">
          {helperText ? <p className="text-xs text-emerald-50/60">{helperText}</p> : <div />}
          <button
            type="submit"
            disabled={disabled}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-ink transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SendHorizonal size={16} />
            Gửi câu hỏi
          </button>
        </div>
      </form>
    </Card>
  );
}
