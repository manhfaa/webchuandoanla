import { Bot, MessageCircle, UserRound } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { ChatMessage } from "@/types";

export function ChatWindow({ messages, typing }: { messages: ChatMessage[]; typing?: boolean }) {
  return (
    <Card variant="raised" padding="none" className="overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div><p className="text-sm font-bold text-ink">Cuộc trò chuyện</p><p className="mt-0.5 text-xs text-ink-soft">Mô tả càng cụ thể, câu trả lời càng sát bối cảnh.</p></div>
        <MessageCircle size={18} className="text-leaf-strong" aria-hidden />
      </div>
      <div className="max-h-[580px] min-h-[420px] space-y-4 overflow-y-auto bg-canvas/40 px-4 py-5 sm:px-5">
        {!messages.length ? (
          <div className="flex min-h-[330px] flex-col items-center justify-center px-5 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-soft text-leaf-strong"><Bot size={22} aria-hidden /></span>
            <p className="mt-4 text-base font-bold text-ink">Bạn cần hỗ trợ điều gì?</p>
            <p className="mt-2 max-w-md text-sm leading-7 text-ink-soft">Chọn một câu hỏi gợi ý hoặc nhập vấn đề về ảnh lá, dấu hiệu quan sát được và cách theo dõi tiếp.</p>
          </div>
        ) : null}

        {messages.map((message) => {
          const user = message.role === "user";
          return (
            <div key={message.id} className={`flex ${user ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[88%] rounded-lg px-4 py-3 sm:max-w-[78%] ${user ? "bg-leaf text-on-leaf" : "border border-line bg-surface text-ink shadow-sm"}`}>
                <div className={`mb-2 flex items-center gap-2 text-xs font-bold ${user ? "text-on-leaf/85" : "text-leaf-strong"}`}>
                  {user ? <UserRound size={14} aria-hidden /> : <Bot size={14} aria-hidden />}
                  {user ? "Bạn" : "Agromind AI"}
                </div>
                <p className={`whitespace-pre-wrap text-sm leading-7 ${user ? "text-on-leaf" : "text-ink-soft"}`}>{message.content}</p>
              </div>
            </div>
          );
        })}

        {typing ? (
          <div className="flex justify-start" role="status">
            <div className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink-soft shadow-sm">
              <span className="h-2 w-2 animate-bounce rounded-full bg-leaf [animation-delay:-0.2s]" /><span className="h-2 w-2 animate-bounce rounded-full bg-leaf [animation-delay:-0.1s]" /><span className="h-2 w-2 animate-bounce rounded-full bg-leaf" />
              Đang soạn phản hồi...
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
