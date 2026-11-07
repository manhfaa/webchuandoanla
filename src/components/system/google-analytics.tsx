"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef } from "react";

/**
 * Google Analytics 4, mounted only after a separate analytics choice.
 *
 * The GA Measurement ID is NOT baked in as a default. A wrong id here would
 * not fail loudly — it would quietly ship this
 * site's traffic into somebody else's property — so the tag simply does not
 * render until NEXT_PUBLIC_GA_MEASUREMENT_ID is set. Absent id means no
 * analytics, which is the safe direction to fail.
 *
 * The id is public (it ships in the client tag), so NEXT_PUBLIC_ is correct
 * here; it is an identifier, not a secret.
 *
 * Production builds only, so local dev and Vercel previews never pollute
 * the reporting.
 *
 * Where to find the id: Google Analytics → Admin → Data Streams → your web
 * stream → "Measurement ID", formatted G-XXXXXXXXXX.
 */
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

type AnalyticsWindow = Window & {
  dataLayer?: IArguments[];
  gtag?: (...args: unknown[]) => void;
};

export function GoogleAnalytics() {
  const pathname = usePathname();
  const initialized = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !GA_MEASUREMENT_ID || !pathname) return;

    const analyticsWindow = window as AnalyticsWindow;
    const safePathname = pathname.replace(/^\/trace\/[^/]+/, "/trace/[token]");
    if (!initialized.current) {
      analyticsWindow.dataLayer ??= [];
      analyticsWindow.gtag = function () {
        analyticsWindow.dataLayer?.push(arguments);
      };
      analyticsWindow.gtag("js", new Date());
      // The GA4 stream has enhanced measurement disabled to prevent raw history URLs.
      analyticsWindow.gtag("config", GA_MEASUREMENT_ID, {
        send_page_view: false,
        page_location: window.location.origin + safePathname,
        page_referrer: "",
      });
      initialized.current = true;
    }

    analyticsWindow.gtag?.("event", "page_view", {
      page_location: window.location.origin + safePathname,
      page_referrer: "",
    });
  }, [pathname]);

  if (process.env.NODE_ENV !== "production" || !GA_MEASUREMENT_ID) return null;

  return (
    <Script
      id="ga4-loader"
      strategy="afterInteractive"
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
    />
  );
}
