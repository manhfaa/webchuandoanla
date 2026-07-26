import { PricingPlan } from "@/types";

/**
 * Presentation copy for the plans, plus an offline fallback for their prices.
 *
 * The catalogue at `GET /api/engagement/plans/` is the source of truth for what
 * an account is actually charged: the pricing screens overwrite the price
 * strings below with the live values (see `applyCatalogue`) and only fall
 * back to them when the server cannot be reached. `payments/tests.py` asserts
 * that these prices still match the catalogue, so editing one side alone fails
 * the test suite instead of quietly advertising the wrong amount.
 *
 * `features` deliberately holds NO quota. Every cap ("5 lần/ngày", "2 kế
 * hoạch", …) is generated from the catalogue by `catalogueFeatureLines`, so the
 * number the card advertises is the same number `entitlements.py` enforces.
 * What stays here is the copy that has no number in it.
 */
export const pricingPlans: PricingPlan[] = [
  {
    id: "seed",
    name: "Seed",
    icon: "🌱",
    price: "Miễn phí",
    priceEn: "Free",
    description: "Bắt đầu khám phá với lượt kiểm tra lá, lịch sử ngắn và chat AI cơ bản.",
    descriptionEn: "Start exploring with leaf checks, short history and basic AI chat.",
    cta: "Dùng miễn phí",
    ctaEn: "Use for free",
    features: [
      "Tải ảnh hoặc chụp trực tiếp",
      "Xem lại kết quả đã lưu bất cứ lúc nào",
    ],
    featuresEn: [
      "Upload a photo or capture directly",
      "Reopen any saved result at any time",
    ],
  },
  {
    id: "grow",
    name: "Grow",
    icon: "🌿",
    price: "9.000đ/tháng",
    priceEn: "9,000đ/month",
    description: "Tăng tần suất kiểm tra, lưu lịch sử lâu hơn và bắt đầu lập kế hoạch.",
    descriptionEn: "Check more often, keep history longer and start planning.",
    cta: "Nâng cấp Grow",
    ctaEn: "Upgrade to Grow",
    features: [
      "Tải ảnh hoặc chụp trực tiếp",
      "Nhắc việc theo từng bước chăm cây",
    ],
    featuresEn: [
      "Upload a photo or capture directly",
      "Reminders for each plant-care step",
    ],
  },
  {
    id: "bloom",
    name: "Bloom",
    icon: "🌳",
    price: "39.000đ/tháng",
    priceEn: "39,000đ/month",
    description: "Theo dõi toàn diện với lượt kiểm tra mở rộng và tư vấn nông nghiệp nâng cao.",
    descriptionEn: "Comprehensive monitoring with expanded checks and advanced agriculture advice.",
    cta: "Nâng cấp Bloom",
    ctaEn: "Upgrade to Bloom",
    highlight: true,
    badge: "Phổ biến nhất",
    badgeEn: "Most popular",
    features: [
      "Ưu tiên tốc độ xử lý",
      "Hỗ trợ qua email",
    ],
    featuresEn: [
      "Priority processing speed",
      "Email support",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    icon: "👑",
    price: "99.000đ/tháng",
    priceEn: "99,000đ/month",
    description: "Dành cho nhu cầu chuyên sâu, xuất báo cáo, tích hợp nâng cao và hỗ trợ ưu tiên.",
    descriptionEn: "For intensive needs: report exports, advanced integration and priority support.",
    cta: "Nâng cấp Elite",
    ctaEn: "Upgrade to Elite",
    features: [
      "Tất cả tính năng Bloom",
      "Quyền tích hợp dữ liệu nâng cao",
      "Hỗ trợ ưu tiên qua email + chat",
    ],
    featuresEn: [
      "All Bloom features",
      "Advanced data integration access",
      "Priority support via email + chat",
    ],
  },
];
