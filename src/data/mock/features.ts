import { FeatureItem } from "@/types";

export const featureItems: FeatureItem[] = [
  {
    id: "cnn",
    eyebrow: "CNN nhận diện bệnh",
    title: "Dự đoán top 5 bệnh/cây từ ảnh lá",
    description:
      "Sau khi ảnh hợp lệ, CNN phân tích đặc trưng lá và trả về các khả năng cao nhất kèm độ tin cậy để người dùng không bị phụ thuộc vào một kết quả duy nhất.",
    accent: "from-emerald-400/30 via-lime-200/20 to-transparent",
  },
  {
    id: "yolo",
    eyebrow: "YOLO xác thực ảnh",
    title: "Chặn ảnh không phải lá trước khi phân tích",
    description:
      "YOLO đóng vai trò cổng kiểm tra đầu vào: nếu ảnh mờ, không có lá hoặc vùng lá quá khó nhìn, hệ thống cảnh báo người dùng chụp rõ hơn.",
    accent: "from-teal-400/30 via-emerald-200/20 to-transparent",
  },
  {
    id: "tavily",
    eyebrow: "Tavily tìm nguồn web",
    title: "Kiểm chứng triệu chứng bằng nguồn tham khảo",
    description:
      "Khi người dùng nhập triệu chứng, hệ thống tạo câu search và lấy nguồn web để đối chiếu xem mô tả thực tế có phù hợp với top kết quả CNN hay không.",
    accent: "from-cyan-300/30 via-emerald-100/25 to-transparent",
  },
  {
    id: "deepseek",
    eyebrow: "DeepSeek tổng hợp",
    title: "Chốt kết luận và khuyến nghị dễ hiểu",
    description:
      "DeepSeek đọc kết quả CNN, triệu chứng và nguồn Tavily để tóm tắt ngắn gọn, có trích dẫn và đề xuất hành động ban đầu phù hợp.",
    accent: "from-lime-300/40 via-amber-100/25 to-transparent",
  },
  {
    id: "weather",
    eyebrow: "Thời tiết & sâu bệnh",
    title: "Theo dõi điều kiện canh tác tại vị trí thật",
    description:
      "Người dùng có thể lưu vị trí vườn, xem thời tiết, độ ẩm, mưa gió và nhận cảnh báo chăm sóc cây theo điều kiện thực tế.",
    accent: "from-sky-300/30 via-emerald-100/25 to-transparent",
  },
  {
    id: "history",
    eyebrow: "Lịch sử chẩn đoán",
    title: "Lưu lại ảnh, kết quả và nguồn tham khảo",
    description:
      "Mỗi ca chẩn đoán có thể được lưu để xem lại diễn biến bệnh, so sánh ảnh cũ và theo dõi hiệu quả xử lý trong nhiều ngày.",
    accent: "from-emerald-300/40 via-white/10 to-transparent",
  },
  {
    id: "crop-plans",
    eyebrow: "Kế hoạch canh tác",
    title: "Biến kết quả AI thành việc cần làm",
    description:
      "Agromind AI hỗ trợ lập kế hoạch trồng, nhắc việc, theo dõi tưới bón và liên kết kết quả chẩn đoán với từng lô vườn.",
    accent: "from-green-300/40 via-yellow-100/25 to-transparent",
  },
];
