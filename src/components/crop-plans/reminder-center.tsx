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
    <Card variant="default" padding="lg" className="rounded-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-overline text-leaf-strong">
            Nhắc việc
          </p>
          <h3 className="mt-3 font-display text-2xl font-bold text-ink">
            Lịch thông báo của kế hoạch
          </h3>
        </div>
        <span className="rounded-md bg-surface-soft p-3 text-leaf-strong">
          <BellRing size={18} />
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {reminders.slice(0, 8).map((reminder) => (
          <div
            key={reminder.id}
            className="rounded-lg border border-line bg-surface-soft p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-ink">{reminder.title}</p>
                <p className="mt-1 text-sm leading-6 text-ink-soft">{reminder.body}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-leaf-strong">
                  <Clock3 size={14} />
                  {new Date(reminder.trigger_time).toLocaleString("vi-VN")}
                </div>
              </div>
              {!reminder.read ? (
                <Button size="sm" variant="secondary" onClick={() => onMarkRead(reminder.id)}>
                  Đã xem
                </Button>
              ) : (
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-leaf-strong">
                  Đã đọc
                </span>
              )}
            </div>
          </div>
        ))}
        {!reminders.length ? (
          <div className="rounded-lg border border-dashed border-line bg-surface-soft p-5 text-sm leading-7 text-ink-soft">
            Chưa có thông báo nào cho kế hoạch này.
          </div>
        ) : null}
      </div>
    </Card>
  );
}
