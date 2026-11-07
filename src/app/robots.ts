import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.agromind.farm";

// Cloudflare prepends its managed rules to this origin file. Google's parser
// merges groups with the same user agent, so this longer path-specific allow
// lets Gemini use the public founder page without opening the whole site to
// Google-Extended or changing Cloudflare's other bot policies.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/trace/", "/reset-password", "/forgot-password"],
      },
      {
        userAgent: "Google-Extended",
        allow: ["/about", "/about/"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
