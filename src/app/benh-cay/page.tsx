import type { Metadata } from "next";

import { DiseaseIndexView } from "@/components/benh-cay/disease-index-view";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { AppShell } from "@/components/layout/layout-components";
import { DiseaseIndexSchema } from "@/components/system/page-schema";
import { CROP_DISEASES } from "@/data/crop-diseases";

const TOTAL_DISEASES = CROP_DISEASES.reduce((sum, crop) => sum + crop.diseases.length, 0);

/**
 * Metadata và JSON-LD giữ nguyên tiếng Việt và nằm sẵn trong HTML lúc build —
 * thị trường tìm kiếm là Việt Nam. Phần người dùng đọc nằm ở DiseaseIndexView,
 * một client component nên đổi được sang tiếng Anh.
 */
export const metadata: Metadata = {
  title: "Bệnh cây trồng nhận biết được từ ảnh lá | Agromind AI",
  description: `Danh sách ${TOTAL_DISEASES} dấu hiệu sâu bệnh trên ${CROP_DISEASES.length} loại cây trồng mà Agromind AI nhận diện được từ ảnh lá, kèm việc nên làm khi phát hiện dấu hiệu.`,
  alternates: { canonical: "/benh-cay" },
  openGraph: {
    title: "Bệnh cây trồng nhận biết được từ ảnh lá",
    description: `${TOTAL_DISEASES} dấu hiệu sâu bệnh trên ${CROP_DISEASES.length} loại cây trồng.`,
    url: "/benh-cay",
    images: [
      { url: "/og-image.jpg", width: 1200, height: 630, alt: "Agromind AI kiểm tra ảnh lá cây" },
    ],
  },
};

export default function DiseaseIndexPage() {
  return (
    <AppShell>
      <DiseaseIndexSchema />
      <Navbar />
      <DiseaseIndexView />
      <Footer />
    </AppShell>
  );
}
