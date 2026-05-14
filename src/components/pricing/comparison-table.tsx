import { Check, Minus } from "lucide-react";

import { Card } from "@/components/ui/card";

const rows = [
  { feature: "Kiểm tra ảnh lá cây", free: true, pro: true, plus: true },
  { feature: "Lưu lịch sử sử dụng", free: true, pro: true, plus: true },
  { feature: "Chat AI hỏi đáp nhanh", free: false, pro: false, plus: true },
  { feature: "Chat với chuyên gia nông nghiệp", free: false, pro: false, plus: true },
  { feature: "Ưu tiên tính năng mới", free: false, pro: true, plus: true },
];

function Cell({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700">
      <Check size={16} />
    </span>
  ) : (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400">
      <Minus size={16} />
    </span>
  );
}

export function ComparisonTable() {
  return (
    <Card className="overflow-hidden rounded-[32px] border-white/70 bg-white/90 p-0">
      <div className="grid grid-cols-[1.5fr_repeat(3,minmax(0,1fr))] bg-emerald-50/70 px-6 py-4 text-sm font-semibold text-ink">
        <div>Tính năng</div>
        <div className="text-center">Free</div>
        <div className="text-center">Pro</div>
        <div className="text-center">Plus</div>
      </div>
      {rows.map((row) => (
        <div
          key={row.feature}
          className="grid grid-cols-[1.5fr_repeat(3,minmax(0,1fr))] items-center gap-4 border-t border-emerald-50 px-6 py-4 text-sm"
        >
          <div className="font-medium text-slate-700">{row.feature}</div>
          <div className="flex justify-center">
            <Cell active={row.free} />
          </div>
          <div className="flex justify-center">
            <Cell active={row.pro} />
          </div>
          <div className="flex justify-center">
            <Cell active={row.plus} />
          </div>
        </div>
      ))}
    </Card>
  );
}
