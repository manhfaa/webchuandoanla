export const landingNavItems = [
  { label: "Quy trình", href: "#quy-trinh" },
  { label: "Tính năng", href: "#tinh-nang" },
  { label: "Cây trồng", href: "#cay-trong" },
  { label: "Đội ngũ phát triển", href: "#thanh-vien" },
  { label: "Bảng giá", href: "#goi-dich-vu" },
];

export const dashboardNavGroups = [
  {
    group: "Theo dõi",
    items: [
      { label: "Tổng quan", href: "/dashboard" },
      { label: "Kiểm tra ảnh", href: "/dashboard/diagnosis" },
      { label: "Lịch sử", href: "/dashboard/history" },
    ],
  },
  {
    group: "Quản lý vườn",
    items: [
      { label: "Lô vườn", href: "/dashboard/farms" },
      { label: "Thời tiết & cảnh báo", href: "/dashboard/weather-alerts" },
      { label: "Kế hoạch trồng", href: "/dashboard/crop-plans" },
    ],
  },
  {
    group: "Hỗ trợ",
    items: [
      { label: "Chat tư vấn", href: "/dashboard/chat" },
      { label: "Thư viện vật tư", href: "/dashboard/input-library" },
    ],
  },
  {
    group: "Tài khoản",
    items: [
      { label: "Gói dịch vụ", href: "/dashboard/pricing" },
      { label: "Hồ sơ", href: "/dashboard/profile" },
    ],
  },
];
