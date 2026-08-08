import { supportedPlants } from "@/data/mock/plants";

/**
 * Crops and the diseases the model has Vietnamese names for.
 *
 * Generated from CLASS_TRANSLATIONS in backend/diagnoses/services/cnn_labels.py,
 * which is the same table that names a disease when a grower photographs a leaf.
 * Nothing here was invented: if a disease is listed, the model can actually
 * return it and the app already knows what to call it in Vietnamese.
 *
 * "Khỏe mạnh" classes are excluded — a healthy leaf is not a disease page.
 */

export type CropDisease = {
  name: string;
  /** The model's own class label, kept so guidance lookup matches the app. */
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
        name: "Đốm vi khuẩn",
        className: "Tomato___Bacterial_spot"
      },
      {
        name: "Cháy lá sớm",
        className: "Tomato___Early_blight"
      },
      {
        name: "Cháy lá muộn",
        className: "Tomato___Late_blight"
      },
      {
        name: "Mốc lá",
        className: "Tomato___Leaf_Mold"
      },
      {
        name: "Đốm lá Septoria",
        className: "Tomato___Septoria_leaf_spot"
      },
      {
        name: "Nhện đỏ hai chấm",
        className: "Tomato___Spider_mites Two-spotted_spider_mite"
      },
      {
        name: "Đốm mục tiêu",
        className: "Tomato___Target_Spot"
      },
      {
        name: "Virus xoăn vàng lá cà chua",
        className: "Tomato___Tomato_Yellow_Leaf_Curl_Virus"
      },
      {
        name: "Virus khảm cà chua",
        className: "Tomato___Tomato_mosaic_virus"
      }
    ]
  },
  {
    slug: "ngo-bap",
    name: "Ngô (bắp)",
    plantId: "corn",
    diseases: [
      {
        name: "Đốm lá Cercospora / đốm lá xám",
        className: "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot"
      },
      {
        name: "Gỉ sắt thường",
        className: "Corn_(maize)___Common_rust_"
      },
      {
        name: "Cháy lá phương Bắc",
        className: "Corn_(maize)___Northern_Leaf_Blight"
      }
    ]
  },
  {
    slug: "nho",
    name: "Nho",
    plantId: "grape",
    diseases: [
      {
        name: "Thối đen trên nho",
        className: "Grape___Black_rot"
      },
      {
        name: "Bệnh Esca (đốm đen nho)",
        className: "Grape___Esca_(Black_Measles)"
      },
      {
        name: "Cháy lá nho (đốm lá Isariopsis)",
        className: "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)"
      }
    ]
  },
  {
    slug: "tao",
    name: "Táo",
    plantId: "apple",
    diseases: [
      {
        name: "Bệnh ghẻ táo",
        className: "Apple___Apple_scab"
      },
      {
        name: "Thối đen trên táo",
        className: "Apple___Black_rot"
      },
      {
        name: "Gỉ sắt tuyết tùng trên táo",
        className: "Apple___Cedar_apple_rust"
      }
    ]
  },
  {
    slug: "khoai-tay",
    name: "Khoai tây",
    plantId: "potato",
    diseases: [
      {
        name: "Cháy lá sớm",
        className: "Potato___Early_blight"
      },
      {
        name: "Cháy lá muộn",
        className: "Potato___Late_blight"
      }
    ]
  },
  {
    slug: "anh-dao",
    name: "Anh đào",
    plantId: "cherry",
    diseases: [
      {
        name: "Bệnh phấn trắng",
        className: "Cherry_(including_sour)___Powdery_mildew"
      }
    ]
  },
  {
    slug: "bi",
    name: "Bí",
    plantId: "squash",
    diseases: [
      {
        name: "Bệnh phấn trắng",
        className: "Squash___Powdery_mildew"
      }
    ]
  },
  {
    slug: "cam",
    name: "Cam",
    plantId: "orange",
    diseases: [
      {
        name: "Vàng lá gân xanh trên cây có múi",
        className: "Orange___Haunglongbing_(Citrus_greening)"
      }
    ]
  },
  {
    slug: "dau-tay",
    name: "Dâu tây",
    plantId: "strawberry",
    diseases: [
      {
        name: "Cháy mép lá",
        className: "Strawberry___Leaf_scorch"
      }
    ]
  },
  {
    slug: "dao",
    name: "Đào",
    plantId: "peach",
    diseases: [
      {
        name: "Đốm vi khuẩn",
        className: "Peach___Bacterial_spot"
      }
    ]
  },
  {
    slug: "ot-chuong",
    name: "Ớt chuông",
    plantId: "pepper",
    diseases: [
      {
        name: "Đốm vi khuẩn",
        className: "Pepper,_bell___Bacterial_spot"
      }
    ]
  }
];

/**
 * Crops that get their own page. A single disease does not fill one, and a page
 * with nothing on it is worse for both the reader and the ranking than not
 * existing — the rest are still listed on the index.
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
