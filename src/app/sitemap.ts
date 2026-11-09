import type { MetadataRoute } from "next";

import { CROPS_WITH_PAGES } from "@/data/crop-diseases";
import { FIELD_GUIDES } from "@/data/field-guides";

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
  // Omit lastModified until editorial changes are tracked per page. A build
  // timestamp would claim unchanged content was updated on every deployment.
  return [
    { url: `${SITE}/` },
    { url: `${SITE}/register` },
    { url: `${SITE}/login` },
    { url: `${SITE}/terms` },
    { url: `${SITE}/privacy` },
    { url: `${SITE}/support` },
    { url: `${SITE}/about` },
    { url: `${SITE}/huong-dan` },
    { url: `${SITE}/quy-trinh` },
    { url: `${SITE}/tinh-nang` },
    { url: `${SITE}/bang-gia` },

    // The disease pages. These are the ones with a real chance of ranking: a
    // grower searching "bệnh đốm vi khuẩn cà chua" is describing a problem this
    // product solves, and the phrase has a fraction of the competition that
    // "chẩn đoán bệnh cây" does.
    { url: `${SITE}/benh-cay` },
    ...CROPS_WITH_PAGES.map((crop) => ({
      url: `${SITE}/benh-cay/${crop.slug}`,
    })),
    { url: `${SITE}/cam-nang` },
    ...FIELD_GUIDES.map((guide) => ({ url: `${SITE}/cam-nang/${guide.slug}` })),
  ];
}
