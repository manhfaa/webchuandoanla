import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.agromind.farm";

/**
 * Note: Cloudflare currently serves its own managed robots.txt for this zone —
 * the one with AI content-signals that blocks GPTBot, ClaudeBot and friends
 * while leaving Googlebot free. That file allows search crawling but says
 * nothing about a sitemap, because it is generated and knows nothing about this
 * app.
 *
 * This route exists so the origin has an answer of its own. If Cloudflare's
 * managed file wins, nothing is lost: the sitemap is submitted directly in
 * Search Console anyway, which is the path Google actually relies on. Check
 * /robots.txt after deploying to see which one is being served.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Nothing here is secret — the dashboard needs a session and the trace
        // pages need a token — but there is no reason to spend crawl budget on
        // pages that render nothing without one.
        disallow: ["/dashboard/", "/trace/", "/reset-password", "/forgot-password"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
