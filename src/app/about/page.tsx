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
  title: `${TEAM_LEAD} | Người sáng lập Agromind AI, trưởng nhóm Green Green`,
  description: `${TEAM_LEAD} sáng lập Agromind AI, là trưởng nhóm Green Green và phụ trách kỹ thuật sản phẩm. Cùng DermAI đạt Giải Ba khoa học kỹ thuật quốc gia; dẫn dắt Green Green vô địch The NextX 2026.`,
  alternates: { canonical: "/about" },
  openGraph: {
    title: `${TEAM_LEAD} | Người sáng lập Agromind AI`,
    description: `${TEAM_LEAD} sáng lập Agromind AI, dẫn dắt Green Green tại The NextX 2026 và phụ trách kỹ thuật sản phẩm.`,
    url: "/about",
    images: [{ url: "/about/pham-duc-manh.jpg", width: 1600, height: 1067, alt: "Phạm Đức Mạnh giới thiệu Agromind AI" }],
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
        jobTitle: "Người sáng lập Agromind AI; trưởng nhóm Green Green; phụ trách kỹ thuật",
        image: `${SITE_URL}/about/pham-duc-manh.jpg`,
        description: `${TEAM_LEAD} sáng lập Agromind AI, dẫn dắt Green Green tại The NextX 2026 và phụ trách chung, định hướng kỹ thuật sản phẩm.`,
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
