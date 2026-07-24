"use client";

import { Check, Crown, Minus, ShieldCheck, Sprout, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import { useTr } from "@/lib/use-tr";

type CellValue = boolean | string;

type Row = {
  feature: string;
  featureEn: string;
  seed: CellValue;
  seedEn?: string;
  grow: CellValue;
  growEn?: string;
  bloom: CellValue;
  bloomEn?: string;
  elite: CellValue;
  eliteEn?: string;
};

const rows: Row[] = [
  { feature: "Kiểm tra ảnh lá cây", featureEn: "Leaf image check", seed: "5 lần/ngày", seedEn: "5 times/day", grow: "30 lần/ngày", growEn: "30 times/day", bloom: "Không giới hạn", bloomEn: "Unlimited", elite: "Không giới hạn", eliteEn: "Unlimited" },
  { feature: "Lưu lịch sử sử dụng", featureEn: "Usage history", seed: "7 ngày", seedEn: "7 days", grow: "30 ngày", growEn: "30 days", bloom: "Toàn bộ", bloomEn: "All", elite: "Toàn bộ", eliteEn: "All" },
  { feature: "Chat theo kết quả", featureEn: "Chat about results", seed: "3 câu/ngày", seedEn: "3 messages/day", grow: "20 câu/ngày", growEn: "20 messages/day", bloom: "Không giới hạn", bloomEn: "Unlimited", elite: "Không giới hạn", eliteEn: "Unlimited" },
  { feature: "Tư vấn nông nghiệp nâng cao", featureEn: "Advanced agriculture advice", seed: false, grow: false, bloom: true, elite: true },
  { feature: "Kế hoạch trồng cây", featureEn: "Planting plans", seed: false, grow: "2 kế hoạch", growEn: "2 plans", bloom: "10 kế hoạch", bloomEn: "10 plans", elite: "Không giới hạn", eliteEn: "Unlimited" },
  { feature: "Ưu tiên tốc độ xử lý", featureEn: "Priority processing speed", seed: false, grow: false, bloom: true, elite: true },
  { feature: "Xuất báo cáo PDF", featureEn: "Export PDF reports", seed: false, grow: false, bloom: false, elite: true },
  { feature: "Tích hợp dữ liệu nâng cao", featureEn: "Advanced data integration", seed: false, grow: false, bloom: false, elite: true },
  { feature: "Hỗ trợ", featureEn: "Support", seed: false, grow: false, bloom: "Email", bloomEn: "Email", elite: "Email + Chat", eliteEn: "Email + Chat" },
];

function Cell({ value }: { value: CellValue }) {
  if (value === false) return <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-soft text-ink-soft"><Minus size={16} aria-hidden /></span>;
  if (value === true) return <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-soft text-leaf-strong"><Check size={16} aria-hidden /></span>;
  return <span className="text-xs font-semibold text-ink-soft">{value}</span>;
}

export function ComparisonTable() {
  const tr = useTr();
  const resolve = (value: CellValue, en?: string): CellValue => (typeof value === "string" && en ? tr(value, en) : value);
  const headers = [{ name: "Seed", icon: Sprout }, { name: "Grow", icon: TrendingUp }, { name: "Bloom", icon: ShieldCheck }, { name: "Elite", icon: Crown }];
  return (
    <section>
      <div className="mb-4"><p className="text-overline text-leaf-strong">{tr("So sánh chi tiết", "Detailed comparison")}</p><h2 className="mt-2 text-h2 font-bold text-ink">{tr("Quyền lợi theo từng gói", "Benefits by plan")}</h2></div>
      <Card variant="raised" padding="none" className="overflow-x-auto rounded-xl">
        <div className="min-w-[820px]">
          <div className="grid grid-cols-[1.5fr_repeat(4,minmax(0,1fr))] bg-surface-soft px-6 py-4 text-xs font-bold text-ink">
            <div>{tr("Tính năng", "Feature")}</div>
            {headers.map(({ name, icon: Icon }) => <div key={name} className="flex items-center justify-center gap-2"><Icon size={15} className="text-leaf-strong" aria-hidden />{name}</div>)}
          </div>
          {rows.map((row) => <div key={row.feature} className="grid grid-cols-[1.5fr_repeat(4,minmax(0,1fr))] items-center gap-2 border-t border-line px-6 py-4 text-sm"><div className="font-semibold text-ink">{tr(row.feature, row.featureEn)}</div><div className="flex justify-center"><Cell value={resolve(row.seed, row.seedEn)} /></div><div className="flex justify-center"><Cell value={resolve(row.grow, row.growEn)} /></div><div className="flex justify-center"><Cell value={resolve(row.bloom, row.bloomEn)} /></div><div className="flex justify-center"><Cell value={resolve(row.elite, row.eliteEn)} /></div></div>)}
        </div>
      </Card>
    </section>
  );
}
