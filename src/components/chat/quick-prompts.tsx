"use client";

import { ArrowUpRight, Sparkles } from "lucide-react";

import { Card } from "@/components/ui/card";
import { useTr } from "@/lib/use-tr";
import type { QuickPrompt } from "@/types";

export function QuickPrompts({ prompts, onSelect }: { prompts: QuickPrompt[]; onSelect: (prompt: QuickPrompt) => void }) {
  const tr = useTr();
  return (
    <Card variant="default" padding="lg" className="rounded-xl">
      <div className="flex items-center gap-2"><Sparkles size={17} className="text-leaf-strong" aria-hidden /><h3 className="text-base font-bold text-ink">{tr("Câu hỏi gợi ý", "Suggested questions")}</h3></div>
      <div className="mt-4 space-y-2">
        {prompts.map((prompt) => (
          <button key={prompt.id} type="button" onClick={() => onSelect(prompt)} className="group flex w-full items-start justify-between gap-3 rounded-lg border border-line bg-surface-soft px-4 py-3 text-left transition hover:-translate-y-px hover:border-leaf/35 hover:bg-surface">
            <span><span className="block text-sm font-bold text-ink">{prompt.label}</span><span className="mt-1 line-clamp-2 block text-xs leading-6 text-ink-soft">{prompt.prompt}</span></span>
            <ArrowUpRight size={15} className="mt-0.5 shrink-0 text-ink-soft transition group-hover:text-leaf-strong" aria-hidden />
          </button>
        ))}
      </div>
    </Card>
  );
}
