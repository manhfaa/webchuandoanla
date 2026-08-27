import type { ActionPlan } from "@/types";

/**
 * Per-disease-family guidance, shared by the diagnosis flow and the public
 * disease pages.
 *
 * This used to live inside the diagnosis page. It moved here when the public
 * /benh-cay pages were built, because those pages had to say the same thing the
 * app says. Two copies would have drifted, and a public page contradicting the
 * app about how to treat a disease is worse than having no page.
 *
 * The text is the team's own, already reviewed and already user-facing. Nothing
 * here was written by guessing at agronomy: it names no pesticide, and defers
 * to a local technician wherever a real treatment decision starts. The English
 * is a translation of that reviewed Vietnamese, not a second opinion — when the
 * Vietnamese is corrected, the English has to follow it.
 *
 * The branches used to be an if-chain. They are a table now so that each one
 * carries both languages side by side and cannot fall out of step. The ORDER is
 * load-bearing and unchanged: first match wins, cause before symptom.
 */

export type DiseaseGuidance = {
  risk: ActionPlan["risk_level"];
  severity: string;
  immediate: string[];
  followUp: string[];
  safety: string[];
  recheckDays: number;
  expertRequired: boolean;
};

export type GuidanceLanguage = "vi" | "en";

type Bi = { vi: string; en: string };
type BiList = { vi: string[]; en: string[] };

type GuidanceEntry = {
  /** Matched against the folded text; first entry with any hit wins. */
  keywords: string[];
  risk: ActionPlan["risk_level"];
  severity: Bi;
  immediate: BiList;
  followUp: BiList;
  safety: BiList;
  recheckDays: number;
  expertRequired: boolean;
};

/** Folded form used for keyword matching: no diacritics, no đ. */
export function normalizeDiseaseText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const HEALTHY: GuidanceEntry = {
  keywords: ["healthy", "khoe"],
  risk: "low",
  severity: { vi: "Khỏe", en: "Healthy" },
  immediate: {
    vi: [
      "Duy trì chế độ tưới và ánh sáng hiện tại nếu cây vẫn phát triển bình thường.",
      "Tiếp tục quan sát mặt trên, mặt dưới lá và chụp lại nếu xuất hiện đốm hoặc vàng lá.",
      "Không phun thuốc khi chưa có dấu hiệu bệnh rõ ràng.",
    ],
    en: [
      "Keep watering and light as they are while the plant is growing normally.",
      "Keep checking both sides of the leaves, and photograph again if spots or yellowing appear.",
      "Do not spray anything while there is no clear sign of disease.",
    ],
  },
  followUp: {
    vi: [
      "Kiểm tra lại sau 7 ngày hoặc sớm hơn nếu lá đổi màu.",
      "Ghi chú thời tiết, lượng tưới và phân bón để so sánh ở lần kiểm tra sau.",
    ],
    en: [
      "Check again in 7 days, or sooner if the leaves change colour.",
      "Note the weather, watering and fertiliser so the next check has something to compare against.",
    ],
  },
  safety: {
    vi: ["Kết quả khỏe mạnh vẫn nên được xem là hỗ trợ, không thay thế quan sát thực địa."],
    en: ["A healthy result is still only a second opinion; it does not replace looking at the plant yourself."],
  },
  recheckDays: 7,
  expertRequired: false,
};

/**
 * Virus goes first, immediately after healthy.
 *
 * It used to sit second-to-last, and "Virus đốm vàng" on hồ tiêu (Black
 * Pepper___yellow mottle virus) was reaching the leaf-spot branch instead: the
 * folded text contains "dom", and the spot branch ran earlier. A grower with a
 * virus was told to prune the spotted leaves and watch — not to isolate the
 * plant, look for the insects carrying it, or stop propagating from it.
 */
