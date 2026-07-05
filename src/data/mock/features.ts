import { FeatureItem } from "@/types";

export const featureItems: FeatureItem[] = [
  {
    id: "cnn",
    eyebrow: "CNN nhận diện bệnh",
    title: "Gợi ý các khả năng bệnh từ ảnh lá",
    description:
      "Sau khi ảnh hợp lệ, mô hình phân tích đặc điểm trên lá và hiển thị các khả năng cao nhất kèm độ tin cậy để người dùng có thêm cơ sở quan sát.",
    accent: "from-emerald-400/30 via-lime-200/20 to-transparent",
  },
  {
    id: "yolo",
    eyebrow: "YOLO xác thực ảnh",
    title: "Chặn ảnh không phải lá trước khi phân tích",
    description:
      "Nếu ảnh quá mờ, không có lá hoặc vùng lá khó nhận biết, hệ thống sẽ nhắc người dùng chụp lại để tránh đưa ra kết quả thiếu tin cậy.",
    accent: "from-teal-400/30 via-emerald-200/20 to-transparent",
  },
  {
    id: "tavily",
    eyebrow: "Tavily tìm nguồn web",
    title: "Kiểm chứng triệu chứng bằng nguồn tham khảo",
    description:
      "Khi người dùng nhập triệu chứng quan sát được, hệ thống tìm nguồn tham khảo trên web để đối chiếu xem mô tả đó có phù hợp với các khả năng AI gợi ý hay không.",
    accent: "from-cyan-300/30 via-emerald-100/25 to-transparent",
  },
  {
    id: "deepseek",
    eyebrow: "DeepSeek tổng hợp",
    title: "Chốt kết luận và khuyến nghị dễ hiểu",
    description:
      "DeepSeek tổng hợp kết quả ảnh, triệu chứng và nguồn tham khảo thành phần giải thích ngắn gọn, có trích dẫn và gợi ý bước xử lý ban đầu.",
    accent: "from-lime-300/40 via-amber-100/25 to-transparent",
  },
  {
    id: "weather",
    eyebrow: "Thời tiết & sâu bệnh",
    title: "Theo dõi điều kiện canh tác tại vị trí thật",
    description:
      "Người dùng có thể lưu vị trí vườn, xem thời tiết, độ ẩm, mưa gió và nhận cảnh báo chăm sóc cây theo điều kiện tại khu vực của mình.",
    accent: "from-sky-300/30 via-emerald-100/25 to-transparent",
  },
  {
    id: "history",
    eyebrow: "Lịch sử chẩn đoán",
    title: "Lưu lại ảnh, kết quả và nguồn tham khảo",
    description:
      "Mỗi lần kiểm tra có thể được lưu để xem lại diễn biến, so sánh ảnh cũ và theo dõi hiệu quả chăm sóc trong nhiều ngày.",
    accent: "from-emerald-300/40 via-white/10 to-transparent",
  },
  {
    id: "crop-plans",
    eyebrow: "Kế hoạch canh tác",
    title: "Biến kết quả AI thành việc cần làm",
    description:
      "Agromind AI hỗ trợ lập kế hoạch trồng, nhắc việc tưới bón và liên kết kết quả kiểm tra lá với từng lô vườn để dễ theo dõi.",
    accent: "from-green-300/40 via-yellow-100/25 to-transparent",
  },
];
