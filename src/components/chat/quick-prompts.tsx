"use client";

import { Sparkles } from "lucide-react";

import { QuickPrompt } from "@/types";

export function QuickPrompts({
  prompts,
  onSelect,
}: {
  prompts: QuickPrompt[];
  onSelect: (prompt: QuickPrompt) => void;
}) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-white/5 p-5 text-white">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-lime-200" />
        <h3 className="font-display text-2xl font-semibold">Câu hỏi gợi ý nhanh</h3>
      </div>
      <div className="mt-5 space-y-3">
        {prompts.map((prompt) => (
          <button
            key={prompt.id}
            type="button"
            onClick={() => onSelect(prompt)}
            className="w-full rounded-[24px] border border-white/10 bg-white/5 px-4 py-4 text-left text-sm leading-7 text-emerald-50/80 transition hover:bg-white/10"
          >
            <p className="font-semibold text-white">{prompt.label}</p>
            <p className="mt-1 text-emerald-50/70">{prompt.prompt}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