const VIRUS: GuidanceEntry = {
  keywords: ["virus", "curl", "mosaic", "yellow"],
  risk: "high",
  severity: { vi: "Nghi virus/xoăn vàng", en: "Possible virus / leaf curl" },
  immediate: {
    vi: [
      "Cách ly cây nghi nhiễm để hạn chế côn trùng truyền bệnh lan sang cây khác.",
      "Kiểm tra rệp, bọ phấn, bọ trĩ ở mặt dưới lá và đọt non.",
      "Không lấy giống, cành chiết hoặc hạt từ cây đang nghi nhiễm.",
    ],
    en: [
      "Separate the suspected plant so the insects that carry the virus cannot move to the others.",
      "Look for aphids, whiteflies and thrips under the leaves and on new shoots.",
      "Do not take cuttings, layers or seed from a plant you suspect.",
    ],
  },
  followUp: {
    vi: [
      "Chụp ảnh toàn cây và đọt non sau 2 đến 3 ngày.",
      "Nếu cây còi cọc, xoăn lá tăng nhanh, nên hỏi kỹ thuật viên trước khi giữ lại cây.",
    ],
    en: [
      "Photograph the whole plant and its new shoots again in 2 to 3 days.",
      "If it stunts or the curling spreads quickly, ask a technician before deciding to keep the plant.",
    ],
  },
  safety: {
    vi: ["Virus thường khó chữa bằng thuốc; tránh phun thuốc tràn lan gây tốn kém và tồn dư."],
    en: ["Sprays rarely cure a virus; spraying widely costs money and leaves residue for nothing."],
  },
  recheckDays: 3,
  expertRequired: true,
};

/**
 * Mites go before the symptom branches too, for the same reason.
 *
 * "Tomato___Two-spotted spider mites" folds to a string containing "spotted",
 * so the leaf-spot branch was winning and the branch written for mites never
 * ran. The two disagree outright: the spot branch says keep the leaves dry,
 * this one says rinse them and avoid prolonged heat and dryness — and dry heat
 * is what spider mites multiply in.
 */
const MITES: GuidanceEntry = {
  keywords: ["mite", "spider", "nhen"],
  risk: "medium",
  severity: { vi: "Nghi nhện hại", en: "Possible mite damage" },
  immediate: {
    vi: [
      "Soi mặt dưới lá để tìm chấm nhỏ di chuyển hoặc tơ mịn.",
      "Phun rửa nhẹ bằng nước sạch để giảm mật số ban đầu nếu cây chịu được.",
      "Tách cây bị nặng và tránh để khô nóng kéo dài.",
    ],
    en: [
      "Look closely under the leaves for tiny moving specks or fine webbing.",
      "Rinse gently with clean water to knock the numbers down, if the plant can take it.",
      "Move badly affected plants aside and do not let them sit hot and dry for long.",
    ],
  },
  followUp: {
    vi: [
      "Kiểm tra lại sau 2 ngày, nhất là mặt dưới lá non.",
      "Nếu mật số tăng, dùng biện pháp sinh học hoặc thuốc theo khuyến cáo địa phương.",
    ],
    en: [
      "Check again in 2 days, especially under the young leaves.",
      "If the numbers keep rising, use a biological option or a product your local service recommends.",
    ],
  },
  safety: {
    vi: ["Không lạm dụng thuốc trừ sâu phổ rộng vì có thể làm giảm thiên địch."],
    en: ["Go easy on broad-spectrum insecticide; it kills the predators that were helping you."],
  },
  recheckDays: 2,
  expertRequired: false,
};

const BLIGHT: GuidanceEntry = {
  keywords: ["blight", "chay", "scorch"],
  risk: "high",
  severity: { vi: "Nguy cơ cháy lá", en: "Risk of leaf blight" },
  immediate: {
    vi: [
      "Cắt bỏ lá bị cháy nặng và gom ra khỏi khu vực trồng.",
      "Tránh tưới lên tán lá; ưu tiên tưới gốc vào buổi sáng.",
      "Tăng độ thông thoáng, giảm ẩm kéo dài quanh tán cây.",
    ],
    en: [
      "Cut off badly burnt leaves and carry them out of the growing area.",
      "Keep water off the canopy; water at the base, in the morning.",
      "Open the plants up so damp air does not sit around them.",
    ],
  },
  followUp: {
    vi: [
      "Theo dõi tốc độ lan trong 2 đến 3 ngày.",
      "Nếu vết cháy lan nhanh, cân nhắc hỏi kỹ thuật viên địa phương trước khi dùng thuốc.",
    ],
    en: [
      "Watch how fast it spreads over the next 2 to 3 days.",
      "If it moves quickly, ask a local technician before reaching for a spray.",
    ],
  },
  safety: {
    vi: ["Không trộn nhiều loại thuốc cùng lúc; luôn đọc nhãn và dùng bảo hộ khi xử lý."],
    en: ["Do not mix several products together; read the label and wear protection."],
  },
  recheckDays: 3,
  expertRequired: true,
};

