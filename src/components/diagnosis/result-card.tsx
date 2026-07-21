"use client";

import { ExternalLink, Leaf, LockKeyhole, Sparkles } from "lucide-react";

import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfidenceMeter } from "@/components/ui/confidence-meter";
import { SourceList } from "@/components/ui/source-list";
import { EmptyState } from "@/components/ui/states";
import { toUserFacingText } from "@/lib/user-facing-copy";
import type { DiagnosisRecord } from "@/types";

type ResearchSource = { id?: number; title?: string; url?: string };
type ResearchPayload = { compatibilitySources?: ResearchSource[]; treatmentSources?: ResearchSource[] };

function getResearchSources(record: DiagnosisRecord) {
  const payload = record.cnnPayload?.tavily_research as ResearchPayload | null | undefined;
  const sourceMap = new Map<string, ResearchSource>();
  for (const source of [...(payload?.compatibilitySources ?? []), ...(payload?.treatmentSources ?? [])]) {
    if (source.url && !sourceMap.has(source.url)) sourceMap.set(source.url, source);
  }
  return Array.from(sourceMap.values()).slice(0, 6);
}

function sourceDomain(url?: string) {
  if (!url) return "Nguồn tham khảo";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Nguồn tham khảo";
  }
}

function customerTitle(title: string) {
  return toUserFacingText(title
    .replace(/Top 5 CNN[^:]*/gi, "Các khả năng khác từ ảnh")
    .replace(/Kết luận cuối cùng từ DeepSeek/gi, "Kết luận sau khi đối chiếu")
    .replace(/Kiểm chứng triệu chứng bằng Tavily/gi, "Đối chiếu triệu chứng với nguồn tham khảo"));
}

function customerText(text: string) {
  return toUserFacingText(text);
}

function renderRecommendationItem(rawItem: string) {
  const item = customerText(rawItem);
  const sourceMatch = item.match(/^(\[\d+\])\s*(.*?):\s*(https?:\/\/\S+)$/);
  if (sourceMatch) {
    const [, index, title, url] = sourceMatch;
    return <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-leaf-strong hover:text-leaf"><span>{index} {title}</span><ExternalLink size={13} aria-hidden /></a>;
  }
  const urlMatch = item.match(/https?:\/\/\S+/);
  if (urlMatch) {
    const url = urlMatch[0];
    return <span>{item.slice(0, urlMatch.index)}<a href={url} target="_blank" rel="noreferrer" className="font-semibold text-leaf-strong hover:text-leaf">Mở nguồn tham khảo <ExternalLink className="inline h-3.5 w-3.5" aria-hidden /></a></span>;
  }
  return <span>{item}</span>;
}

