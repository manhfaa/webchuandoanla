import { supportedPlants } from "@/data/mock/plants";
import type { DjangoCnnPrediction } from "@/lib/django-client";

/**
 * Matching a user's declared crop against what the model actually returned.
 *
 * The model classifies 89 classes spanning roughly 25 plants. The backend
 * translates each prediction and returns BOTH `plant_name` (Vietnamese) and
 * `plant_name_en` (the cleaned English label straight off the class name).
 *
 * Match on the English key. The Vietnamese strings disagree between the two
 * sources in ways that would fail silently: the landing catalogue says "Ngô"
 * and "Đậu nành" where the backend says "Ngô (bắp)" and "Đậu tương". A naive
 * string compare drops corn and soy on the floor and nobody notices, because
 * the failure looks exactly like "the model didn't see your crop".
 */

/** Fold to a comparable key: lowercase, strip diacritics, đ→d, punctuation→space. */
export function normalizeCropKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Every label the model may emit for a given catalogue crop, English and
 * Vietnamese. Compared as whole normalized strings, never as substrings —
 * substring matching would make "Black Pepper" match the bell-pepper entry.
 */
const MODEL_ALIASES: Record<string, string[]> = {
  apple: ["Apple"],
  "black-pepper": ["Black Pepper"],
  cashew: ["Cashew"],
  cassava: ["Cassava"],
  cherry: ["Cherry", "Cherry (including sour)", "Anh đào"],
  coffee: ["Coffee", "Cà phê"],
  // The model emits "Corn_(maize)" on PlantVillage classes and plain "Maize"
  // elsewhere; the backend renders the first as "Ngô (bắp)".
  corn: ["Corn", "Corn (maize)", "Maize", "Ngô", "Ngô (bắp)"],
  cucumber: ["Cucumber", "Dưa chuột"],
  grape: ["Grape", "Nho"],
  mango: ["Mango", "Xoài"],
  orange: ["Orange", "Cam"],
  peach: ["Peach", "Đào"],
  pepper: ["Pepper, bell", "Pepper bell", "Bell pepper", "Pepper", "Ớt chuông"],
  potato: ["Potato", "Khoai tây"],
  raspberry: ["Raspberry"],
  // Catalogue says "Đậu nành", the backend translation table says "Đậu tương".
  soybean: ["Soybean", "Đậu nành", "Đậu tương"],
  squash: ["Squash", "Bí"],
  strawberry: ["Strawberry", "Dâu tây"],
  sugarcane: ["Sugarcane", "Sugar cane", "Mía"],
  tea: ["Tea", "Chè"],
  tomato: ["Tomato", "Cà chua"],
};

export type DiagnosableCrop = {
  id: string;
  name: string;
  nameEn: string;
  image: string;
  /** Normalized labels this crop answers to. */
  keys: string[];
};

/**
 * The picker list. Derived from the same catalogue the landing page publishes,
 * so the crops offered here are exactly the crops the site claims to support —
 * one source, no drift.
 */
export const DIAGNOSABLE_CROPS: DiagnosableCrop[] = supportedPlants.map((plant) => {
  const aliases = MODEL_ALIASES[plant.id] ?? [];
  const keys = Array.from(
    new Set(
      [plant.name, plant.nameEn, ...aliases]
        .filter(Boolean)
        .map((label) => normalizeCropKey(String(label)))
        .filter(Boolean),
    ),
  );
  // nameEn is optional on SupportedPlant; fall back so the English UI never
  // renders an empty crop name.
  return { id: plant.id, name: plant.name, nameEn: plant.nameEn ?? plant.name, image: plant.image, keys };
});

const CROP_BY_ID = new Map(DIAGNOSABLE_CROPS.map((crop) => [crop.id, crop]));

export function findCrop(cropId: string | null | undefined): DiagnosableCrop | null {
  if (!cropId) return null;
  return CROP_BY_ID.get(cropId) ?? null;
}

/** Does this prediction belong to the crop the user declared? */
export function predictionMatchesCrop(
  prediction: Pick<DjangoCnnPrediction, "plant_name" | "plant_name_en" | "class_name">,
  cropId: string | null | undefined,
): boolean {
  const crop = findCrop(cropId);
  if (!crop) return true;

  // plant_name_en first: it is the model's own label, not a translation.
  const candidates = [prediction.plant_name_en, prediction.plant_name]
    .filter(Boolean)
    .map((value) => normalizeCropKey(String(value)));

  if (candidates.some((value) => crop.keys.includes(value))) return true;

  // Fall back to the raw class name's plant half ("Tomato___Leaf_Mold"), which
  // survives even when translation produced nothing usable.
  const raw = String(prediction.class_name ?? "");
  if (raw.includes("___")) {
    const plantHalf = normalizeCropKey(raw.split("___")[0].replace(/_/g, " "));
    if (crop.keys.includes(plantHalf)) return true;
  }
  return false;
}

export type CropScope<T> = {
  /** What the UI should show: the crop's predictions, or all of them on a miss. */
  candidates: T[];
  /** null when no crop was declared; false when the crop matched nothing. */
  cropMatched: boolean | null;
  /** Always the unfiltered set, so the real top result stays recoverable. */
  all: T[];
};

/**
 * Narrow predictions to the declared crop.
 *
 * On a miss this deliberately returns the FULL list with `cropMatched: false`
 * rather than an empty one. The model ranks 89 classes; if none of the top five
 * belong to the declared crop, the honest answer is "this photo doesn't look
 * like any <crop> disease I know" — not the crop's best guess dredged up from
 * rank forty and presented as the answer, and not a blank panel either.
 */
export function scopePredictionsToCrop<T extends Pick<DjangoCnnPrediction, "plant_name" | "plant_name_en" | "class_name">>(
  predictions: T[],
  cropId: string | null | undefined,
): CropScope<T> {
  const all = predictions;
  if (!findCrop(cropId)) return { candidates: all, cropMatched: null, all };

  const matched = all.filter((prediction) => predictionMatchesCrop(prediction, cropId));
  return matched.length
    ? { candidates: matched, cropMatched: true, all }
    : { candidates: all, cropMatched: false, all };
}
