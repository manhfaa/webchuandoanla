export const PLANS = {
  seed: {
    key: "seed" as const,
    name: "Seed",
    icon: "🌱",
    price: 0,
    priceLabel: "Miễn phí",
    priceLabelEn: "Free",
    tagline: "Bắt đầu khám phá",
    taglineEn: "Start exploring",
    color: "emerald",
    features: [
      "Kiểm tra ảnh lá cây (5 lần/ngày)",
      "Lưu lịch sử 7 ngày gần nhất",
      "Chat AI (3 câu/ngày)",
      "Tải ảnh hoặc chụp trực tiếp",
    ],
    featuresEn: [
      "Leaf image checks (5 per day)",
      "Keep the last 7 days of history",
      "AI chat (3 questions per day)",
      "Upload a photo or capture directly",
    ],
  },
  grow: {
    key: "grow" as const,
    name: "Grow",
    icon: "🌿",
    price: 9000,
    priceLabel: "9.000đ/tháng",
    priceLabelEn: "9,000đ/month",
    tagline: "Phát triển đều đặn",
    taglineEn: "Steady growth",
    color: "green",
    features: [
      "Kiểm tra ảnh lá cây (30 lần/ngày)",
      "Lưu lịch sử 30 ngày",
      "Chat AI (20 câu/ngày)",
      "Lập kế hoạch trồng cây (2 kế hoạch)",
    ],
    featuresEn: [
      "Leaf image checks (30 per day)",
      "Keep 30 days of history",
      "AI chat (20 questions per day)",
      "Crop planning (2 plans)",
    ],
  },
  bloom: {
    key: "bloom" as const,
    name: "Bloom",
    icon: "🌳",
    price: 39000,
    priceLabel: "39.000đ/tháng",
    priceLabelEn: "39,000đ/month",
    tagline: "Nở rộ toàn diện",
    taglineEn: "Full bloom",
    color: "teal",
    popular: true,
    features: [
      "Kiểm tra ảnh lá không giới hạn",
      "Lưu toàn bộ lịch sử",
      "Chat AI không giới hạn",
      "Tư vấn nông nghiệp nâng cao",
      "Lập kế hoạch trồng cây (10 kế hoạch)",
      "Ưu tiên tốc độ xử lý",
      "Hỗ trợ qua email",
    ],
    featuresEn: [
      "Unlimited leaf image checks",
      "Keep your full history",
      "Unlimited AI chat",
      "Advanced agriculture advice",
      "Crop planning (10 plans)",
      "Priority processing speed",
      "Email support",
    ],
  },
  elite: {
    key: "elite" as const,
    name: "Elite",
    icon: "👑",
    price: 99000,
    priceLabel: "99.000đ/tháng",
    priceLabelEn: "99,000đ/month",
    tagline: "Đỉnh cao chuyên nghiệp",
    taglineEn: "Professional peak",
    color: "amber",
    features: [
      "Tất cả tính năng Bloom",
      "Xuất báo cáo PDF",
      "Quyền tích hợp dữ liệu nâng cao",
      "Kế hoạch trồng cây không giới hạn",
      "Hỗ trợ ưu tiên qua email + chat",
    ],
    featuresEn: [
      "Everything in Bloom",
      "Export PDF reports",
      "Advanced data integration access",
      "Unlimited crop plans",
      "Priority support via email + chat",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export const PLAN_PRICES: Record<string, number> = {
  grow: 9000,
  bloom: 39000,
  elite: 99000,
};

export const PLAN_ORDER: PlanKey[] = ["seed", "grow", "bloom", "elite"];

export function normalizePlan(plan: unknown): PlanKey {
  if (typeof plan !== "string") return "seed";
  if (plan in PLANS) return plan as PlanKey;
  if (plan === "free") return "seed";
  if (plan === "pro") return "grow";
  if (plan === "plus") return "bloom";
  return "seed";
}

export function getPlanRank(plan: string): number {
  return PLAN_ORDER.indexOf(normalizePlan(plan));
}
