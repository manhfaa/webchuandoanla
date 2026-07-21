import { WorkflowStep } from "@/types";

export const workflowSteps: WorkflowStep[] = [
  {
    id: "upload",
    step: "Bước 1",
    title: "Tải ảnh lá",
    description:
      "Người dùng tải ảnh hoặc chụp trực tiếp trên điện thoại để bắt đầu ca chẩn đoán.",
  },
  {
    id: "yolo",
    step: "Bước 2",
    title: "YOLO kiểm tra lá",
    description:
      "Hệ thống xác thực ảnh có vùng lá rõ ràng trước khi cho đi tiếp qua mô hình phân loại.",
  },
  {
    id: "cnn",
    step: "Bước 3",
    title: "CNN dự đoán top 5",
    description:
      "Mô hình CNN trả về 5 khả năng bệnh/cây cao nhất kèm độ tin cậy để người dùng dễ so sánh.",
  },
  {
    id: "symptoms",
    step: "Bước 4",
    title: "Nhập triệu chứng",
    description:
      "Người dùng có thể mô tả đốm lá, màu sắc, mép lá hoặc chọn không nhập nếu chưa quan sát rõ.",
  },
  {
    id: "tavily",
    step: "Bước 5",
    title: "Tavily tìm nguồn",
    description:
      "DeepSeek tạo câu search, Tavily lấy nguồn web tham khảo để kiểm chứng triệu chứng với kết quả CNN.",
  },
  {
    id: "deepseek",
    step: "Bước 6",
    title: "DeepSeek tổng hợp",
    description:
      "AI đọc nguồn, tóm tắt độ phù hợp và chốt kết luận cuối cùng bằng ngôn ngữ dễ hiểu.",
  },
  {
    id: "history",
    step: "Bước 7",
    title: "Lưu lịch sử",
    description:
      "Kết quả, nguồn tham khảo và khuyến nghị hành động được lưu để người dùng theo dõi mùa vụ.",
  },
];
