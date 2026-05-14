import { WorkflowStep } from "@/types";

export const workflowSteps: WorkflowStep[] = [
  {
    id: "upload",
    step: "Bước 1",
    title: "Tải ảnh hoặc chụp ảnh lá cây",
    description:
      "Người dùng đưa ảnh vào hệ thống qua upload hoặc thao tác chụp ảnh nhanh trên thiết bị một cách đơn giản, dễ hiểu.",
  },
  {
    id: "verify",
    step: "Bước 2",
    title: "YOLO kiểm tra đúng lá cây",
    description:
      "Bộ xác thực hình ảnh giúp loại bỏ ảnh nhiễu, tăng độ tin cậy cho toàn bộ trải nghiệm và giữ đầu vào sạch cho các bước AI sau này.",
  },
  {
    id: "store",
    step: "Bước 3",
    title: "Lưu kết quả xác thực và chuẩn bị dữ liệu",
    description:
      "Ảnh hợp lệ được lưu vào lịch sử cùng mức tin cậy YOLO để người dùng dễ theo dõi, so sánh và tái sử dụng khi cần.",
  },
  {
    id: "advise",
    step: "Bước 4",
    title: "Chat RAG gợi ý bước tiếp theo",
    description:
      "Từ ảnh đã qua xác thực, Light RAG có thể tư vấn cách chụp tốt hơn, chuẩn hóa dữ liệu và cung cấp kiến thức nông nghiệp phù hợp.",
  },
  {
    id: "roadmap",
    step: "Bước 5",
    title: "CNN sẽ được bổ sung ở giai đoạn tiếp theo",
    description:
      "Agromind AI đang ưu tiên làm chắc lớp YOLO trước. Khi CNN được tích hợp, các ảnh đã lưu sẽ trở thành dữ liệu đầu vào rất hữu ích.",
  },
];
