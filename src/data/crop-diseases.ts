import { supportedPlants } from "@/data/mock/plants";

/**
 * Cây trồng và các bệnh model nhận diện được, kèm tên tiếng Việt.
 *
 * SINH TỰ ĐỘNG bởi scripts/generate_crop_diseases.py — đừng sửa tay.
 *
 * Nguồn: 89 tên lớp của chính checkpoint đang chạy trên Hugging Face
 * (convnext_tiny_epoch_21), đẩy qua translate_prediction() trong
 * backend/diagnoses/services/cnn_labels.py — đúng hàm mà API dùng khi trả kết
 * quả. Nhờ vậy tên bệnh trên trang công khai không thể khác tên bệnh trong ứng
 * dụng: cùng một nguồn sinh ra cả hai.
 *
 * 19 cây có bệnh, 70 bệnh. Các lớp 'Khỏe mạnh' bị loại
 * (19 lớp) vì lá khỏe không phải là bệnh.
 */

export type CropDisease = {
  name: string;
  /** Tên lớp của model, giữ lại để tra guidance khớp với ứng dụng. */
  className: string;
};

export type CropWithDiseases = {
  slug: string;
  name: string;
  plantId: string;
  diseases: CropDisease[];
};

export const CROP_DISEASES: CropWithDiseases[] = [
  {
    slug: "ca-chua",
    name: "Cà chua",
    plantId: "tomato",
    diseases: [
      {
        name: "Cháy lá muộn",
        className: "Tomato___Late blight",
      },
      {
        name: "Cháy lá sớm",
        className: "Tomato___Early blight",
      },
      {
        name: "Héo Verticillium",
        className: "Tomato___Verticillium wilt",
      },
      {
        name: "Mốc lá",
        className: "Tomato___Leaf Mold",
      },
      {
        name: "Nhện đỏ hai chấm",
        className: "Tomato___Two-spotted spider mites",
      },
      {
        name: "Virus khảm",
        className: "Tomato___Mosaic virus",
      },
      {
        name: "Virus xoăn vàng lá",
        className: "Tomato___Yellow Leaf Curl Virus",
      },
      {
        name: "Đốm lá Septoria",
        className: "Tomato___Septoria leaf spot",
      },
      {
        name: "Đốm mục tiêu",
        className: "Tomato___Target Spot",
      },
      {
        name: "Đốm vi khuẩn",
        className: "Tomato___Bacterial spot",
      },
    ],
  },
  {
    slug: "mia",
    name: "Mía",
    plantId: "sugarcane",
    diseases: [
      {
        name: "Bệnh chồi cỏ",
        className: "Sugarcane___Grassy shoot",
      },
      {
        name: "Bệnh Pokkah Boeng",
        className: "Sugarcane___Pokkah Boeng",
      },
      {
        name: "Bệnh than đen",
        className: "Sugarcane___Smut",
      },
      {
        name: "Gỉ nâu",
        className: "Sugarcane___Brown Rust",
      },
      {
        name: "Khô lá",
        className: "Sugarcane___Dried Leaves",
      },
      {
        name: "Thối hom",
        className: "Sugarcane___Sett Rot",
      },
      {
        name: "Virus khảm",
        className: "Sugarcane___mosaic virus",
      },
      {
        name: "Vàng lá",
        className: "Sugarcane___Yellow Leaf",
      },
      {
        name: "Vàng lá sọc dải",
        className: "Sugarcane___Banded Chlorosis",
      },
      {
        name: "Đốm nâu",
        className: "Sugarcane___Brown Spot",
      },
    ],
  },
  {
    slug: "xoai",
    name: "Xoài",
    plantId: "mango",
    diseases: [
      {
        name: "Bệnh phấn trắng",
        className: "Mango___Powdery Mildew",
      },
      {
        name: "Bệnh thán thư",
        className: "Mango___Anthracnose",
      },
      {
        name: "Khô cành",
        className: "Mango___Die Back",
      },
      {
        name: "Loét vi khuẩn",
        className: "Mango___Bacterial Canker",
      },
      {
        name: "Muỗi đục chồi",
        className: "Mango___Gall Midge",
      },
      {
        name: "Mọt cắt cành",
        className: "Mango___Cutting Weevil",
      },
      {
        name: "Nấm bồ hóng",
        className: "Mango___Sooty Mould",
      },
    ],
  },
  {
    slug: "nho",
    name: "Nho",
    plantId: "grape",
    diseases: [
      {
        name: "Bệnh Esca (đốm đen nho)",
        className: "Grape___Esca (Black Measles)",
      },
      {
        name: "Bệnh phấn trắng",
        className: "Grape___Powdery Mildew",
      },
      {
        name: "Cháy lá nho (đốm lá Isariopsis)",
        className: "Grape___Leaf blight (Isariopsis Leaf Spot)",
      },
      {
        name: "Nhện hại lá",
        className: "Grape___Mites",
      },
      {
        name: "Thối đen trên nho",
        className: "Grape___Black rot",
      },
      {
        name: "Đốm nâu",
        className: "Grape___Brown Spot",
      },
    ],
  },
  {
    slug: "ngo-bap",
    name: "Ngô (bắp)",
    plantId: "corn",
    diseases: [
      {
        name: "Cháy lá phương Bắc",
        className: "Maize___Northern Leaf Blight",
      },
      {
        name: "Gỉ sắt",
        className: "Maize___Rust",
      },
      {
        name: "Hoại tử chết cây ngô",
        className: "Maize___Maize Lethal Necrosis",
      },
      {
        name: "Virus sọc lá ngô",
        className: "Maize___Maize Streak Virus",
      },
      {
        name: "Đốm lá Cercospora / đốm lá xám",
        className: "Maize___Cercospora leaf spot Gray leaf spot",
      },
    ],
  },
  {
    slug: "ca-phe",
    name: "Cà phê",
    plantId: "coffee",
    diseases: [
      {
        name: "Bệnh đốm lá Cercospora",
        className: "Coffee___Cercospora",
      },
      {
        name: "Bệnh đốm lá Phoma",
        className: "Coffee___Phoma",
      },
      {
        name: "Gỉ sắt",
        className: "Coffee___Rust",
      },
      {
        name: "Sâu đục lá",
        className: "Coffee___Miner",
      },
    ],
  },
  {
    slug: "dua-chuot",
    name: "Dưa chuột",
    plantId: "cucumber",
    diseases: [
      {
        name: "Bệnh nứt thân chảy nhựa",
        className: "Cucumber___Gummy Stem Blight",
      },
      {
        name: "Bệnh sương mai",
        className: "Cucumber___Downy Mildew",
      },
      {
        name: "Bệnh thán thư",
        className: "Cucumber___Anthracnose",
      },
      {
        name: "Héo vi khuẩn",
        className: "Cucumber___Bacterial Wilt",
      },
    ],
  },
  {
    slug: "san",
    name: "Sắn",
    plantId: "cassava",
    diseases: [
      {
        name: "Bạc lá vi khuẩn",
        className: "Cassava___bacterial blight",
      },
      {
        name: "Nhện xanh",
        className: "Cassava___green mite",
      },
      {
        name: "Virus khảm",
        className: "Cassava___mosaic virus",
      },
      {
        name: "Đốm nâu",
        className: "Cassava___brown spot",
      },
    ],
  },
  {
    slug: "che",
    name: "Chè",
    plantId: "tea",
    diseases: [
      {
        name: "Cháy lá",
        className: "Tea___Leaf blight",
      },
      {
        name: "Ghẻ đỏ",
        className: "Tea___Red scab",
      },
      {
        name: "Đốm đỏ trên lá",
        className: "Tea___Red leaf spot",
      },
    ],
  },
  {
    slug: "tao",
    name: "Táo",
    plantId: "apple",
    diseases: [
      {
        name: "Bệnh ghẻ",
        className: "Apple___Scab",
      },
      {
        name: "Gỉ sắt tuyết tùng trên táo",
        className: "Apple___Cedar-Apple Rust",
      },
      {
        name: "Thối đen trên táo",
        className: "Apple___Black rot",
      },
    ],
  },
  {
    slug: "dieu",
    name: "Điều",
    plantId: "cashew",
    diseases: [
      {
        name: "Bệnh thán thư",
        className: "Cashew___Anthracnose",
      },
      {
        name: "Gỉ đỏ",
        className: "Cashew___red rust",
      },
      {
        name: "Sâu đục lá",
        className: "Cashew___leaf miner",
      },
    ],
  },
  {
    slug: "ho-tieu",
    name: "Hồ tiêu",
    plantId: "black-pepper",
    diseases: [
      {
        name: "Cháy lá",
        className: "Black Pepper___leaf blight",
      },
      {
        name: "Virus đốm vàng",
        className: "Black Pepper___yellow mottle virus",
      },
    ],
  },
  {
    slug: "khoai-tay",
    name: "Khoai tây",
    plantId: "potato",
    diseases: [
      {
        name: "Cháy lá muộn",
        className: "Potato___Late blight",
      },
      {
        name: "Cháy lá sớm",
        className: "Potato___Early blight",
      },
    ],
  },
  {
    slug: "ot-chuong",
    name: "Ớt chuông",
    plantId: "pepper",
    diseases: [
      {
        name: "Đốm lá ớt chuông",
        className: "Pepper___Bell pepper leaf spot",
      },
      {
        name: "Đốm vi khuẩn",
        className: "Pepper___Bacterial spot",
      },
    ],
  },
  {
    slug: "anh-dao",
    name: "Anh đào",
    plantId: "cherry",
    diseases: [
      {
        name: "Bệnh phấn trắng",
        className: "Cherry___Powdery mildew",
      },
    ],
  },
  {
    slug: "bi",
    name: "Bí",
    plantId: "squash",
    diseases: [
      {
        name: "Bệnh phấn trắng",
        className: "Squash___Powdery mildew",
      },
    ],
  },
  {
    slug: "cam",
    name: "Cam",
    plantId: "orange",
    diseases: [
      {
        name: "Vàng lá gân xanh trên cây có múi",
        className: "Orange___Huanglongbing (Citrus greening)",
      },
    ],
  },
  {
    slug: "dau-tay",
    name: "Dâu tây",
    plantId: "strawberry",
    diseases: [
      {
        name: "Cháy mép lá",
        className: "Strawberry___Leaf scorch",
      },
    ],
  },
  {
    slug: "dao",
    name: "Đào",
    plantId: "peach",
    diseases: [
      {
        name: "Đốm vi khuẩn",
        className: "Peach___Bacterial spot",
      },
    ],
  },
];

/**
 * Cây có trang riêng. Một bệnh thì không đủ dựng thành trang, và một trang
 * rỗng thì tệ cho cả người đọc lẫn thứ hạng hơn là không tồn tại — số còn lại
 * vẫn được liệt kê ở trang danh sách.
 */
export const CROPS_WITH_PAGES = CROP_DISEASES.filter((crop) => crop.diseases.length >= 2);

export function findCropDiseases(slug: string): CropWithDiseases | null {
  return CROP_DISEASES.find((crop) => crop.slug === slug) ?? null;
}

export function plantImageFor(plantId: string): string | null {
  return supportedPlants.find((plant) => plant.id === plantId)?.image ?? null;
}

export function plantInsightFor(plantId: string): string | null {
  return supportedPlants.find((plant) => plant.id === plantId)?.insight ?? null;
}