const LEAF_SPOT: GuidanceEntry = {
  keywords: ["spot", "scab", "septoria", "dom"],
  risk: "medium",
  severity: { vi: "Đốm lá", en: "Leaf spot" },
  immediate: {
    vi: [
      "Tỉa bỏ các lá có nhiều đốm và không ủ trực tiếp vào gốc.",
      "Giữ lá khô, hạn chế tưới phun mưa vào chiều tối.",
      "Vệ sinh dụng cụ cắt tỉa trước khi chuyển sang cây khác.",
    ],
    en: [
      "Prune the heavily spotted leaves, and do not compost them at the base of the plant.",
      "Keep the leaves dry; avoid overhead watering late in the day.",
      "Clean your pruning tools before moving to the next plant.",
    ],
  },
  followUp: {
    vi: [
      "Chụp lại cùng vị trí sau 3 đến 5 ngày để so sánh mật độ đốm.",
      "Nếu đốm tăng nhanh, cân nhắc biện pháp phòng nấm/vi khuẩn phù hợp với cây trồng.",
    ],
    en: [
      "Photograph the same spot again in 3 to 5 days and compare how dense it is.",
      "If the spots multiply quickly, consider a fungal or bacterial control suited to this crop.",
    ],
  },
  safety: {
    vi: ["Không dùng thuốc khi cây đang stress nặng do nắng nóng hoặc thiếu nước."],
    en: ["Do not spray a plant already stressed by heat or lack of water."],
  },
  recheckDays: 4,
  expertRequired: false,
};

const MILDEW: GuidanceEntry = {
  keywords: ["mildew", "mold", "phan", "moc"],
  risk: "medium",
  severity: { vi: "Mốc/phấn lá", en: "Mould or powdery leaf" },
  immediate: {
    vi: [
      "Tăng thông gió và giãn khoảng cách giữa các cây nếu trồng quá dày.",
      "Loại bỏ lá có lớp mốc/phấn dày để giảm nguồn lây.",
      "Tránh để lá ẩm qua đêm.",
    ],
    en: [
      "Improve airflow, and thin the spacing if the plants are crowded.",
      "Remove leaves with a thick coating so there is less to spread from.",
      "Do not let the leaves stay wet overnight.",
    ],
  },
  followUp: {
    vi: [
      "Quan sát mặt dưới lá sau 2 đến 3 ngày.",
      "Nếu mốc lan rộng, hỏi chuyên gia về chế phẩm sinh học hoặc thuốc phù hợp.",
    ],
    en: [
      "Look under the leaves again in 2 to 3 days.",
      "If it spreads, ask an expert about a biological product or a suitable spray.",
    ],
  },
  safety: {
    vi: ["Không phun lưu huỳnh hoặc chế phẩm mạnh khi trời quá nóng."],
    en: ["Do not apply sulphur or any strong product in hot weather."],
  },
  recheckDays: 3,
  expertRequired: false,
};

const RUST: GuidanceEntry = {
  keywords: ["rust", "gi"],
  risk: "medium",
  severity: { vi: "Gỉ lá", en: "Leaf rust" },
  immediate: {
    vi: [
      "Cắt bỏ lá có ổ bào tử màu vàng/cam/nâu rõ rệt.",
      "Giữ vườn thông thoáng và tránh tưới ướt lá.",
      "Thu gom lá rụng để giảm nguồn bệnh tồn dư.",
    ],
    en: [
      "Cut off leaves carrying clear yellow, orange or brown spore pustules.",
      "Keep the plot airy and avoid wetting the leaves.",
      "Rake up fallen leaves so less of it carries over.",
    ],
  },
  followUp: {
    vi: [
      "Theo dõi mặt dưới lá trong 3 ngày tới.",
      "Nếu xuất hiện nhiều ổ gỉ mới, cần tư vấn thuốc đặc trị theo cây trồng.",
    ],
    en: [
      "Watch the undersides of the leaves for the next 3 days.",
      "If many new pustules appear, get advice on a treatment made for this crop.",
    ],
  },
  safety: {
    vi: ["Dùng găng tay khi loại bỏ lá bệnh và rửa tay sau khi xử lý."],
    en: ["Wear gloves when removing infected leaves, and wash your hands afterwards."],
  },
  recheckDays: 3,
  expertRequired: false,
};

