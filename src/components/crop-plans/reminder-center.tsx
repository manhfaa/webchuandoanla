"use client";

import { BellRing, Clock3 } from "lucide-react";

import type { ReminderItem } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTr } from "@/lib/use-tr";

export function ReminderCenter({
  reminders,
  onMarkRead,
}: {
  reminders: ReminderItem[];
  onMarkRead: (reminderId: number) => Promise<void>;
}) {
  const tr = useTr();
  return (
    <Card variant="default" padding="lg" className="rounded-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-overline text-leaf-strong">
            {tr("Nhắc việc", "Reminders")}
          </p>
          <h3 className="mt-3 font-display text-2xl font-bold text-ink">
            {tr("Lịch thông báo của kế hoạch", "Plan notification schedule")}
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
                  {tr("Đã xem", "Seen")}
                </Button>
              ) : (
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-leaf-strong">
                  {tr("Đã đọc", "Read")}
                </span>
              )}
            </div>
          </div>
        ))}
        {!reminders.length ? (
          <div className="rounded-lg border border-dashed border-line bg-surface-soft p-5 text-sm leading-7 text-ink-soft">
            {tr("Chưa có thông báo nào cho kế hoạch này.", "No notifications for this plan yet.")}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
