"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import { MessageCircleMore, ShieldCheck } from "lucide-react";

import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatWindow } from "@/components/chat/chat-window";
import { LockedPanel } from "@/components/chat/locked-panel";
import { QuickPrompts } from "@/components/chat/quick-prompts";
import { UpgradeModal } from "@/components/pricing/upgrade-modal";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import {
  assistantQuickPrompts,
  expertQuickPrompts,
} from "@/data/mock/chat";
import { ChatApiResponse, ChatMessage, ChatMode, ChatWorkspace, QuickPrompt } from "@/types";
import { useDiagnosisStore } from "@/store/diagnosis-store";
import { useSessionStore } from "@/store/session-store";
import { useVoiceInput } from "@/hooks/use-voice-input";

function getWorkspaceSubtitle(workspace: ChatWorkspace) {
  if (workspace === "assistant") {
    return "Chat AI có thể chọn một ca chẩn đoán trong lịch sử để hỏi tiếp về bệnh, triệu chứng, mức độ rủi ro và bước xử lý.";
  }

  return "Chat chuyên gia nông nghiệp là kênh hỏi đáp nông nghiệp tổng quát, không phụ thuộc CNN hay lịch sử chẩn đoán.";
}

export default function DashboardChatPage() {
  const { user } = useSessionStore();
  const { records, latestRecordId } = useDiagnosisStore();

  const [workspace, setWorkspace] = useState<ChatWorkspace>("assistant");
  const [selectedDiagnosisId, setSelectedDiagnosisId] = useState<string>("");
  const [composerByMode, setComposerByMode] = useState<Record<ChatMode, string>>({
    assistant: "",
    expert: "",
  });
  const [typingMode, setTypingMode] = useState<ChatMode | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [messagesByMode, setMessagesByMode] = useState<Record<ChatMode, ChatMessage[]>>({
    assistant: [],
    expert: [],
  });

  const currentPlan = String(user?.currentPlan ?? "seed");
  const expertUnlocked = currentPlan === "bloom" || currentPlan === "elite";
  const latestDiagnosis = useMemo(
    () => records.find((item) => item.id === latestRecordId) ?? records[0] ?? null,
    [latestRecordId, records],
  );
  const selectedDiagnosis = useMemo(
    () => records.find((item) => item.id === selectedDiagnosisId) ?? latestDiagnosis,
    [latestDiagnosis, records, selectedDiagnosisId],
  );
  const activeMode: ChatMode = workspace === "assistant" ? "assistant" : "expert";
  const subtitle = getWorkspaceSubtitle(workspace);
  const activePrompts: QuickPrompt[] =
    workspace === "assistant" ? assistantQuickPrompts : expertQuickPrompts;

  function setComposer(mode: ChatMode, value: string) {
    setComposerByMode((current) => ({
      ...current,
      [mode]: value,
    }));
  }

  const handleVoiceTranscript = useCallback(
    (value: string) => {
      setComposer(activeMode, value);
    },
    [activeMode],
  );

  const voice = useVoiceInput({ onTranscript: handleVoiceTranscript });

  async function sendMessage(mode: ChatMode, content: string) {
    if (!content.trim()) return;

    const userMessage: ChatMessage = {
      id: `${mode}-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    setMessagesByMode((current) => ({
      ...current,
      [mode]: [...current[mode], userMessage],
    }));
    setComposer(mode, "");
    setTypingMode(mode);

    try {
      const diagnosisForRequest = mode === "assistant" ? selectedDiagnosis : null;
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: content,
          mode,
          latestDiagnosis: diagnosisForRequest,
          selectedDiagnosis: diagnosisForRequest,
        }),
      });

      if (!response.ok) {
        throw new Error("API chat trả về lỗi.");
      }

      const data = (await response.json()) as ChatApiResponse;

      setMessagesByMode((current) => ({
        ...current,
        [mode]: [
          ...current[mode],
          {
            id: `${mode}-${Date.now()}-assistant`,
            role: "assistant",
            content: data.answer,
            createdAt: data.generatedAt,
          },
        ],
      }));
    } catch {
      setMessagesByMode((current) => ({
        ...current,
        [mode]: [
          ...current[mode],
          {
            id: `${mode}-${Date.now()}-fallback`,
            role: "assistant",
            content:
              "Agromind AI chưa kết nối được tới API chat ở lượt này. Bạn có thể thử lại sau vài giây hoặc kiểm tra dev server nội bộ.",
            createdAt: new Date().toISOString(),
          },
        ],
      }));
    } finally {
      setTypingMode(null);
    }
  }

  const handlePrompt = (prompt: QuickPrompt) => {
    void sendMessage(activeMode, prompt.prompt);
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-[34px] border-white/10 bg-white/5 text-white">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100/60">
              Chat tư vấn
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold">
              Khu chat của Agromind AI gồm trợ lý AI thường và kênh chuyên gia nông nghiệp.
            </h2>
            <p className="mt-3 text-sm leading-7 text-emerald-50/75">{subtitle}</p>
          </div>
          <Tabs
            value={workspace}
            onChange={(value) => setWorkspace(value as ChatWorkspace)}
            tabs={[
              { value: "assistant", label: "Chat AI" },
              { value: "expert", label: "Chuyên gia nông nghiệp" },
            ]}
          />
        </div>
      </Card>

      {workspace === "assistant" ? (
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <ChatWindow messages={messagesByMode.assistant} typing={typingMode === "assistant"} />
            <ChatComposer
              label="Nhập câu hỏi cho AI"
              value={composerByMode.assistant}
              onChange={(value) => setComposer("assistant", value)}
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                void sendMessage("assistant", composerByMode.assistant);
              }}
              placeholder="Ví dụ: Tôi nên chụp thêm những góc nào của lá cây để lần phân tích sau rõ hơn?"
              helperText="Chat gọi API backend của ứng dụng; nếu Gemini tạm lỗi, hệ thống trả lời an toàn theo bối cảnh hiện có."
              onVoiceClick={() => {
                if (voice.listening) {
                  voice.stop();
                } else {
                  voice.start();
                }
              }}
              voiceListening={voice.listening}
              voiceSupported={voice.supported}
            />
            <p className="px-2 text-xs text-amber-200">(AI có thể mắc lỗi vui lòng kiểm tra lại)</p>
          </div>

          <div className="space-y-6">
            <Card className="rounded-[30px] border-white/10 bg-white/5 text-white">
              <h3 className="font-display text-2xl font-semibold">Chọn ca chẩn đoán để hỏi AI</h3>
              <p className="mt-2 text-sm leading-7 text-emerald-50/75">
                AI sẽ chỉ bám theo ca được chọn trong lịch sử. Nếu không chọn, hệ thống dùng ca mới nhất.
              </p>
              <select
                value={selectedDiagnosis?.id ?? ""}
                onChange={(event) => setSelectedDiagnosisId(event.target.value)}
                className="mt-4 w-full rounded-2xl border border-white/10 bg-emerald-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-300"
              >
                {records.length ? (
                  records.map((record) => (
                    <option key={record.id} value={record.id}>
                      {record.plant} · {record.disease} · {Math.round(record.confidence * 100)}%
                    </option>
                  ))
                ) : (
                  <option value="">Chưa có ca chẩn đoán trong lịch sử</option>
                )}
              </select>
            </Card>

            <QuickPrompts prompts={activePrompts} onSelect={handlePrompt} />

            <Card className="rounded-[30px] border-white/10 bg-white/5 text-white">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/10 p-3">
                  <MessageCircleMore size={18} className="text-lime-200" />
                </div>
                <div>
                  <h3 className="font-display text-2xl font-semibold">AI tư vấn theo bối cảnh chẩn đoán</h3>
                  <p className="mt-2 text-sm leading-7 text-emerald-50/75">
                    Luồng này gửi câu hỏi và ca chẩn đoán gần nhất tới API chat. Khi Gemini sẵn sàng, phản hồi đến từ mô hình đã cấu hình; khi API ngoài lỗi, hệ thống dùng phản hồi an toàn để tránh bịa kết quả chẩn đoán.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="rounded-[30px] border-white/10 bg-white/5 text-white">
              <h3 className="font-display text-2xl font-semibold">Bối cảnh hiện tại</h3>
              <div className="mt-5 space-y-3 text-sm leading-7 text-emerald-50/75">
                {selectedDiagnosis ? (
                  <>
                    <p>
                      Ca đang chọn đã được YOLO xác thực là ảnh lá hợp lệ. AI sẽ dùng đúng bối cảnh này để trả lời
                      các câu hỏi liên quan tới bệnh và bước xử lý.
                    </p>
                    <p>
                      {selectedDiagnosis.classificationReady
                        ? `Ca đang chọn có dữ liệu phân loại cho ${selectedDiagnosis.plant.toLowerCase()} với kết quả ${selectedDiagnosis.disease.toLowerCase()}, nên phần tư vấn sẽ cụ thể hơn.`
                        : "Hiện chưa có CNN nên AI sẽ không kết luận bệnh cụ thể, mà chỉ đưa ra hướng quan sát và ghi nhận an toàn."}
                    </p>
                  </>
                ) : (
                  <p>
                    Chưa có ca mới trong phiên hiện tại, nên AI sẽ trả lời ở mức hướng dẫn chung về
                    cách chụp ảnh lá, mô tả triệu chứng và chuẩn bị thông tin hiện trường.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      ) : expertUnlocked ? (
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <ChatWindow messages={messagesByMode.expert} typing={typingMode === "expert"} />
            <ChatComposer
              label="Nhập câu hỏi cho chuyên gia nông nghiệp"
              value={composerByMode.expert}
              onChange={(value) => setComposer("expert", value)}
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                void sendMessage("expert", composerByMode.expert);
              }}
              placeholder="Ví dụ: Cà chua trồng chậu mùa mưa nên tưới và phòng nấm như thế nào?"
              helperText="Kênh chuyên gia trả lời vấn đề nông nghiệp tổng quát, không dùng bối cảnh CNN."
              onVoiceClick={() => {
                if (voice.listening) {
                  voice.stop();
                } else {
                  voice.start();
                }
              }}
              voiceListening={voice.listening}
              voiceSupported={voice.supported}
            />
          </div>

          <div className="space-y-6">
            <QuickPrompts prompts={activePrompts} onSelect={handlePrompt} />

            <Card className="rounded-[30px] border-white/10 bg-white/5 text-white">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/10 p-3">
                  <ShieldCheck size={18} className="text-lime-200" />
                </div>
                <div>
                  <h3 className="font-display text-2xl font-semibold">
                    Chuyên gia nông nghiệp đồng hành
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-emerald-50/75">
                    Đây là kênh tư vấn nông nghiệp tổng quát: đất, nước, phân bón, sâu bệnh, lịch chăm sóc và cách xử
                    lý ngoài ruộng vườn. Kênh này không phụ thuộc kết quả CNN.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="rounded-[30px] border-white/10 bg-white/5 text-white">
              <h3 className="font-display text-2xl font-semibold">Gợi ý sử dụng hiệu quả</h3>
              <div className="mt-5 space-y-3 text-sm leading-7 text-emerald-50/75">
                <p>Hãy mô tả rõ cây trồng, thời điểm phát hiện và vị trí lá bị ảnh hưởng.</p>
                <p>
                  Nếu có ảnh mới, bạn nên chụp bổ sung nhiều góc và ghi chú điều kiện tưới, mưa,
                  nắng hoặc sâu hại xuất hiện gần đây.
                </p>
                <p>
                  Chuyên gia sẽ phù hợp hơn khi bạn cần lời khuyên mang tính thực tế và theo dõi
                  ngoài hiện trường.
                </p>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <>
          <LockedPanel onUpgrade={() => setUpgradeOpen(true)} />
          <Card className="rounded-[30px] border-white/10 bg-white/5 text-white">
            <p className="text-sm leading-7 text-emerald-50/75">
              Chat chuyên gia nông nghiệp hiện được mở khóa trên gói Plus.
            </p>
          </Card>
        </>
      )}

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  );
}
