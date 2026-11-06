"use client";

import Script from "next/script";

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

export function GoogleAnalytics() {
  if (process.env.NODE_ENV !== "production" || !GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script
        id="ga4-loader"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      {/*
        `page_location` is overridden, not left to default.

        A bare gtag('config', ID) reports document.location.href verbatim,
        query string included — and this tag is mounted in the ROOT layout, so
        it also runs on /reset-password, whose URL carries a live password-reset
        token (backend/users/emails.py:29 builds
        `{FRONTEND_ORIGIN}/reset-password?token=<raw>` and the page reads it from
        window.location.search). That token is valid for two hours. Sending it
        to Google would put an account-takeover credential into GA page-path
        reports, readable by every property viewer and exportable to BigQuery.

        Do not transmit any query parameters or fragments. They can contain
        one-time tokens or user-provided content on routes other than reset.
      */}
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}', {
  page_location: window.location.origin + window.location.pathname,
  page_referrer: ''
});`}
      </Script>
    </>
  );
}
