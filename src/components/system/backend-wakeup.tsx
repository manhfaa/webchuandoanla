"use client";

import { useEffect } from "react";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const RETRY_DELAYS_MS = [0, 8000, 20000];

export function BackendWakeup() {
  useEffect(() => {
    if (!BACKEND_BASE_URL) return;

    const controller = new AbortController();
    const timers: ReturnType<typeof setTimeout>[] = [];
    const healthUrl = `${BACKEND_BASE_URL.replace(/\/+$/, "")}/api/health/`;

    RETRY_DELAYS_MS.forEach((delay) => {
      const timer = setTimeout(() => {
        void fetch(healthUrl, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        }).catch(() => {
          // A sleeping Render instance may time out once; later retries wake it.
        });
      }, delay);
      timers.push(timer);
    });

    return () => {
      controller.abort();
      timers.forEach(clearTimeout);
    };
  }, []);

  return null;
}
