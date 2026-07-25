"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";

import type { ReminderItem } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/skeleton";
import { fetchReminders, markReminderRead, type ReminderFilter } from "@/lib/crop-plans-client";
import { withViFallback } from "@/lib/crop-plan-labels";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 8;

const filters: Array<{ key: ReminderFilter; vi: string; en: string }> = [
  { key: "today", vi: "Hôm nay", en: "Today" },
  { key: "missed", vi: "Quá hạn", en: "Missed" },
  { key: "upcoming", vi: "Sắp tới", en: "Upcoming" },
  { key: "unread", vi: "Chưa xem", en: "Unread" },
];

export function ReminderCenter({
  accessToken,
  planId,
  defaultFilter = "today",
  refreshKey = 0,
  title,
  titleEn,
}: {
  accessToken: string | null;
  planId?: number | string;
  defaultFilter?: ReminderFilter;
  refreshKey?: number;
  title?: string;
  titleEn?: string;
}) {
  const tr = useTr();
  const [filter, setFilter] = useState<ReminderFilter>(defaultFilter);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ReminderItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await fetchReminders(accessToken, { filter, planId, page, pageSize: PAGE_SIZE });
      setItems(data.results);
      setTotal(data.count);
      setHasNext(Boolean(data.next));
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("Không tải được nhắc việc.", "Could not load reminders."));
    } finally {
      setLoading(false);
    }
  }, [accessToken, filter, page, planId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function handleMarkRead(reminder: ReminderItem) {
    if (!accessToken) return;
    try {
      setPendingId(reminder.id);
      setError(null);
      await markReminderRead(accessToken, reminder.id, !reminder.read);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("Không cập nhật được nhắc việc.", "Could not update the reminder."));
    } finally {
      setPendingId(null);
    }
  }

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Card variant="default" padding="lg" className="rounded-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-overline text-leaf-strong">
            {tr("Nhắc việc", "Reminders")}
          </p>
          <h3 className="mt-3 font-display text-2xl font-bold text-ink">
            {tr(title ?? "Lịch thông báo của kế hoạch", titleEn ?? "Plan notification schedule")}
          </h3>
        </div>
        <span className="rounded-md bg-surface-soft p-3 text-leaf-strong">
          <BellRing size={18} />
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setFilter(item.key);
              setPage(1);
            }}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-semibold transition duration-180",
              filter === item.key
                ? "bg-leaf text-on-leaf"
                : "bg-surface-soft text-ink-soft ring-1 ring-line hover:text-ink",
            )}
          >
            {tr(item.vi, item.en)}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm leading-6 text-danger-ink">
          {error}{" "}
          <button type="button" className="font-semibold underline" onClick={() => void load()}>
            {tr("Thử lại", "Try again")}
          </button>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {loading ? <ListSkeleton count={3} itemClassName="h-[96px]" /> : null}

        {!loading
          ? items.map((reminder) => (
              <div key={reminder.id} className="rounded-lg border border-line bg-surface-soft p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-ink">{tr(reminder.title, withViFallback(reminder.title, reminder.title_en))}</p>
                    <p className="mt-1 text-sm leading-6 text-ink-soft">{tr(reminder.body, withViFallback(reminder.body, reminder.body_en))}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-leaf-strong">
                      <Clock3 size={14} />
                      {new Date(reminder.trigger_time).toLocaleString("vi-VN")}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void handleMarkRead(reminder)}
                    loading={pendingId === reminder.id}
                    disabled={pendingId === reminder.id}
                  >
                    {reminder.read ? tr("Đánh dấu chưa xem", "Mark unread") : tr("Đã xem", "Seen")}
                  </Button>
                </div>
              </div>
            ))
          : null}

        {!loading && !error && !items.length ? (
          <div className="rounded-lg border border-dashed border-line bg-surface-soft p-5 text-sm leading-7 text-ink-soft">
            {tr("Chưa có thông báo nào cho mục này.", "No notifications in this view yet.")}
          </div>
        ) : null}
      </div>

      {total > PAGE_SIZE ? (
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-xs text-ink-soft">
            {tr(`Trang ${page}/${lastPage} · ${total} nhắc việc`, `Page ${page}/${lastPage} · ${total} reminders`)}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || loading}
            >
              <ChevronLeft size={14} />
              {tr("Trước", "Previous")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPage((current) => current + 1)}
              disabled={!hasNext || loading}
            >
              {tr("Sau", "Next")}
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
