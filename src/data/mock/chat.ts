import { ChatMessage, QuickPrompt } from "@/types";

export const assistantMessages: ChatMessage[] = [
  {
    id: "assistant-1",
    role: "assistant",
    content:
      "Đây là kênh chat AI thông thường của Agromind AI. Bạn có thể trò chuyện tự nhiên như với ChatGPT để hỏi về cách chụp ảnh lá, cách mô tả triệu chứng và những bước nên làm tiếp theo.",
    createdAt: "2026-04-03T07:10:00.000Z",
  },
];

export const expertMessages: ChatMessage[] = [
  {
    id: "expert-1",
    role: "assistant",
    content:
      "Đây là kênh chuyên gia nông nghiệp. Bạn có thể hỏi về cách quan sát lá cây ngoài thực địa, những dấu hiệu cần theo dõi thêm và cách ghi chú để tiện xử lý ở các bước sau.",
    createdAt: "2026-04-03T09:40:00.000Z",
  },
];

export const assistantQuickPrompts: QuickPrompt[] = [
  {
    id: "assistant-prompt-1",
    label: "Chụp ảnh tốt hơn",
    prompt: "Tôi nên chụp thêm những góc nào của lá cây để ảnh rõ và dễ phân tích hơn?",
  },
  {
    id: "assistant-prompt-2",
    label: "Mô tả triệu chứng",
    prompt: "Hãy giúp tôi liệt kê những chi tiết quan trọng cần mô tả khi thấy lá có dấu hiệu bất thường.",
  },
  {
    id: "assistant-prompt-3",
    label: "Chuẩn bị dữ liệu",
    prompt: "Tôi nên ghi chú thêm những thông tin nào ngoài hiện trường để lần phân tích sau hữu ích hơn?",
  },
];

export const expertQuickPrompts: QuickPrompt[] = [
  {
    id: "expert-prompt-1",
    label: "Theo dõi ngoài ruộng",
    prompt: "Ngoài ruộng vườn, tôi nên theo dõi thêm những dấu hiệu nào khi thấy lá cây bất thường?",
  },
  {
    id: "expert-prompt-2",
    label: "Ghi chú thực địa",
    prompt: "Tôi nên ghi lại những thông tin thực địa nào để tiện đánh giá tình trạng lá cây?",
  },
  {
    id: "expert-prompt-3",
    label: "Ưu tiên xử lý",
    prompt: "Nếu chưa có kết luận cuối cùng, tôi nên ưu tiên những bước xử lý an toàn nào trước?",
  },
];
