"use client";

import { LockKeyhole, MessageSquareHeart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function LockedPanel({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <Card className="flex min-h-[400px] flex-col items-center justify-center rounded-[34px] border-white/10 bg-white/5 text-center text-white">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-lime-200">
        <LockKeyhole size={24} />
      </div>
      <h3 className="mt-6 font-display text-3xl font-semibold">
        Chat chuyên gia đang bị khóa
      </h3>
      <p className="mt-4 max-w-xl text-sm leading-7 text-emerald-50/80">
        Gói Plus mở khóa kênh trao đổi chuyên sâu với chuyên gia nông nghiệp để bạn nhận thêm góc
        nhìn thực tế ngoài hiện trường.
      </p>
      <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-emerald-50/75">
        <MessageSquareHeart size={16} className="text-lime-200" />
        Mở thêm lớp tư vấn chuyên sâu cho người dùng cần theo dõi thực địa
      </div>
      <Button className="mt-6" onClick={onUpgrade}>
        Nâng cấp lên Plus
      </Button>
    </Card>
  );
}
