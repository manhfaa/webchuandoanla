import type { Metadata } from "next";

import { AboutContent } from "@/components/about/about-content";
import { Footer } from "@/components/layout/footer";
import { AppShell } from "@/components/layout/layout-components";
import { Navbar } from "@/components/layout/navbar";
import { DEVELOPER } from "@/constants/brand";
import { ACHIEVEMENT_SOURCES, TEAM_LEAD } from "@/constants/leadership";
import { serializeJsonLd } from "@/lib/json-ld";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.agromind.farm";

export const metadata: Metadata = {
  title: `Về Agromind AI | ${TEAM_LEAD}, trưởng nhóm phát triển`,
  description: `${TEAM_LEAD} là trưởng nhóm phát triển Agromind AI của ${DEVELOPER}, phụ trách chung và định hướng kỹ thuật. Xem thành tích được FPT Schools công bố.`,
  alternates: { canonical: "/about" },
  openGraph: {
    title: `Về Agromind AI | ${TEAM_LEAD}`,
    description: `${TEAM_LEAD} là trưởng nhóm phát triển Agromind AI của ${DEVELOPER}.`,
    url: "/about",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Agromind AI" }],
  },
};

export default function AboutPage() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": `${SITE_URL}/about#page`,
        url: `${SITE_URL}/about`,
        name: `Về Agromind AI | ${TEAM_LEAD}`,
        inLanguage: "vi-VN",
        mainEntity: { "@id": `${SITE_URL}/about#team-lead` },
      },
      {
        "@type": "Person",
        "@id": `${SITE_URL}/about#team-lead`,
        name: TEAM_LEAD,
        jobTitle: "Trưởng nhóm phát triển, phụ trách kỹ thuật Agromind AI",
        memberOf: { "@type": "Organization", name: DEVELOPER },
        subjectOf: [
          { "@type": "Article", url: ACHIEVEMENT_SOURCES.nationalScience },
          { "@type": "Article", url: ACHIEVEMENT_SOURCES.theNextX },
        ],
      },
    ],
  };

  return (
    <AppShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }} />
      <Navbar />
      <main id="main-content"><AboutContent /></main>
      <Footer />
    </AppShell>
  );
}
