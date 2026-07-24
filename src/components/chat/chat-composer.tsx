"use client";

import type { FormEvent } from "react";
import { Mic, SendHorizonal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTr } from "@/lib/use-tr";

export function ChatComposer({ label, value, onChange, onSubmit, placeholder, disabled, helperText, onVoiceClick, voiceListening, voiceSupported = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  placeholder: string;
  disabled?: boolean;
  helperText?: string;
  onVoiceClick?: () => void;
  voiceListening?: boolean;
  voiceSupported?: boolean;
}) {
  const tr = useTr();
  return (
    <Card variant="default" padding="sm" className="rounded-xl">
      <form className="space-y-3" onSubmit={onSubmit}>
        <label className="block text-sm font-bold text-ink">{label}</label>
        <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} disabled={disabled} className="min-h-[112px] w-full resize-none rounded-md border border-line bg-surface-soft px-4 py-3 text-sm leading-7 text-ink outline-none transition placeholder:text-ink-muted focus:border-leaf focus:bg-surface focus:ring-2 focus:ring-leaf/20 disabled:cursor-not-allowed disabled:opacity-70" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {helperText ? <p className="max-w-lg text-xs leading-6 text-ink-soft">{helperText}</p> : <div />}
          <div className="flex shrink-0 items-center justify-end gap-2">
            {voiceSupported ? <Button type="button" variant={voiceListening ? "primary" : "secondary"} size="icon" onClick={onVoiceClick} aria-pressed={voiceListening} aria-label={voiceListening ? tr("Dừng nhập bằng giọng nói", "Stop voice input") : tr("Nhập bằng giọng nói", "Voice input")}><Mic size={17} aria-hidden /></Button> : null}
            <Button type="submit" disabled={disabled || !value.trim()}><SendHorizonal size={16} aria-hidden /> {tr("Gửi câu hỏi", "Send question")}</Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
