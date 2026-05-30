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
      <Card className="rounded-[30px] border-emerald-100/70 bg-white/90">
        <p className="text-sm leading-7 text-slate-600">
          Chọn một bước trong timeline để xem hướng dẫn chi tiết, ghi chú và cập nhật tiến độ.
        </p>
      </Card>
    );
  }

  return (
    <Card className="rounded-[30px] border-emerald-100/70 bg-white/90">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700/65">
            Bước {step.step_number}
          </p>
          <h3 className="mt-3 font-display text-2xl font-semibold text-slate-950">{step.title}</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">{step.description}</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
          {step.status}
        </span>
      </div>

      <div className="mt-6 grid gap-3">
        <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <Clock3 size={16} className="text-emerald-700" />
            Làm vào lúc nào
          </div>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Bắt đầu: {new Date(step.suggested_start_time).toLocaleString("vi-VN")}
            <br />
            Kết thúc: {new Date(step.suggested_end_time).toLocaleString("vi-VN")}
          </p>
        </div>

        <div className="rounded-[24px] border border-emerald-100 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <MoveRight size={16} className="text-emerald-700" />
            Vì sao bước này quan trọng
          </div>
          <p className="mt-2 text-sm leading-7 text-slate-600">{step.why_this_step_matters}</p>
        </div>

        <div className="rounded-[24px] border border-emerald-100 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <FileText size={16} className="text-emerald-700" />
            Cần chuẩn bị
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
            {step.tools_needed.map((tool) => (
              <li key={tool}>- {tool}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-[24px] border border-emerald-100 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <CheckCircle2 size={16} className="text-emerald-700" />
            Dấu hiệu làm đúng
          </div>
          <p className="mt-2 text-sm leading-7 text-slate-600">{step.completion_condition}</p>
        </div>

        <div className="rounded-[24px] border border-amber-100 bg-amber-50/70 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <TriangleAlert size={16} className="text-amber-700" />
            Lưu ý rủi ro
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
            {step.risk_notes.map((risk) => (
              <li key={risk}>- {risk}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-[24px] border border-emerald-100 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
          <NotebookText size={16} className="text-emerald-700" />
          Ghi chú của bạn
        </div>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="mt-3 min-h-[120px] w-full rounded-2xl border border-emerald-100 px-4 py-3 text-sm leading-7 text-slate-700 outline-none focus:border-emerald-300"
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