const ROT: GuidanceEntry = {
  keywords: ["rot", "thoi", "black"],
  risk: "high",
  severity: { vi: "Thối/đen mô lá", en: "Rot or blackened tissue" },
  immediate: {
    vi: [
      "Ngừng tưới quá nhiều và kiểm tra thoát nước của đất/chậu.",
      "Loại bỏ phần lá hoặc mô bị thối mềm, có mùi hoặc chuyển đen.",
      "Tách cây nghi nhiễm nặng khỏi cây khỏe nếu trồng gần nhau.",
    ],
    en: [
      "Stop over-watering and check that the soil or pot actually drains.",
      "Cut away tissue that has gone soft, smells, or has turned black.",
      "Move badly affected plants away from healthy ones if they sit close together.",
    ],
  },
  followUp: {
    vi: [
      "Theo dõi thân, cuống và rễ trong 2 ngày.",
      "Nếu thối lan xuống thân hoặc rễ, cần chuyên gia kiểm tra trực tiếp.",
    ],
    en: [
      "Watch the stem, the leaf stalks and the roots over the next 2 days.",
      "If the rot reaches the stem or roots, have an expert look at it in person.",
    ],
  },
  safety: {
    vi: ["Không dùng lại đất/chậu bẩn cho cây khác nếu nghi có mầm bệnh."],
    en: ["Do not reuse suspect soil or pots for another plant."],
  },
  recheckDays: 2,
  expertRequired: true,
};

/**
 * Deliberately vague, and deliberately last.
 *
 * Most of the 70 diseases the model knows land here. That is the honest
 * outcome: this file groups by symptom family, and a family it has no entry for
 * gets careful observation rather than invented agronomy.
 */
const FALLBACK: GuidanceEntry = {
  keywords: [],
  risk: "medium",
  severity: { vi: "Cần theo dõi", en: "Keep watching" },
  immediate: {
    vi: [
      "Khoanh vùng lá có dấu hiệu rõ nhất và chụp thêm ảnh ở mặt trên, mặt dưới lá.",
      "Giữ cây thông thoáng, tránh tưới lên lá vào chiều tối.",
      "Ghi lại thời điểm phát hiện, thời tiết gần đây và cách chăm sóc.",
    ],
    en: [
      "Mark the leaves showing it most clearly and photograph both sides.",
      "Keep the plant airy, and avoid watering the leaves late in the day.",
      "Write down when you noticed it, the recent weather, and how you have been caring for it.",
    ],
  },
  followUp: {
    vi: [
      "Kiểm tra lại sau 3 đến 5 ngày để xem triệu chứng có lan không.",
      "Nếu cây suy nhanh hoặc bệnh lan rộng, nên hỏi chuyên gia nông nghiệp địa phương.",
    ],
    en: [
      "Check again in 3 to 5 days to see whether it has spread.",
      "If the plant declines quickly or it spreads widely, ask a local agriculture expert.",
    ],
  },
  safety: {
    vi: ["Chỉ dùng thuốc khi đã xác định rõ nhóm nguyên nhân và đúng hướng dẫn trên nhãn."],
    en: ["Only spray once you know what is actually causing it, and follow the label."],
  },
  recheckDays: 4,
  expertRequired: false,
};

/** Order is load-bearing: cause before symptom, first match wins. */
const ENTRIES: GuidanceEntry[] = [HEALTHY, VIRUS, MITES, BLIGHT, LEAF_SPOT, MILDEW, RUST, ROT];

/**
 * Accepts either a prediction-shaped object or a plain disease name, so the
 * public pages can ask about a disease they only know by its Vietnamese label.
 *
 * `language` defaults to Vietnamese so every existing caller keeps the exact
 * behaviour it had before English was added.
 */
export function guidanceForDiseaseText(text: string, language: GuidanceLanguage = "vi"): DiseaseGuidance {
  const entry = ENTRIES.find((candidate) => candidate.keywords.some((word) => text.includes(word))) ?? FALLBACK;

  return {
    risk: entry.risk,
    severity: entry.severity[language],
    immediate: entry.immediate[language],
    followUp: entry.followUp[language],
    safety: entry.safety[language],
    recheckDays: entry.recheckDays,
    expertRequired: entry.expertRequired,
  };
}
