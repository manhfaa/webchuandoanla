import { WorkflowStep } from "@/types";

export const workflowSteps: WorkflowStep[] = [
  {
    id: "upload",
    step: "Bước 1",
    title: "Tải ảnh lá",
    description:
      "Tải ảnh có sẵn hoặc chụp trực tiếp bằng điện thoại để bắt đầu kiểm tra tình trạng lá.",
  },
  {
    id: "yolo",
    step: "Bước 2",
    title: "YOLO kiểm tra lá",
    description:
      "Hệ thống kiểm tra ảnh có vùng lá rõ ràng hay không trước khi chuyển sang bước phân tích.",
  },
  {
    id: "cnn",
    step: "Bước 3",
    title: "CNN gợi ý khả năng",
    description:
      "Mô hình phân tích ảnh và hiển thị các khả năng cao nhất kèm độ tin cậy để người dùng dễ so sánh.",
  },
  {
    id: "symptoms",
    step: "Bước 4",
    title: "Nhập triệu chứng",
    description:
      "Có thể mô tả đốm lá, màu sắc, mép lá, tình trạng cây hoặc bỏ qua nếu chưa quan sát rõ.",
  },
  {
    id: "tavily",
    step: "Bước 5",
    title: "Tavily tìm nguồn",
    description:
      "Hệ thống tìm nguồn tham khảo trên web để đối chiếu triệu chứng với các khả năng AI đã gợi ý.",
  },
  {
    id: "deepseek",
    step: "Bước 6",
    title: "DeepSeek tổng hợp",
    description:
      "AI tóm tắt thông tin liên quan, giải thích mức độ phù hợp và đưa ra khuyến nghị dễ hiểu.",
  },
  {
    id: "history",
    step: "Bước 7",
    title: "Lưu lịch sử",
    description:
      "Kết quả, nguồn tham khảo và khuyến nghị được lưu lại để tiện theo dõi tình trạng cây theo thời gian.",
  },
];
