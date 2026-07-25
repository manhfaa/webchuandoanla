"use client";

import { Check, Crown, Minus, ShieldCheck, Sprout, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { ServicePlanDto } from "@/lib/payments-client";
import { useTr } from "@/lib/use-tr";

type CellValue = boolean | string;

type Cell = { value: CellValue; valueEn?: string };

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
  /** Reads the live catalogue so a quota is never claimed here alone. */
  fromCatalogue?: (plan: ServicePlanDto) => Cell | null;
};

function readNumber(metadata: Record<string, unknown> | undefined, key: string): number | null {
  const value = metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** The catalogue stores 0 as "no cap", which must never read as "none". */
function quotaCell(amount: number | null, unit: { vi: string; en: string }, unlimited: { vi: string; en: string }): Cell | null {
  if (amount === null) return null;
  if (amount <= 0) return { value: unlimited.vi, valueEn: unlimited.en };
  return { value: `${amount} ${unit.vi}`, valueEn: `${amount} ${unit.en}` };
}

const rows: Row[] = [
  {
    feature: "Kiểm tra ảnh lá cây", featureEn: "Leaf image check",
    seed: "5 lần/ngày", seedEn: "5 times/day", grow: "30 lần/ngày", growEn: "30 times/day", bloom: "Không giới hạn", bloomEn: "Unlimited", elite: "Không giới hạn", eliteEn: "Unlimited",
    fromCatalogue: (plan) => quotaCell(readNumber(plan.metadata, "daily_diagnoses"), { vi: "lần/ngày", en: "times/day" }, { vi: "Không giới hạn", en: "Unlimited" }),
  },
  {
    feature: "Lưu lịch sử sử dụng", featureEn: "Usage history",
    seed: "7 ngày", seedEn: "7 days", grow: "30 ngày", growEn: "30 days", bloom: "Toàn bộ", bloomEn: "All", elite: "Toàn bộ", eliteEn: "All",
    fromCatalogue: (plan) => quotaCell(readNumber(plan.metadata, "history_days"), { vi: "ngày", en: "days" }, { vi: "Toàn bộ", en: "All" }),
  },
  {
    feature: "Chat theo kết quả", featureEn: "Chat about results",
    seed: "3 câu/ngày", seedEn: "3 messages/day", grow: "20 câu/ngày", growEn: "20 messages/day", bloom: "Không giới hạn", bloomEn: "Unlimited", elite: "Không giới hạn", eliteEn: "Unlimited",
    fromCatalogue: (plan) => quotaCell(readNumber(plan.metadata, "chat_daily"), { vi: "câu/ngày", en: "messages/day" }, { vi: "Không giới hạn", en: "Unlimited" }),
  },
  {
    feature: "Tư vấn nông nghiệp nâng cao", featureEn: "Advanced agriculture advice",
    seed: false, grow: false, bloom: true, elite: true,
    fromCatalogue: (plan) => ({ value: plan.expert_chat_enabled }),
  },
  {
    feature: "Kế hoạch trồng cây", featureEn: "Planting plans",
    seed: false, grow: "2 kế hoạch", growEn: "2 plans", bloom: "10 kế hoạch", bloomEn: "10 plans", elite: "Không giới hạn", eliteEn: "Unlimited",
    fromCatalogue: (plan) => {
      const amount = readNumber(plan.metadata, "crop_plans");
      if (amount === null) return null;
      if (amount === 0) return { value: false };
      return quotaCell(amount, { vi: "kế hoạch", en: "plans" }, { vi: "Không giới hạn", en: "Unlimited" });
    },
  },
  { feature: "Ưu tiên tốc độ xử lý", featureEn: "Priority processing speed", seed: false, grow: false, bloom: true, elite: true },
  {
    feature: "Xuất báo cáo PDF", featureEn: "Export PDF reports",
    seed: false, grow: false, bloom: false, elite: true,
    fromCatalogue: (plan) => ({ value: plan.metadata?.reports === true }),
  },
  { feature: "Tích hợp dữ liệu nâng cao", featureEn: "Advanced data integration", seed: false, grow: false, bloom: false, elite: true },
  { feature: "Hỗ trợ", featureEn: "Support", seed: false, grow: false, bloom: "Email", bloomEn: "Email", elite: "Email + Chat", eliteEn: "Email + Chat" },
];

function Cell({ value }: { value: CellValue }) {
  const tr = useTr();
  if (value === false) return <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-soft text-ink-soft"><Minus size={16} aria-hidden /><span className="sr-only">{tr("Không có", "Not included")}</span></span>;
  if (value === true) return <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-soft text-leaf-strong"><Check size={16} aria-hidden /><span className="sr-only">{tr("Có", "Included")}</span></span>;
  return <span className="text-xs font-semibold text-ink-soft">{value}</span>;
}

export function ComparisonTable({ catalogue = null }: { catalogue?: ServicePlanDto[] | null }) {
  const tr = useTr();
  const resolve = (value: CellValue, en?: string): CellValue => (typeof value === "string" && en ? tr(value, en) : value);
  const cellFor = (row: Row, slug: "seed" | "grow" | "bloom" | "elite", fallback: CellValue, fallbackEn?: string): CellValue => {
    const plan = catalogue?.find((item) => item.slug === slug);
    const live = plan && row.fromCatalogue ? row.fromCatalogue(plan) : null;
    return live ? resolve(live.value, live.valueEn) : resolve(fallback, fallbackEn);
  };
  const headers = [{ name: "Seed", icon: Sprout }, { name: "Grow", icon: TrendingUp }, { name: "Bloom", icon: ShieldCheck }, { name: "Elite", icon: Crown }];
  return (
    <section>
      <div className="mb-4"><p className="text-overline text-leaf-strong">{tr("So sánh chi tiết", "Detailed comparison")}</p><h2 className="mt-2 text-h2 font-bold text-ink">{tr("Quyền lợi theo từng gói", "Benefits by plan")}</h2></div>
      <Card variant="raised" padding="none" className="overflow-x-auto rounded-xl">
        <table className="w-full min-w-[820px] table-fixed border-collapse">
          <caption className="sr-only">{tr("So sánh quyền lợi của các gói Seed, Grow, Bloom và Elite", "Comparison of benefits across the Seed, Grow, Bloom and Elite plans")}</caption>
          <colgroup>
            <col className="w-[27.3%]" />
            <col className="w-[18.1%]" />
            <col className="w-[18.1%]" />
            <col className="w-[18.1%]" />
            <col className="w-[18.1%]" />
          </colgroup>
          <thead>
            <tr className="bg-surface-soft text-xs font-bold text-ink">
              <th scope="col" className="px-6 py-4 text-left font-bold">{tr("Tính năng", "Feature")}</th>
              {headers.map(({ name, icon: Icon }) => (
                <th key={name} scope="col" className="px-2 py-4 font-bold last:pr-6">
                  <span className="flex items-center justify-center gap-2"><Icon size={15} className="text-leaf-strong" aria-hidden />{name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.feature} className="border-t border-line text-sm">
                <th scope="row" className="px-6 py-4 text-left text-sm font-semibold text-ink">{tr(row.feature, row.featureEn)}</th>
                <td className="px-2 py-4 text-center align-middle"><Cell value={cellFor(row, "seed", row.seed, row.seedEn)} /></td>
                <td className="px-2 py-4 text-center align-middle"><Cell value={cellFor(row, "grow", row.grow, row.growEn)} /></td>
                <td className="px-2 py-4 text-center align-middle"><Cell value={cellFor(row, "bloom", row.bloom, row.bloomEn)} /></td>
                <td className="px-2 py-4 pr-6 text-center align-middle"><Cell value={cellFor(row, "elite", row.elite, row.eliteEn)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
