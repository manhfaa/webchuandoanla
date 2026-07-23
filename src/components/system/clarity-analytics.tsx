import Script from "next/script";

/**
 * Microsoft Clarity (heatmaps + session analytics).
 *
 * The project id is a public identifier (it ships in the client-side tag), so
 * it is baked in as a default and can be overridden per-environment with
 * NEXT_PUBLIC_CLARITY_PROJECT_ID. Analytics only loads in production builds so
 * local dev / preview sessions never pollute the Clarity data.
 *
 * Dashboard: https://clarity.microsoft.com/projects
 */
const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || "xr2iagxmgi";

export function ClarityAnalytics() {
  if (process.env.NODE_ENV !== "production" || !CLARITY_PROJECT_ID) return null;

  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_PROJECT_ID}");`}
    </Script>
  );
}
