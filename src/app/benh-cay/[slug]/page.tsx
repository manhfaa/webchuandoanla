import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CropDiseaseView } from "@/components/benh-cay/crop-disease-view";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { AppShell } from "@/components/layout/layout-components";
import { CropDiseaseSchema } from "@/components/system/page-schema";
import { CROPS_WITH_PAGES, findCropDiseases } from "@/data/crop-diseases";

/**
 * Trang này cố ý vẫn là server component.
 *
 * Metadata và JSON-LD phải nằm sẵn trong HTML lúc build, và chúng giữ nguyên
 * tiếng Việt: thị trường tìm kiếm của sản phẩm là Việt Nam, nên tiêu đề, mô tả
 * và breadcrumb không đổi theo ngôn ngữ người dùng chọn trong giao diện.
 *
 * Phần người dùng thật sự đọc nằm ở CropDiseaseView — một client component, nên
 * nó dùng được useTr() và đổi được sang tiếng Anh.
 */

export function generateStaticParams() {
  return CROPS_WITH_PAGES.map((crop) => ({ slug: crop.slug }));
}

/**
 * Tiêu đề nhồi được nhiều tên bệnh nhất trong giới hạn Google hiển thị.
 *
 * Google cắt tiêu đề quanh 60 ký tự. Hậu tố thương hiệu chiếm 14, nên phần còn
 * lại được dùng để liệt kê tên bệnh — mỗi tên là một truy vấn riêng mà trang có
 * thể xếp hạng, thay vì một câu chung chung không ai gõ.
 */
const TITLE_SUFFIX = " | Agromind AI";
const TITLE_BUDGET = 60;

function titleFor(crop: { name: string; diseases: { name: string }[] }): string {
  const base = `Bệnh ${crop.name.toLowerCase()}`;
  const picked: string[] = [];

  for (const disease of crop.diseases) {
    const name = disease.name.toLowerCase();
    const next = `${base}: ${[...picked, name].join(", ")}${TITLE_SUFFIX}`;
    if (next.length > TITLE_BUDGET) break;
    picked.push(name);
  }

  // Cây có tên bệnh dài tới mức không nhét nổi cái nào thì quay về câu mô tả.
  if (!picked.length) return `Bệnh thường gặp trên ${crop.name}${TITLE_SUFFIX}`;
  return `${base}: ${picked.join(", ")}${TITLE_SUFFIX}`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const crop = findCropDiseases(slug);
  if (!crop) return {};

  const names = crop.diseases.map((d) => d.name.toLowerCase()).slice(0, 4).join(", ");
  return {
    // Tiêu đề cũ — "Bệnh thường gặp trên X và cách nhận biết" — không chứa tên
    // bệnh nào, trong khi tên bệnh mới là nhóm từ khoá một tên miền vài ngày
    // tuổi có cơ hội thắng. "bệnh cà chua" thì không.
    title: titleFor(crop),
    // Google cắt mô tả quanh 155 ký tự. Bản cũ dài 190-210 và luôn bị cắt đúng
    // vào câu hứa hành động, nên phần người đọc thấy chỉ còn danh sách tên bệnh.
    description: `${crop.diseases.length} dấu hiệu sâu bệnh trên ${crop.name}: ${names}. Cách nhận biết và việc nên làm ngay.`,
    alternates: { canonical: `/benh-cay/${crop.slug}` },
    openGraph: {
      title: `Bệnh thường gặp trên ${crop.name}`,
      description: `Nhận biết ${crop.diseases.length} dấu hiệu sâu bệnh trên ${crop.name} từ ảnh lá.`,
      url: `/benh-cay/${crop.slug}`,
      // Khai openGraph ở trang con THAY THẾ toàn bộ openGraph của layout, kể cả
      // images. Thiếu dòng này thì 15 trang /benh-cay chia sẻ lên Zalo hay
      // Facebook đều hiện ra không có ảnh.
      images: [
        { url: "/og-image.jpg", width: 1200, height: 630, alt: "Agromind AI kiểm tra ảnh lá cây" },
      ],
    },
  };
}

export default async function CropDiseasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const crop = findCropDiseases(slug);
  if (!crop || crop.diseases.length < 2) notFound();

  return (
    <AppShell>
      <CropDiseaseSchema crop={crop} />
      <Navbar />
      <CropDiseaseView crop={crop} />
      <Footer />
    </AppShell>
  );
}
