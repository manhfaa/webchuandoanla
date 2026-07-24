export const landingNavItems = [
  { label: "Quy trình", labelEn: "Process", href: "#quy-trinh" },
  { label: "Tính năng", labelEn: "Features", href: "#tinh-nang" },
  { label: "Cây trồng", labelEn: "Crops", href: "#cay-trong" },
  { label: "Đội ngũ dự án", labelEn: "Team", href: "#thanh-vien" },
  { label: "Bảng giá", labelEn: "Pricing", href: "#goi-dich-vu" },
];

export const dashboardNavGroups = [
  {
    group: "Theo dõi",
    groupEn: "Monitor",
    items: [
      { label: "Tổng quan", labelEn: "Overview", href: "/dashboard" },
      { label: "Kiểm tra ảnh", labelEn: "Leaf check", href: "/dashboard/diagnosis" },
      { label: "Lịch sử", labelEn: "History", href: "/dashboard/history" },
    ],
  },
  {
    group: "Quản lý vườn",
    groupEn: "Garden",
    items: [
      { label: "Lô vườn", labelEn: "Farm plots", href: "/dashboard/farms" },
      { label: "Thời tiết & cảnh báo", labelEn: "Weather & alerts", href: "/dashboard/weather-alerts" },
      { label: "Kế hoạch trồng", labelEn: "Crop plans", href: "/dashboard/crop-plans" },
    ],
  },
  {
    group: "Hỗ trợ",
    groupEn: "Support",
    items: [
      { label: "Chat tư vấn", labelEn: "Advisory chat", href: "/dashboard/chat" },
      { label: "Thư viện vật tư", labelEn: "Input library", href: "/dashboard/input-library" },
    ],
  },
  {
    group: "Tài khoản",
    groupEn: "Account",
    items: [
      { label: "Gói dịch vụ", labelEn: "Plans", href: "/dashboard/pricing" },
      { label: "Hồ sơ", labelEn: "Profile", href: "/dashboard/profile" },
    ],
  },
];
