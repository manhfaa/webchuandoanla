"use client";

import { LockKeyhole, MessageSquareHeart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function LockedPanel({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <Card variant="soft" padding="lg" className="flex min-h-[360px] flex-col items-center justify-center rounded-xl text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-surface text-leaf-strong shadow-sm"><LockKeyhole size={22} aria-hidden /></span>
      <h3 className="mt-5 font-display text-2xl font-bold tracking-[-0.025em] text-ink">Tư vấn nông nghiệp nâng cao chưa có trong gói hiện tại</h3>
      <p className="mt-3 max-w-xl text-sm leading-7 text-ink-soft">Nâng cấp để mở thêm luồng hỏi đáp về đất, nước, dinh dưỡng, sâu bệnh và lịch chăm sóc. Đây là trợ lý kiến thức, không phải kết nối trực tiếp với chuyên gia con người.</p>
      <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-xs font-semibold text-ink-soft"><MessageSquareHeart size={15} className="text-leaf-strong" aria-hidden /> Hỗ trợ nội dung nông nghiệp tổng quát</div>
      <Button className="mt-6" onClick={onUpgrade}>Xem gói phù hợp</Button>
    </Card>
  );
}
