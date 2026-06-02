import { Check, Minus } from "lucide-react";

import { Card } from "@/components/ui/card";

const rows = [
  { feature: "Kiểm tra ảnh lá cây", seed: "5 lần/ngày", grow: "30 lần/ngày", bloom: "Không giới hạn", elite: "Không giới hạn" },
  { feature: "Lưu lịch sử sử dụng", seed: "7 ngày", grow: "30 ngày", bloom: "Toàn bộ", elite: "Toàn bộ" },
  { feature: "Chat AI", seed: "3 câu/ngày", grow: "20 câu/ngày", bloom: "Không giới hạn", elite: "Không giới hạn" },
  { feature: "Chat chuyên gia nông nghiệp", seed: false, grow: false, bloom: true, elite: true },
  { feature: "Kế hoạch trồng cây", seed: false, grow: "2 kế hoạch", bloom: "10 kế hoạch", elite: "Không giới hạn" },
  { feature: "Ưu tiên tốc độ xử lý", seed: false, grow: false, bloom: true, elite: true },
  { feature: "Xuất báo cáo PDF", seed: false, grow: false, bloom: false, elite: true },
  { feature: "API access", seed: false, grow: false, bloom: false, elite: true },
  { feature: "Hỗ trợ", seed: false, grow: false, bloom: "Email", elite: "Email + Chat" },
];

type CellValue = boolean | string;

function Cell({ value }: { value: CellValue }) {
  if (value === false) {
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Minus size={16} />
      </span>
    );
  }
  if (value === true) {
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700">
        <Check size={16} />
      </span>
    );
  }
  return <span className="text-xs font-medium text-slate-700">{value}</span>;
}

export function ComparisonTable() {
  return (
    <Card className="overflow-hidden rounded-[32px] border-white/70 bg-white/90 p-0">
      <div className="grid grid-cols-[1.5fr_repeat(4,minmax(0,1fr))] bg-emerald-50/70 px-6 py-4 text-xs font-semibold text-ink">
        <div>Tính năng</div>
        <div className="text-center">🌱 Seed</div>
        <div className="text-center">🌿 Grow</div>
        <div className="text-center">🌳 Bloom</div>
        <div className="text-center">👑 Elite</div>
      </div>
      {rows.map((row) => (
        <div
          key={row.feature}
          className="grid grid-cols-[1.5fr_repeat(4,minmax(0,1fr))] items-center gap-2 border-t border-emerald-50 px-6 py-4 text-sm"
        >
          <div className="font-medium text-slate-700">{row.feature}</div>
          <div className="flex justify-center">
            <Cell value={row.seed} />
          </div>
          <div className="flex justify-center">
            <Cell value={row.grow} />
          </div>
          <div className="flex justify-center">
            <Cell value={row.bloom} />
          </div>
          <div className="flex justify-center">
            <Cell value={row.elite} />
          </div>
        </div>
      ))}
    </Card>
  );
}
