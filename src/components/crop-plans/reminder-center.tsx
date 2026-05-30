import { BellRing, Clock3 } from "lucide-react";

import type { ReminderItem } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ReminderCenter({
  reminders,
  onMarkRead,
}: {
  reminders: ReminderItem[];
  onMarkRead: (reminderId: number) => Promise<void>;
}) {
  return (
    <Card className="rounded-[30px] border-emerald-100/70 bg-white/90">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700/65">
            Nhắc việc
          </p>
          <h3 className="mt-3 font-display text-2xl font-semibold text-slate-950">
            Lịch thông báo của kế hoạch
          </h3>
        </div>
        <span className="rounded-full bg-emerald-100 p-3 text-emerald-700">
          <BellRing size={18} />
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {reminders.slice(0, 8).map((reminder) => (
          <div
            key={reminder.id}
            className="rounded-[24px] border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-slate-950">{reminder.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{reminder.body}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-emerald-800/80">
                  <Clock3 size={14} />
                  {new Date(reminder.trigger_time).toLocaleString("vi-VN")}
                </div>
              </div>
              {!reminder.read ? (
                <Button size="sm" variant="secondary" onClick={() => onMarkRead(reminder.id)}>
                  Đã xem
                </Button>
              ) : (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                  Đã đọc
                </span>
              )}
            </div>
          </div>
        ))}
        {!reminders.length ? (
          <div className="rounded-[24px] border border-dashed border-emerald-200 bg-emerald-50/50 p-5 text-sm leading-7 text-slate-600">
            Chưa có thông báo nào cho kế hoạch này.
          </div>
        ) : null}
      </div>
    </Card>
  );
}
