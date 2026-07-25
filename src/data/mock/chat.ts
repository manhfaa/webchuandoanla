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
    labelEn: "Take better photos",
    prompt: "Tôi nên chụp thêm những góc nào của lá cây để ảnh rõ và dễ phân tích hơn?",
    promptEn: "Which extra angles of the leaf should I capture so the photo is clearer and easier to analyze?",
  },
  {
    id: "assistant-prompt-2",
    label: "Mô tả triệu chứng",
    labelEn: "Describe symptoms",
    prompt: "Hãy giúp tôi liệt kê những chi tiết quan trọng cần mô tả khi thấy lá có dấu hiệu bất thường.",
    promptEn: "Help me list the important details to describe when a leaf shows abnormal signs.",
  },
  {
    id: "assistant-prompt-3",
    label: "Chuẩn bị dữ liệu",
    labelEn: "Prepare your data",
    prompt: "Tôi nên ghi chú thêm những thông tin nào ngoài hiện trường để lần phân tích sau hữu ích hơn?",
    promptEn: "What other field information should I note down to make the next analysis more useful?",
  },
];

export const expertQuickPrompts: QuickPrompt[] = [
  {
    id: "expert-prompt-1",
    label: "Theo dõi ngoài ruộng",
    labelEn: "Monitoring in the field",
    prompt: "Ngoài ruộng vườn, tôi nên theo dõi thêm những dấu hiệu nào khi thấy lá cây bất thường?",
    promptEn: "Out in the field, which additional signs should I watch for when a leaf looks abnormal?",
  },
  {
    id: "expert-prompt-2",
    label: "Ghi chú thực địa",
    labelEn: "Field notes",
    prompt: "Tôi nên ghi lại những thông tin thực địa nào để tiện đánh giá tình trạng lá cây?",
    promptEn: "Which field observations should I record to make it easier to assess the leaf's condition?",
  },
  {
    id: "expert-prompt-3",
    label: "Ưu tiên xử lý",
    labelEn: "Treatment priorities",
    prompt: "Nếu chưa có kết luận cuối cùng, tôi nên ưu tiên những bước xử lý an toàn nào trước?",
    promptEn: "If there is no final conclusion yet, which safe treatment steps should I prioritize first?",
  },
];
