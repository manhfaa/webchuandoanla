"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, FileText, MoveRight, NotebookText, TriangleAlert } from "lucide-react";

import type { CropPlanStep } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function CropPlanStepPanel({
  step,
  onComplete,
  onDelay,
  onSaveNote,
}: {
  step: CropPlanStep | null;
  onComplete: (stepId: number, note: string) => Promise<void>;
  onDelay: (stepId: number, delayDays: number, reason: string) => Promise<void>;
  onSaveNote: (stepId: number, note: string) => Promise<void>;
}) {
  const [note, setNote] = useState("");

  useEffect(() => {
    setNote(step?.user_notes ?? "");
  }, [step]);

  if (!step) {
    return (
      <Card variant="soft" className="rounded-xl">
        <p className="text-sm leading-7 text-ink-soft">
          Chọn một bước trong timeline để xem hướng dẫn chi tiết, ghi chú và cập nhật tiến độ.
        </p>
      </Card>
    );
  }

  return (
    <Card variant="raised" padding="lg" className="rounded-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-overline text-leaf-strong">
            Bước {step.step_number}
          </p>
          <h3 className="mt-3 font-display text-2xl font-bold text-ink">{step.title}</h3>
          <p className="mt-2 text-sm leading-7 text-ink-soft">{step.description}</p>
        </div>
        <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold text-leaf-strong">
          {step.status}
        </span>
      </div>

      <div className="mt-6 grid gap-3">
        <div className="rounded-lg border border-line bg-surface-soft p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <Clock3 size={16} className="text-leaf-strong" />
            Làm vào lúc nào
          </div>
          <p className="mt-2 text-sm leading-7 text-ink-soft">
            Bắt đầu: {new Date(step.suggested_start_time).toLocaleString("vi-VN")}
            <br />
            Kết thúc: {new Date(step.suggested_end_time).toLocaleString("vi-VN")}
          </p>
        </div>

        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <MoveRight size={16} className="text-leaf-strong" />
            Vì sao bước này quan trọng
          </div>
          <p className="mt-2 text-sm leading-7 text-ink-soft">{step.why_this_step_matters}</p>
        </div>

        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <FileText size={16} className="text-leaf-strong" />
            Cần chuẩn bị
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-ink-soft">
            {step.tools_needed.map((tool) => (
              <li key={tool}>- {tool}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <CheckCircle2 size={16} className="text-leaf-strong" />
            Dấu hiệu làm đúng
          </div>
          <p className="mt-2 text-sm leading-7 text-ink-soft">{step.completion_condition}</p>
        </div>

        <div className="rounded-lg border border-sun/30 bg-sun/10 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <TriangleAlert size={16} className="text-soil" />
            Lưu ý rủi ro
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-ink-soft">
            {step.risk_notes.map((risk) => (
              <li key={risk}>- {risk}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-line bg-surface p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-ink">
          <NotebookText size={16} className="text-leaf-strong" />
          Ghi chú của bạn
        </div>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="mt-3 min-h-[120px] w-full rounded-md border border-line bg-surface-soft px-4 py-3 text-sm leading-7 text-ink outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
          placeholder="Ghi lại tình trạng cây, số lượng đã làm, điều cần nhớ..."
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => onSaveNote(step.id, note)}>
            Lưu ghi chú
          </Button>
          <Button variant="secondary" onClick={() => onDelay(step.id, 1, "Dời 1 ngày để canh thời tiết tốt hơn")}>
            Dời 1 ngày
          </Button>
          <Button onClick={() => onComplete(step.id, note)}>Đánh dấu hoàn thành</Button>
        </div>
      </div>
    </Card>
  );
}
