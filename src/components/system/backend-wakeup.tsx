"use client";

import { useEffect } from "react";

import { resolveDjangoBaseUrl } from "@/lib/backend-url";

const BACKEND_BASE_URL = resolveDjangoBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

export function BackendWakeup() {
  useEffect(() => {
    if (!BACKEND_BASE_URL) return;

    const controller = new AbortController();
    const healthUrl = `${BACKEND_BASE_URL.replace(/\/+$/, "")}/api/health/`;

    void fetch(healthUrl, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    }).catch(() => {
      // The health check is best-effort; normal API requests still surface errors.
    });

    return () => {
      controller.abort();
    };
  }, []);

  return null;
}
