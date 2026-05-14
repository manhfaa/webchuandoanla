import { PricingPlan } from "@/types";

export const pricingPlans: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    price: "0đ",
    description: "Dành cho người muốn dùng thử và làm quen với cách kiểm tra ảnh lá cây.",
    cta: "Dùng miễn phí",
    features: [
      "Xem giao diện và trải nghiệm cơ bản",
      "Kiểm tra ảnh có đúng là lá cây",
      "Lưu một số kết quả gần đây",
      "Tải ảnh hoặc chụp ảnh trực tiếp",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "299.000đ/tháng",
    description: "Phù hợp khi bạn cần kiểm tra ảnh lá thường xuyên và lưu lại đầy đủ hơn.",
    cta: "Nâng cấp Pro",
    features: [
      "Kiểm tra ảnh lá nhanh hơn",
      "Lưu lịch sử sử dụng đầy đủ hơn",
      "Ưu tiên trải nghiệm tải ảnh và chụp ảnh",
      "Nhận các tính năng mới sớm hơn",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    price: "699.000đ/tháng",
    description: "Gói đầy đủ cho người cần hỏi AI nhiều hơn và trao đổi với chuyên gia nông nghiệp.",
    cta: "Nâng cấp Plus",
    highlight: true,
    badge: "Phù hợp cho người dùng cần hỗ trợ nhiều hơn",
    features: [
      "Kiểm tra ảnh lá cây",
      "Chat AI để hỏi đáp nhanh",
      "Chat với chuyên gia nông nghiệp",
      "Lưu lịch sử đầy đủ hơn",
      "Ưu tiên hỗ trợ các tính năng mới",
    ],
  },
];
