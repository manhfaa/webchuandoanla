"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useMemo, useState } from "react";
import { Bot, Leaf, ShieldCheck, X } from "lucide-react";

import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatWindow } from "@/components/chat/chat-window";
import { LockedPanel } from "@/components/chat/locked-panel";
import { QuickPrompts } from "@/components/chat/quick-prompts";
import { UpgradeModal } from "@/components/pricing/upgrade-modal";
import { StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { assistantQuickPrompts, expertQuickPrompts } from "@/data/mock/chat";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { useDiagnosisStore } from "@/store/diagnosis-store";
import { useSessionStore } from "@/store/session-store";
import type { ChatApiResponse, ChatMessage, ChatMode, ChatWorkspace, QuickPrompt } from "@/types";

function getWorkspaceSubtitle(workspace: ChatWorkspace) {
  return workspace === "assistant"
    ? "Chọn một kết quả đã lưu để hỏi tiếp về dấu hiệu, mức cần chú ý và cách theo dõi."
    : "Hỏi về đất, nước, dinh dưỡng, sâu bệnh và chăm sóc cây mà không phụ thuộc vào một kết quả ảnh cụ thể.";
}

export default function DashboardChatPage() {
  const { user, accessToken } = useSessionStore();
  const { records, latestRecordId } = useDiagnosisStore();
  const [workspace, setWorkspace] = useState<ChatWorkspace>("assistant");
  const [selectedDiagnosisId, setSelectedDiagnosisId] = useState("");
  const [composerByMode, setComposerByMode] = useState<Record<ChatMode, string>>({ assistant: "", expert: "" });
  const [typingMode, setTypingMode] = useState<ChatMode | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [messagesByMode, setMessagesByMode] = useState<Record<ChatMode, ChatMessage[]>>({ assistant: [], expert: [] });

  const currentPlan = String(user?.currentPlan ?? "seed");
  const expertUnlocked = currentPlan === "bloom" || currentPlan === "elite";
  const latestDiagnosis = useMemo(() => records.find((item) => item.id === latestRecordId) ?? records[0] ?? null, [latestRecordId, records]);
  const selectedDiagnosis = useMemo(() => {
    if (selectedDiagnosisId === "none") return null;
    return records.find((item) => item.id === selectedDiagnosisId) ?? latestDiagnosis;
  }, [latestDiagnosis, records, selectedDiagnosisId]);
  const activeMode: ChatMode = workspace === "assistant" ? "assistant" : "expert";
  const activePrompts: QuickPrompt[] = workspace === "assistant" ? assistantQuickPrompts : expertQuickPrompts;

  function setComposer(mode: ChatMode, value: string) {
    setComposerByMode((current) => ({ ...current, [mode]: value }));
  }

  const handleVoiceTranscript = useCallback((value: string) => setComposer(activeMode, value), [activeMode]);
  const voice = useVoiceInput({ onTranscript: handleVoiceTranscript });

  async function sendMessage(mode: ChatMode, content: string) {
    if (!content.trim()) return;
    const userMessage: ChatMessage = { id: `${mode}-${Date.now()}`, role: "user", content, createdAt: new Date().toISOString() };
    setMessagesByMode((current) => ({ ...current, [mode]: [...current[mode], userMessage] }));
    setComposer(mode, "");
    setTypingMode(mode);

    try {
      const diagnosisForRequest = mode === "assistant" ? selectedDiagnosis : null;
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ query: content, mode, latestDiagnosis: diagnosisForRequest, selectedDiagnosis: diagnosisForRequest }),
      });
      if (!response.ok) throw new Error("Chat request failed");
      const data = (await response.json()) as ChatApiResponse;
      setMessagesByMode((current) => ({ ...current, [mode]: [...current[mode], { id: `${mode}-${Date.now()}-assistant`, role: "assistant", content: data.answer, createdAt: data.generatedAt }] }));
    } catch {
      setMessagesByMode((current) => ({
        ...current,
        [mode]: [...current[mode], { id: `${mode}-${Date.now()}-error`, role: "assistant", content: "Hiện chưa gửi được câu hỏi. Hãy kiểm tra kết nối và thử lại sau ít phút.", createdAt: new Date().toISOString() }],
      }));
    } finally {
      setTypingMode(null);
    }
  }

  const handlePrompt = (prompt: QuickPrompt) => void sendMessage(activeMode, prompt.prompt);
  const handleVoice = () => voice.listening ? voice.stop() : voice.start();

  return (
    <div className="fl-stagger mx-auto max-w-[1380px] space-y-6">
      <Card variant="raised" padding="lg" className="rounded-xl">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-overline text-leaf-strong">Chat tư vấn</p>
            <h2 className="mt-2 max-w-3xl font-display text-[30px] font-bold leading-tight tracking-[-0.035em] text-ink sm:text-[36px]">Hỏi đúng bối cảnh, nhận câu trả lời dễ thực hiện</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-soft">{getWorkspaceSubtitle(workspace)}</p>
          </div>
          <Tabs value={workspace} onChange={(value) => setWorkspace(value as ChatWorkspace)} tabs={[{ value: "assistant", label: "Hỏi theo kết quả" }, { value: "expert", label: "Tư vấn nông nghiệp" }]} />
        </div>
      </Card>

      {workspace === "assistant" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="space-y-4">
            <ChatWindow messages={messagesByMode.assistant} typing={typingMode === "assistant"} />
            <ChatComposer label="Câu hỏi của bạn" value={composerByMode.assistant} onChange={(value) => setComposer("assistant", value)} onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void sendMessage("assistant", composerByMode.assistant); }} placeholder="Ví dụ: Với dấu hiệu này, tôi nên theo dõi thêm điều gì trong 3 ngày tới?" helperText="Câu trả lời dựa trên kết quả bạn chọn và chỉ mang tính tham khảo." onVoiceClick={handleVoice} voiceListening={voice.listening} voiceSupported={voice.supported} />
            <p className="px-1 text-xs leading-6 text-ink-soft">Agromind AI có thể chưa đầy đủ. Không tự ý dùng thuốc chỉ dựa trên nội dung trò chuyện.</p>
          </div>

          <aside className="space-y-4">
            <Card variant="soft" padding="lg" className="rounded-xl">
              <div className="flex items-start justify-between gap-3"><div><p className="text-overline text-leaf-strong">Bối cảnh tư vấn</p><h3 className="mt-2 text-lg font-bold text-ink">Chọn kết quả đã lưu</h3></div><Bot size={19} className="text-leaf-strong" aria-hidden /></div>
              <p className="mt-2 text-sm leading-7 text-ink-soft">Trợ lý sẽ dùng đúng cây, khả năng bệnh và độ tin cậy của kết quả được chọn.</p>
              {records.length ? (
                <>
                  <select value={selectedDiagnosis?.id ?? "none"} onChange={(event) => setSelectedDiagnosisId(event.target.value)} className="mt-4 h-12 w-full rounded-md border border-line bg-surface px-3.5 text-sm font-semibold text-ink outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20">
                    <option value="none">Không dùng kết quả cụ thể</option>
                    {records.map((record) => <option key={record.id} value={record.id}>{record.plant} · {record.disease} · {Math.round((record.cnnConfidence ?? record.confidence) * 100)}%</option>)}
                  </select>
                  {selectedDiagnosis ? (
                    <div className="mt-3 flex items-start justify-between gap-3 rounded-lg border border-leaf/20 bg-surface p-3">
                      <div className="min-w-0"><StatusBadge status={(selectedDiagnosis.cnnConfidence ?? selectedDiagnosis.confidence) >= 0.7 ? "healthy" : "watch"} label={selectedDiagnosis.plant} /><p className="mt-2 truncate text-sm font-bold text-ink">{selectedDiagnosis.disease}</p></div>
                      <button type="button" onClick={() => setSelectedDiagnosisId("none")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-soft hover:bg-surface-soft hover:text-ink" aria-label="Bỏ kết quả đang chọn"><X size={16} aria-hidden /></button>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="mt-4 rounded-lg border border-dashed border-line bg-surface p-4 text-sm leading-7 text-ink-soft">Chưa có kết quả trong lịch sử. <Link href="/dashboard/diagnosis" className="font-semibold text-leaf-strong">Kiểm tra ảnh lá</Link> để tạo bối cảnh đầu tiên.</div>
              )}
            </Card>

            <QuickPrompts prompts={activePrompts} onSelect={handlePrompt} />

            <Card variant="default" padding="lg" className="rounded-xl">
              <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-soft text-leaf-strong"><ShieldCheck size={18} aria-hidden /></span><div><h3 className="text-sm font-bold text-ink">Cách dùng an toàn</h3><p className="mt-2 text-sm leading-7 text-ink-soft">Nêu rõ dấu hiệu, thời điểm xuất hiện và điều kiện vườn. Nếu bệnh lan nhanh, hãy mang mẫu đến cán bộ kỹ thuật hoặc chuyên gia địa phương.</p></div></div>
            </Card>
          </aside>
        </div>
      ) : expertUnlocked ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="space-y-4">
            <ChatWindow messages={messagesByMode.expert} typing={typingMode === "expert"} />
            <ChatComposer label="Vấn đề nông nghiệp bạn muốn hỏi" value={composerByMode.expert} onChange={(value) => setComposer("expert", value)} onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void sendMessage("expert", composerByMode.expert); }} placeholder="Ví dụ: Cà chua trồng chậu vào mùa mưa nên tưới và phòng nấm như thế nào?" helperText="Luồng này trả lời kiến thức nông nghiệp tổng quát, không dùng kết quả ảnh đã lưu." onVoiceClick={handleVoice} voiceListening={voice.listening} voiceSupported={voice.supported} />
          </div>
          <aside className="space-y-4">
            <QuickPrompts prompts={activePrompts} onSelect={handlePrompt} />
            <Card variant="warning" padding="lg" className="rounded-xl">
              <div className="flex items-start gap-3"><ShieldCheck size={19} className="mt-0.5 shrink-0 text-warning-ink" aria-hidden /><div><h3 className="text-sm font-bold text-ink">Đây là trợ lý kiến thức</h3><p className="mt-2 text-sm leading-7 text-ink-soft">Hiện tại đây chưa phải cuộc trò chuyện trực tiếp với chuyên gia con người. Hãy hỏi chuyên gia địa phương khi cần quyết định dùng thuốc hoặc xử lý diện rộng.</p></div></div>
            </Card>
          </aside>
        </div>
      ) : (
        <div className="space-y-4"><LockedPanel onUpgrade={() => setUpgradeOpen(true)} /><Link href="/dashboard/pricing" className={buttonVariants({ variant: "tertiary", size: "sm" })}>Xem chi tiết các gói</Link></div>
      )}

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  );
}
