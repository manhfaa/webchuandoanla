import { brand } from "@/constants/brand";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.agromind.farm";

/**
 * Schema.org description of the product, for search engines.
 *
 * Everything asserted here has to be true. Google penalises structured data
 * that disagrees with the page, and more to the point a rating or a review
 * count that nobody gave would be a lie told in machine-readable form. There is
 * deliberately no aggregateRating: the product has no ratings yet.
 *
 * Prices are the real ones from CLAUDE.md section 12, in VND, per 30 days.
 */
export function StructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: brand.name,
        url: SITE_URL,
        logo: `${SITE_URL}/logos/agromind_app_icon_512.png`,
        description: brand.mission,
        areaServed: { "@type": "Country", name: "Việt Nam" },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: brand.name,
        description: brand.description,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "vi-VN",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#app`,
        name: brand.name,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: brand.description,
        url: SITE_URL,
        inLanguage: "vi-VN",
        featureList: [
          "Kiểm tra ảnh lá và nhận diện dấu hiệu bệnh",
          "Đối chiếu triệu chứng với nguồn tham khảo",
          "Theo dõi lịch sử chăm sóc theo từng lô vườn",
          "Cảnh báo thời tiết và nguy cơ sâu bệnh",
          "Kế hoạch trồng theo giai đoạn",
        ],
        offers: [
          { "@type": "Offer", name: "Seed", price: "0", priceCurrency: "VND" },
          { "@type": "Offer", name: "Grow", price: "9000", priceCurrency: "VND" },
          { "@type": "Offer", name: "Bloom", price: "39000", priceCurrency: "VND" },
          { "@type": "Offer", name: "Elite", price: "99000", priceCurrency: "VND" },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is data, not markup, and the values above are all
      // literals from this codebase rather than anything a user supplied.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
