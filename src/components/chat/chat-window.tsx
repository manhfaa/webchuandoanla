import { Bot, UserRound } from "lucide-react";

import { Card } from "@/components/ui/card";
import { ChatMessage } from "@/types";

export function ChatWindow({
  messages,
  typing,
}: {
  messages: ChatMessage[];
  typing?: boolean;
}) {
  return (
    <Card className="rounded-[34px] border-white/10 bg-white/5 p-0 text-white">
      <div className="max-h-[560px] space-y-4 overflow-y-auto px-5 py-5">
        {messages.map((message) => {
          const user = message.role === "user";
          return (
            <div key={message.id} className={`flex ${user ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-[28px] px-4 py-4 ${
                  user
                    ? "bg-white text-ink shadow-soft"
                    : "bg-white/10 text-white ring-1 ring-white/10"
                }`}
              >
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em]">
                  {user ? <UserRound size={14} /> : <Bot size={14} />}
                  {user ? "Người dùng" : "Agromind AI"}
                </div>
                <p className={`text-sm leading-7 ${user ? "text-slate-700" : "text-emerald-50/80"}`}>
                  {message.content}
                </p>
              </div>
            </div>
          );
        })}

        {typing ? (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-sm text-emerald-50/80 ring-1 ring-white/10">
              <span className="h-2 w-2 animate-bounce rounded-full bg-lime-200 [animation-delay:-0.2s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-lime-200 [animation-delay:-0.1s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-lime-200" />
              Agromind AI đang soạn phản hồi...
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
