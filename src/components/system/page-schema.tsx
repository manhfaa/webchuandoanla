import { CROPS_WITH_PAGES, type CropWithDiseases } from "@/data/crop-diseases";
import { diseaseAnchors } from "@/lib/disease-slug";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.agromind.farm";

/**
 * JSON-LD riêng cho từng trang, bổ sung cho phần khai báo sản phẩm ở layout.
 *
 * Hai thứ được khai báo, và chỉ hai:
 *
 * - BreadcrumbList: Google hiển thị đường dẫn phân cấp thay vì URL thô trong kết
 *   quả tìm kiếm. Đây là thứ duy nhất ở đây thực sự đổi giao diện kết quả.
 * - ItemList: mô tả đúng bản chất trang — một danh sách. Mỗi mục trỏ tới một neo
 *   CÓ THẬT trên trang, dựng bằng cùng hàm mà phần hiển thị dùng.
 *
 * Cố ý KHÔNG khai báo FAQPage. Nội dung không ở dạng hỏi đáp, và từ 2023 Google
 * chỉ còn hiện rich result FAQ cho trang y tế/chính phủ có thẩm quyền — nên nó
 * vừa sai sự thật vừa vô ích.
 */
function jsonLd(data: unknown) {
  return (
    <script
      type="application/ld+json"
      // Dữ liệu, không phải markup, và mọi giá trị đều sinh từ dữ liệu trong
      // repo này chứ không phải từ đầu vào người dùng.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

function crumb(position: number, name: string, path: string) {
  return { "@type": "ListItem", position, name, item: `${SITE_URL}${path}` };
}

export function CropDiseaseSchema({ crop }: { crop: CropWithDiseases }) {
  const pageUrl = `${SITE_URL}/benh-cay/${crop.slug}`;
  const anchors = diseaseAnchors(crop.diseases.map((disease) => disease.name));

  return jsonLd({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [
          crumb(1, "Trang chủ", "/"),
          crumb(2, "Bệnh cây trồng", "/benh-cay"),
          crumb(3, crop.name, `/benh-cay/${crop.slug}`),
        ],
      },
      {
        "@type": "CollectionPage",
        "@id": pageUrl,
        url: pageUrl,
        name: `Bệnh thường gặp trên ${crop.name}`,
        description: `${crop.diseases.length} dấu hiệu sâu bệnh trên ${crop.name} mà Agromind AI nhận diện được từ ảnh lá.`,
        inLanguage: "vi-VN",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: crop.diseases.length,
          itemListElement: crop.diseases.map((disease, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: disease.name,
            url: `${pageUrl}#${anchors[index]}`,
          })),
        },
      },
    ],
  });
}

export function DiseaseIndexSchema() {
  const pageUrl = `${SITE_URL}/benh-cay`;

  return jsonLd({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [crumb(1, "Trang chủ", "/"), crumb(2, "Bệnh cây trồng", "/benh-cay")],
      },
      {
        "@type": "CollectionPage",
        "@id": pageUrl,
        url: pageUrl,
        name: "Bệnh cây trồng nhận biết được từ ảnh lá",
        inLanguage: "vi-VN",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: CROPS_WITH_PAGES.length,
          itemListElement: CROPS_WITH_PAGES.map((crop, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: `Bệnh thường gặp trên ${crop.name}`,
            url: `${SITE_URL}/benh-cay/${crop.slug}`,
          })),
        },
      },
    ],
  });
}
