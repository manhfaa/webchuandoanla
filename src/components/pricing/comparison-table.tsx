import { Check, Crown, Minus, ShieldCheck, Sprout, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/card";

const rows = [
  { feature: "Kiểm tra ảnh lá cây", seed: "5 lần/ngày", grow: "30 lần/ngày", bloom: "Không giới hạn", elite: "Không giới hạn" },
  { feature: "Lưu lịch sử sử dụng", seed: "7 ngày", grow: "30 ngày", bloom: "Toàn bộ", elite: "Toàn bộ" },
  { feature: "Chat theo kết quả", seed: "3 câu/ngày", grow: "20 câu/ngày", bloom: "Không giới hạn", elite: "Không giới hạn" },
  { feature: "Tư vấn nông nghiệp nâng cao", seed: false, grow: false, bloom: true, elite: true },
  { feature: "Kế hoạch trồng cây", seed: false, grow: "2 kế hoạch", bloom: "10 kế hoạch", elite: "Không giới hạn" },
  { feature: "Ưu tiên tốc độ xử lý", seed: false, grow: false, bloom: true, elite: true },
  { feature: "Xuất báo cáo PDF", seed: false, grow: false, bloom: false, elite: true },
  { feature: "Tích hợp dữ liệu nâng cao", seed: false, grow: false, bloom: false, elite: true },
  { feature: "Hỗ trợ", seed: false, grow: false, bloom: "Email", elite: "Email + Chat" },
];

type CellValue = boolean | string;

function Cell({ value }: { value: CellValue }) {
  if (value === false) return <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-soft text-ink-soft"><Minus size={16} aria-hidden /></span>;
  if (value === true) return <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-soft text-leaf-strong"><Check size={16} aria-hidden /></span>;
  return <span className="text-xs font-semibold text-ink-soft">{value}</span>;
}

export function ComparisonTable() {
  const headers = [{ name: "Seed", icon: Sprout }, { name: "Grow", icon: TrendingUp }, { name: "Bloom", icon: ShieldCheck }, { name: "Elite", icon: Crown }];
  return (
    <section>
      <div className="mb-4"><p className="text-overline text-leaf-strong">So sánh chi tiết</p><h2 className="mt-2 text-h2 font-bold text-ink">Quyền lợi theo từng gói</h2></div>
      <Card variant="raised" padding="none" className="overflow-x-auto rounded-xl">
        <div className="min-w-[820px]">
          <div className="grid grid-cols-[1.5fr_repeat(4,minmax(0,1fr))] bg-surface-soft px-6 py-4 text-xs font-bold text-ink">
            <div>Tính năng</div>
            {headers.map(({ name, icon: Icon }) => <div key={name} className="flex items-center justify-center gap-2"><Icon size={15} className="text-leaf-strong" aria-hidden />{name}</div>)}
          </div>
          {rows.map((row) => <div key={row.feature} className="grid grid-cols-[1.5fr_repeat(4,minmax(0,1fr))] items-center gap-2 border-t border-line px-6 py-4 text-sm"><div className="font-semibold text-ink">{row.feature}</div><div className="flex justify-center"><Cell value={row.seed} /></div><div className="flex justify-center"><Cell value={row.grow} /></div><div className="flex justify-center"><Cell value={row.bloom} /></div><div className="flex justify-center"><Cell value={row.elite} /></div></div>)}
        </div>
      </Card>
    </section>
  );
}
