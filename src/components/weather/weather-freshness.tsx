"use client";

import { useEffect, useState } from "react";
import { Clock3, RefreshCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTr } from "@/lib/use-tr";

const MINUTE_MS = 60_000;

/** Past this age the reading is called out as possibly stale. */
export const STALE_AFTER_MS = 30 * MINUTE_MS;

type Tr = (vi: string, en: string) => string;

function ageText(ageMs: number, tr: Tr) {
  const minutes = Math.floor(ageMs / MINUTE_MS);
  if (minutes < 1) return tr("vừa cập nhật", "just now");
  if (minutes < 60) return tr(`${minutes} phút trước`, `${minutes} min ago`);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return tr(`${hours} giờ trước`, `${hours} h ago`);
  const days = Math.floor(hours / 24);
  return tr(`${days} ngày trước`, `${days} d ago`);
}

/**
 * Timestamp strip for the weather cards: when the reading was taken, how old it
 * is now, and a way to pull a fresh one. Without it a cached forecast is
 * indistinguishable from one fetched a second ago.
 */
export function WeatherFreshness({
  fetchedAt,
  fromServer,
  loading,
  disabled,
  onRefresh,
}: {
  fetchedAt: string | null;
  fromServer: boolean;
  loading: boolean;
  disabled?: boolean;
  onRefresh: () => void;
}) {
  const tr = useTr();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // The relative label has to keep counting while the tab stays open.
    const timer = window.setInterval(() => setNow(Date.now()), MINUTE_MS / 2);
    return () => window.clearInterval(timer);
  }, []);

  const timestamp = fetchedAt ? Date.parse(fetchedAt) : Number.NaN;
  const hasTimestamp = !Number.isNaN(timestamp);
  const age = hasTimestamp ? Math.max(0, now - timestamp) : 0;
  const stale = hasTimestamp && age >= STALE_AFTER_MS;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {hasTimestamp ? (
        <span className="flex items-center gap-1.5 text-caption text-ink-soft">
          <Clock3 strokeWidth={1.75} className="h-3.5 w-3.5" />
          {fromServer ? tr("Cập nhật lúc", "Updated at") : tr("Tải lúc", "Loaded at")}{" "}
          {new Date(timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} · {ageText(age, tr)}
        </span>
      ) : null}

      {stale ? <Badge variant="warning">{tr("Có thể đã cũ", "May be stale")}</Badge> : null}

      <Button type="button" variant="secondary" size="sm" loading={loading} disabled={disabled || loading} onClick={onRefresh}>
        <RefreshCcw strokeWidth={1.75} className="h-4 w-4" />
        {loading ? tr("Đang cập nhật...", "Refreshing...") : tr("Cập nhật", "Refresh")}
      </Button>
    </div>
  );
}