export function DiagnosisResultCard({
  record,
  locked,
  onUpgrade,
  detailsOnly = false,
}: {
  record: DiagnosisRecord | null;
  locked?: boolean;
  onUpgrade?: () => void;
  detailsOnly?: boolean;
}) {
  if (!record) {
    return (
      <Card variant="raised" padding="lg" className="rounded-xl">
        <EmptyState title="Kết quả sẽ xuất hiện tại đây" description="Chọn hoặc chụp ảnh lá, sau đó hoàn tất các bước kiểm tra để xem gợi ý và việc nên làm." icon={Leaf} />
      </Card>
    );
  }

  const confidence = record.cnnConfidence ?? record.confidence ?? 0;
  const sources = getResearchSources(record);
  const sourceItems = sources
    .filter((source): source is ResearchSource & { url: string } => Boolean(source.url))
    .map((source, index) => ({
      title: `[${source.id ?? index + 1}] ${source.title || sourceDomain(source.url)}`,
      url: source.url,
      domain: sourceDomain(source.url),
    }));
  const recommendationSections = detailsOnly
    ? record.recommendations.filter((section) => !/khuyến nghị hành động|bạn có thể làm tiếp|để ảnh rõ hơn/i.test(section.title))
    : record.recommendations;
  const status = confidence >= 0.7 ? { state: "healthy" as const, label: "Tin cậy cao" } : { state: "watch" as const, label: "Cần theo dõi" };

  return (
    <Card variant="raised" padding="lg" className="overflow-hidden rounded-xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-overline text-leaf-strong">{detailsOnly ? "Thông tin bổ sung" : "Bước 4 · Kết quả"}</p>
          <h2 className="mt-2 font-display text-[30px] font-bold tracking-[-0.035em] text-ink">{detailsOnly ? "Các khả năng khác và nguồn đối chiếu" : "Kết quả kiểm tra ảnh lá"}</h2>
          <p className="mt-2 text-sm text-ink-soft">{detailsOnly ? "Xem thêm cơ sở tham khảo cho kết luận chính ở trên." : "Xem gợi ý chính, mức tin cậy và các bước nên thực hiện tiếp theo."}</p>
        </div>
        {!detailsOnly ? <StatusBadge status={status.state} label={status.label} /> : null}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[0.86fr_1.14fr]">
        <div className="space-y-4">
          {!detailsOnly ? <div className="rounded-xl bg-forest p-6 text-on-forest">
            <Badge className="bg-on-forest/10 text-on-forest">{record.plant || "Chưa xác định cây"}</Badge>
            <p className="mt-6 text-overline text-on-forest-muted">Khả năng cao nhất</p>
            <h3 className="mt-2 font-display text-[30px] font-bold leading-tight tracking-[-0.03em] text-on-forest">{record.disease || "Chưa có gợi ý bệnh"}</h3>
            <ConfidenceMeter score={confidence} tone="dark" className="mt-6" />
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-on-forest/10 pt-5 text-sm">
              <div><p className="text-xs text-on-forest-muted">Ảnh đầu vào</p><p className="mt-1 font-semibold text-on-forest">Ảnh lá hợp lệ</p></div>
              <div><p className="text-xs text-on-forest-muted">Nguồn ảnh</p><p className="mt-1 font-semibold text-on-forest">{record.inputMethod === "capture" ? "Ảnh chụp" : "Ảnh tải lên"}</p></div>
            </div>
          </div> : null}

          {sourceItems.length ? (
            <div className="rounded-xl border border-line bg-surface-soft p-5">
              <p className="text-overline text-leaf-strong">Nguồn tham khảo</p>
              <p className="mt-2 text-xs leading-6 text-ink-soft">Mở nguồn để tự đối chiếu thông tin đã được tổng hợp.</p>
              <div className="mt-3"><SourceList sources={sourceItems} /></div>
            </div>
          ) : detailsOnly ? <EmptyState title="Chưa có nguồn đối chiếu" description="Nguồn tham khảo chỉ xuất hiện khi bạn nhập triệu chứng và bước đối chiếu hoàn tất." icon={ExternalLink} /> : null}
        </div>

        <div className="space-y-4">
          {!detailsOnly ? <div className="rounded-xl bg-surface-soft p-5">
            <p className="text-sm font-bold text-ink">Tình trạng hiện tại</p>
            <p className="mt-3 text-sm leading-7 text-ink-soft">{customerText(record.symptomSummary)}</p>
          </div> : null}

          <div className="rounded-xl border border-line bg-surface p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-ink"><Sparkles size={16} className="text-leaf-strong" aria-hidden /> {detailsOnly ? "Thông tin đã đối chiếu" : "Giải thích và việc nên làm"}</p>
            <div className="mt-5 space-y-5">
              {recommendationSections.map((section) => (
                <section key={section.title}>
                  <h4 className="text-sm font-bold text-ink">{customerTitle(section.title)}</h4>
                  <ul className="mt-2 space-y-2">
                    {section.items.slice(0, locked ? 1 : section.items.length).filter((item) => customerText(item).trim()).map((item) => (
                      <li key={item} className="flex gap-2 rounded-lg bg-surface-soft px-3 py-3 text-sm leading-7 text-ink-soft">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf" aria-hidden />
                        <span>{renderRecommendationItem(item)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>

      {locked && !detailsOnly ? (
        <div className="mt-5 flex flex-col items-start justify-between gap-4 rounded-xl border border-line bg-surface-soft p-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface text-leaf-strong"><LockKeyhole size={18} aria-hidden /></span>
            <div><p className="text-sm font-bold text-ink">Mở rộng phần hỏi đáp về kết quả</p><p className="mt-1 text-xs leading-6 text-ink-soft">Bạn vẫn xem được kết quả chính. Nâng cấp nếu muốn dùng thêm hỗ trợ trò chuyện theo ca đã lưu.</p></div>
          </div>
          <Button size="sm" onClick={onUpgrade}>Xem gói phù hợp</Button>
        </div>
      ) : null}
    </Card>
  );
}
