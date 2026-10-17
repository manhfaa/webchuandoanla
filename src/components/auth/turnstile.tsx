"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

function getApi(): TurnstileApi | undefined {
  return (window as Window & { turnstile?: TurnstileApi }).turnstile;
}

export function Turnstile({
  onToken,
  resetKey = 0,
}: {
  onToken: (token: string) => void;
  resetKey?: number;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const callback = useRef(onToken);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    callback.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!ready || !siteKey || !container.current || !getApi() || widgetId.current) return;
    widgetId.current = getApi()!.render(container.current, {
      sitekey: siteKey,
      action: "register",
      theme: "auto",
      callback: (token: string) => callback.current(token),
      "expired-callback": () => callback.current(""),
      "error-callback": () => callback.current(""),
    });
    return () => {
      if (widgetId.current && getApi()) getApi()!.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [ready, siteKey]);

  useEffect(() => {
    if (resetKey && widgetId.current) {
      getApi()?.reset(widgetId.current);
      callback.current("");
    }
  }, [resetKey]);

  if (!siteKey) {
    return <p role="alert" className="text-sm text-danger-ink">Xác minh đăng ký chưa được cấu hình. Vui lòng thử lại sau.</p>;
  }

  return (
    <div aria-label="Xác minh an toàn" className="min-h-16">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <div ref={container} />
    </div>
  );
}
