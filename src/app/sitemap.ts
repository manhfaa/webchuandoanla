import type { MetadataRoute } from "next";

import { CROPS_WITH_PAGES } from "@/data/crop-diseases";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.agromind.farm";

/**
 * Only pages worth showing in a search result.
 *
 * Deliberately absent:
 *  - /forgot-password and /reset-password: transactional, and the reset page is
 *    reached with a one-time token in the query string.
 *  - /trace/<token>: a per-record traceability page opened from a QR code on
 *    produce. Indexing those would put individual farm records into public
 *    search results, which is not what a grower printing a QR label expects.
 *    The route also carries a noindex through src/app/trace/layout.tsx.
 *  - /dashboard/*: behind authentication, nothing for a crawler to read.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/register`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },

    // The disease pages. These are the ones with a real chance of ranking: a
    // grower searching "bệnh đốm vi khuẩn cà chua" is describing a problem this
    // product solves, and the phrase has a fraction of the competition that
    // "chẩn đoán bệnh cây" does.
    { url: `${SITE}/benh-cay`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    ...CROPS_WITH_PAGES.map((crop) => ({
      url: `${SITE}/benh-cay/${crop.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
