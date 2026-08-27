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
  /** Nhãn tiếng Anh của chính model, dùng khi người dùng bật English. */
  nameEn: string;
  /** Tên lớp của model, giữ lại để tra guidance khớp với ứng dụng. */
  className: string;
};

export type CropWithDiseases = {
  slug: string;
  name: string;
  nameEn: string;
  plantId: string;
  diseases: CropDisease[];
};

export const CROP_DISEASES: CropWithDiseases[] = [
  {
    slug: "ca-chua",
    name: "Cà chua",
    nameEn: "Tomato",
    plantId: "tomato",
    diseases: [
      {
        name: "Cháy lá muộn",
        nameEn: "Late Blight",
        className: "Tomato___Late blight",
      },
      {
        name: "Cháy lá sớm",
        nameEn: "Early Blight",
        className: "Tomato___Early blight",
      },
      {
        name: "Héo Verticillium",
        nameEn: "Verticillium Wilt",
        className: "Tomato___Verticillium wilt",
      },
      {
        name: "Mốc lá",
        nameEn: "Leaf Mold",
        className: "Tomato___Leaf Mold",
      },
      {
        name: "Nhện đỏ hai chấm",
        nameEn: "Two-spotted Spider Mites",
        className: "Tomato___Two-spotted spider mites",
      },
      {
        name: "Virus khảm",
        nameEn: "Mosaic Virus",
        className: "Tomato___Mosaic virus",
      },
      {
        name: "Virus xoăn vàng lá",
        nameEn: "Yellow Leaf Curl Virus",
        className: "Tomato___Yellow Leaf Curl Virus",
      },
      {
        name: "Đốm lá Septoria",
        nameEn: "Septoria Leaf Spot",
        className: "Tomato___Septoria leaf spot",
      },
      {
        name: "Đốm mục tiêu",
        nameEn: "Target Spot",
        className: "Tomato___Target Spot",
      },
      {
        name: "Đốm vi khuẩn",
        nameEn: "Bacterial Spot",
        className: "Tomato___Bacterial spot",
      },
    ],
  },
  {
    slug: "mia",
    name: "Mía",
    nameEn: "Sugarcane",
    plantId: "sugarcane",
    diseases: [
      {
        name: "Bệnh chồi cỏ",
        nameEn: "Grassy Shoot",
        className: "Sugarcane___Grassy shoot",
      },
      {
        name: "Bệnh Pokkah Boeng",
        nameEn: "Pokkah Boeng",
        className: "Sugarcane___Pokkah Boeng",
      },
      {
        name: "Bệnh than đen",
        nameEn: "Smut",
        className: "Sugarcane___Smut",
      },
      {
        name: "Gỉ nâu",
        nameEn: "Brown Rust",
        className: "Sugarcane___Brown Rust",
      },
      {
        name: "Khô lá",
        nameEn: "Dried Leaves",
        className: "Sugarcane___Dried Leaves",
      },
      {
        name: "Thối hom",
        nameEn: "Sett Rot",
        className: "Sugarcane___Sett Rot",
      },
      {
        name: "Virus khảm",
        nameEn: "Mosaic Virus",
        className: "Sugarcane___mosaic virus",
      },
      {
        name: "Vàng lá",
        nameEn: "Yellow Leaf",
        className: "Sugarcane___Yellow Leaf",
      },
      {
        name: "Vàng lá sọc dải",
        nameEn: "Banded Chlorosis",
        className: "Sugarcane___Banded Chlorosis",
      },
      {
        name: "Đốm nâu",
        nameEn: "Brown Spot",
        className: "Sugarcane___Brown Spot",
      },
    ],
  },
  {
    slug: "xoai",
    name: "Xoài",
    nameEn: "Mango",
    plantId: "mango",
    diseases: [
      {
        name: "Bệnh phấn trắng",
        nameEn: "Powdery Mildew",
        className: "Mango___Powdery Mildew",
      },
      {
        name: "Bệnh thán thư",
        nameEn: "Anthracnose",
        className: "Mango___Anthracnose",
      },
      {
        name: "Khô cành",
        nameEn: "Die Back",
        className: "Mango___Die Back",
      },
      {
        name: "Loét vi khuẩn",
        nameEn: "Bacterial Canker",
        className: "Mango___Bacterial Canker",
      },
      {
        name: "Muỗi đục chồi",
        nameEn: "Gall Midge",
        className: "Mango___Gall Midge",
      },
      {
        name: "Mọt cắt cành",
        nameEn: "Cutting Weevil",
        className: "Mango___Cutting Weevil",
      },
      {
        name: "Nấm bồ hóng",
        nameEn: "Sooty Mould",
        className: "Mango___Sooty Mould",
      },
    ],
  },
  {
    slug: "nho",
    name: "Nho",
    nameEn: "Grape",
    plantId: "grape",
    diseases: [
      {
        name: "Bệnh Esca (đốm đen nho)",
        nameEn: "Esca (Black Measles)",
        className: "Grape___Esca (Black Measles)",
      },
      {
        name: "Bệnh phấn trắng",
        nameEn: "Powdery Mildew",
        className: "Grape___Powdery Mildew",
      },
      {
        name: "Cháy lá nho (đốm lá Isariopsis)",
        nameEn: "Leaf Blight (Isariopsis Leaf Spot)",
        className: "Grape___Leaf blight (Isariopsis Leaf Spot)",
      },
      {
        name: "Nhện hại lá",
        nameEn: "Mites",
        className: "Grape___Mites",
      },
      {
        name: "Thối đen trên nho",
        nameEn: "Black Rot",
        className: "Grape___Black rot",
      },
      {
        name: "Đốm nâu",
        nameEn: "Brown Spot",
        className: "Grape___Brown Spot",
      },
    ],
  },
  {
    slug: "ngo-bap",
    name: "Ngô (bắp)",
    nameEn: "Maize",
    plantId: "corn",
    diseases: [
      {
        name: "Cháy lá phương Bắc",
        nameEn: "Northern Leaf Blight",
        className: "Maize___Northern Leaf Blight",
      },
      {
        name: "Gỉ sắt",
        nameEn: "Rust",
        className: "Maize___Rust",
      },
      {
        name: "Hoại tử chết cây ngô",
        nameEn: "Maize Lethal Necrosis",
        className: "Maize___Maize Lethal Necrosis",
      },
      {
        name: "Virus sọc lá ngô",
        nameEn: "Maize Streak Virus",
        className: "Maize___Maize Streak Virus",
      },
      {
        name: "Đốm lá Cercospora / đốm lá xám",
        nameEn: "Cercospora Leaf Spot Gray Leaf Spot",
        className: "Maize___Cercospora leaf spot Gray leaf spot",
      },
    ],
  },
  {
    slug: "ca-phe",
    name: "Cà phê",
    nameEn: "Coffee",
    plantId: "coffee",
    diseases: [
      {
        name: "Bệnh đốm lá Cercospora",
        nameEn: "Cercospora",
        className: "Coffee___Cercospora",
      },
      {
        name: "Bệnh đốm lá Phoma",
        nameEn: "Phoma",
        className: "Coffee___Phoma",
      },
      {
        name: "Gỉ sắt",
        nameEn: "Rust",
        className: "Coffee___Rust",
      },
      {
        name: "Sâu đục lá",
        nameEn: "Miner",
        className: "Coffee___Miner",
      },
    ],
  },
  {
    slug: "dua-chuot",
    name: "Dưa chuột",
    nameEn: "Cucumber",
    plantId: "cucumber",
    diseases: [
      {
        name: "Bệnh nứt thân chảy nhựa",
        nameEn: "Gummy Stem Blight",
        className: "Cucumber___Gummy Stem Blight",
      },
      {
        name: "Bệnh sương mai",
        nameEn: "Downy Mildew",
        className: "Cucumber___Downy Mildew",
      },
      {
        name: "Bệnh thán thư",
        nameEn: "Anthracnose",
        className: "Cucumber___Anthracnose",
      },
      {
        name: "Héo vi khuẩn",
        nameEn: "Bacterial Wilt",
        className: "Cucumber___Bacterial Wilt",
      },
    ],
  },
  {
    slug: "san",
    name: "Sắn",
    nameEn: "Cassava",
    plantId: "cassava",
    diseases: [
      {
        name: "Bạc lá vi khuẩn",
        nameEn: "Bacterial Blight",
        className: "Cassava___bacterial blight",
      },
      {
        name: "Nhện xanh",
        nameEn: "Green Mite",
        className: "Cassava___green mite",
      },
      {
        name: "Virus khảm",
        nameEn: "Mosaic Virus",
        className: "Cassava___mosaic virus",
      },
      {
        name: "Đốm nâu",
        nameEn: "Brown Spot",
        className: "Cassava___brown spot",
      },
    ],
  },
  {
    slug: "che",
    name: "Chè",
    nameEn: "Tea",
    plantId: "tea",
    diseases: [
      {
        name: "Cháy lá",
        nameEn: "Leaf Blight",
        className: "Tea___Leaf blight",
      },
      {
        name: "Ghẻ đỏ",
        nameEn: "Red Scab",
        className: "Tea___Red scab",
      },
      {
        name: "Đốm đỏ trên lá",
        nameEn: "Red Leaf Spot",
        className: "Tea___Red leaf spot",
      },
    ],
  },
  {
    slug: "tao",
    name: "Táo",
    nameEn: "Apple",
    plantId: "apple",
    diseases: [
      {
        name: "Bệnh ghẻ",
        nameEn: "Scab",
        className: "Apple___Scab",
      },
      {
        name: "Gỉ sắt tuyết tùng trên táo",
        nameEn: "Cedar-Apple Rust",
        className: "Apple___Cedar-Apple Rust",
      },
      {
        name: "Thối đen trên táo",
        nameEn: "Black Rot",
        className: "Apple___Black rot",
      },
    ],
  },
  {
    slug: "dieu",
    name: "Điều",
    nameEn: "Cashew",
    plantId: "cashew",
    diseases: [
      {
        name: "Bệnh thán thư",
        nameEn: "Anthracnose",
        className: "Cashew___Anthracnose",
      },
      {
        name: "Gỉ đỏ",
        nameEn: "Red Rust",
        className: "Cashew___red rust",
      },
      {
        name: "Sâu đục lá",
        nameEn: "Leaf Miner",
        className: "Cashew___leaf miner",
      },
    ],
  },
  {
    slug: "ho-tieu",
    name: "Hồ tiêu",
    nameEn: "Black Pepper",
    plantId: "black-pepper",
    diseases: [
      {
        name: "Cháy lá",
        nameEn: "Leaf Blight",
        className: "Black Pepper___leaf blight",
      },
      {
        name: "Virus đốm vàng",
        nameEn: "Yellow Mottle Virus",
        className: "Black Pepper___yellow mottle virus",
      },
    ],
  },
  {
    slug: "khoai-tay",
    name: "Khoai tây",
    nameEn: "Potato",
    plantId: "potato",
    diseases: [
      {
        name: "Cháy lá muộn",
        nameEn: "Late Blight",
        className: "Potato___Late blight",
      },
      {
        name: "Cháy lá sớm",
        nameEn: "Early Blight",
        className: "Potato___Early blight",
      },
    ],
  },
  {
    slug: "ot-chuong",
    name: "Ớt chuông",
    nameEn: "Pepper",
    plantId: "pepper",
    diseases: [
      {
        name: "Đốm lá ớt chuông",
        nameEn: "Bell Pepper Leaf Spot",
        className: "Pepper___Bell pepper leaf spot",
      },
      {
        name: "Đốm vi khuẩn",
        nameEn: "Bacterial Spot",
        className: "Pepper___Bacterial spot",
      },
    ],
  },
  {
    slug: "anh-dao",
    name: "Anh đào",
    nameEn: "Cherry",
    plantId: "cherry",
    diseases: [
      {
        name: "Bệnh phấn trắng",
        nameEn: "Powdery Mildew",
        className: "Cherry___Powdery mildew",
      },
    ],
  },
  {
    slug: "bi",
    name: "Bí",
    nameEn: "Squash",
    plantId: "squash",
    diseases: [
      {
        name: "Bệnh phấn trắng",
        nameEn: "Powdery Mildew",
        className: "Squash___Powdery mildew",
      },
    ],
  },
  {
    slug: "cam",
    name: "Cam",
    nameEn: "Orange",
    plantId: "orange",
    diseases: [
      {
        name: "Vàng lá gân xanh trên cây có múi",
        nameEn: "Huanglongbing (Citrus Greening)",
        className: "Orange___Huanglongbing (Citrus greening)",
      },
    ],
  },
  {
    slug: "dau-tay",
    name: "Dâu tây",
    nameEn: "Strawberry",
    plantId: "strawberry",
    diseases: [
      {
        name: "Cháy mép lá",
        nameEn: "Leaf Scorch",
        className: "Strawberry___Leaf scorch",
      },
    ],
  },
  {
    slug: "dao",
    name: "Đào",
    nameEn: "Peach",
    plantId: "peach",
    diseases: [
      {
        name: "Đốm vi khuẩn",
        nameEn: "Bacterial Spot",
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

/**
 * Trang bệnh tương ứng với một cây trong danh mục trang chủ, nếu có.
 *
 * Trang chủ dùng hàm này để trỏ thẳng từ thẻ cây sang trang bệnh của nó.
 * Trả null khi cây chưa đủ hai bệnh, vì khi đó trang không được sinh và
 * liên kết sẽ dẫn tới 404.
 */
export function diseasePageForPlant(plantId: string): CropWithDiseases | null {
  const crop = CROP_DISEASES.find((entry) => entry.plantId === plantId);
  return crop && crop.diseases.length >= 2 ? crop : null;
}

export function plantImageFor(plantId: string): string | null {
  return supportedPlants.find((plant) => plant.id === plantId)?.image ?? null;
}

/** Bản tiếng Anh của mô tả cây, dùng khi người dùng bật English. */
export function plantInsightEnFor(plantId: string): string | null {
  const plant = supportedPlants.find((entry) => entry.id === plantId);
  return plant?.insightEn ?? plant?.insight ?? null;
}

export function plantInsightFor(plantId: string): string | null {
  return supportedPlants.find((plant) => plant.id === plantId)?.insight ?? null;
}
