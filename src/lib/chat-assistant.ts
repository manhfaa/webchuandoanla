import { ChatApiResponse, ChatMode, DiagnosisRecord } from "@/types";

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasClassification(record?: DiagnosisRecord | null) {
  return Boolean(record?.classificationReady);
}

function buildAssistantAnswer(query: string, latestDiagnosis?: DiagnosisRecord | null) {
  const normalized = normalize(query);

  if (normalized.includes("chup") || normalized.includes("anh")) {
    return [
      "Để có ảnh lá dễ phân tích hơn, bạn nên chụp cận cảnh vùng có dấu hiệu bất thường, giữ khung hình đủ sáng và tránh rung.",
      "Hãy chụp thêm ít nhất 2 đến 3 góc khác nhau: toàn lá, mặt trước, mặt sau và cả phần cuống hoặc mép lá nếu có tổn thương.",
      latestDiagnosis
        ? "Vì ảnh gần nhất đã được YOLO xác thực là lá hợp lệ, bạn có thể dùng ảnh đó làm mốc và chụp bổ sung ở cùng điều kiện ánh sáng để tiện so sánh."
        : "Khi chưa có ca gần nhất, bạn chỉ cần ưu tiên ảnh rõ nét và có nền ít nhiễu để lần phân tích sau ổn định hơn.",
    ].join("\n\n");
  }

  if (normalized.includes("cnn") || normalized.includes("phan loai") || normalized.includes("benh")) {
    return [
      "Hiện tại hệ thống chat này không tự suy diễn bệnh như một mô hình phân loại. Nó chỉ đóng vai trò trợ lý AI trò chuyện thông thường.",
      hasClassification(latestDiagnosis)
        ? `Nếu ca gần nhất đã có thêm dữ liệu phân loại cho ${latestDiagnosis?.plant.toLowerCase()}, bạn có thể dùng cuộc trò chuyện này để hỏi tiếp về cách theo dõi, ghi chú và chuẩn bị bước xử lý.`
        : "Vì chưa có CNN, bạn nên xem đây là một kênh hỗ trợ hỏi đáp và chuẩn bị thông tin, không phải kết luận chẩn đoán cuối cùng.",
      "Bạn có thể hỏi tiếp về cách mô tả triệu chứng, chụp bổ sung ảnh hoặc tổng hợp những gì cần ghi nhận ngoài hiện trường.",
    ].join("\n\n");
  }

  if (normalized.includes("nen hoi") || normalized.includes("hoi gi") || normalized.includes("ghi chu")) {
    return [
      "Bạn nên hỏi theo 3 nhóm thông tin để cuộc trò chuyện hữu ích hơn.",
      "Nhóm 1: Lá đang đổi màu thế nào, xuất hiện đốm gì, lan nhanh hay chậm.",
      "Nhóm 2: Gần đây có mưa nhiều, tưới nhiều, nắng gắt hay sâu xuất hiện không.",
      "Nhóm 3: Bạn muốn AI hỗ trợ điều gì, ví dụ tóm tắt tình huống, gợi ý ảnh cần chụp thêm hay lên checklist quan sát.",
    ].join("\n\n");
  }

  return [
    "Mình có thể hỗ trợ bạn như một trợ lý AI trò chuyện thông thường: làm rõ câu hỏi, tóm tắt tình huống và gợi ý bước tiếp theo.",
    latestDiagnosis
      ? hasClassification(latestDiagnosis)
        ? `Hiện trong phiên có một ca gần nhất liên quan tới ${latestDiagnosis.plant.toLowerCase()}, nên nếu bạn muốn mình có thể bám vào bối cảnh đó để tư vấn tiếp.`
        : "Hiện trong phiên có ảnh lá đã được YOLO xác thực, nên mình có thể hỗ trợ bạn theo hướng quan sát, ghi chú và chuẩn bị dữ liệu cho bước sau."
      : "Hiện chưa có ca gần nhất trong phiên, nên mình sẽ trả lời ở mức hướng dẫn chung.",
    "Bạn cứ đặt câu hỏi theo cách tự nhiên như đang chat với ChatGPT, mình sẽ giúp bạn hệ thống lại vấn đề.",
  ].join("\n\n");
}

function buildExpertAnswer(query: string, latestDiagnosis?: DiagnosisRecord | null) {
  const normalized = normalize(query);

  if (normalized.includes("theo doi") || normalized.includes("dau hieu") || normalized.includes("quan sat")) {
    return [
      "Nếu theo dõi ngoài thực địa, tôi khuyên bạn quan sát cả mặt trên và mặt dưới lá, tốc độ lan rộng của vùng bất thường và mức độ ảnh hưởng trên các lá cùng tầng.",
      "Bạn cũng nên ghi lại thời điểm phát hiện, điều kiện mưa nắng gần đây, chế độ tưới và việc có côn trùng hay không.",
      latestDiagnosis
        ? "Với ảnh gần nhất đã xác thực là lá, bạn nên chụp thêm một ảnh toàn cây và một ảnh cụm lá lân cận để đối chiếu."
        : "Nếu chưa có ảnh gần nhất trong phiên, bạn nên bắt đầu bằng một bộ ảnh toàn cây, cận lá và bối cảnh khu vực trồng.",
    ].join("\n\n");
  }

  if (normalized.includes("xu ly") || normalized.includes("giai phap") || normalized.includes("dieu tri")) {
    return [
      "Ở góc nhìn chuyên gia, tôi sẽ ưu tiên xử lý an toàn và theo từng bước, không nên kết luận quá sớm khi dữ liệu còn ít.",
      "Trước hết hãy khoanh vùng lá bị ảnh hưởng rõ, theo dõi mức lan trong vài ngày và giữ khu vực trồng thông thoáng.",
      "Sau đó mới cân nhắc biện pháp phù hợp theo tình trạng thực tế, đồng thời lưu lại ảnh và ghi chú để đối chiếu với các lần quan sát tiếp theo.",
    ].join("\n\n");
  }

  return [
    "Tôi có thể hỗ trợ bạn như một chuyên gia nông nghiệp trong phần hỏi đáp: giúp bạn xác định nên quan sát gì, cần ghi chú gì và nên ưu tiên bước nào ngoài thực địa.",
    latestDiagnosis
      ? "Vì phiên hiện tại đã có ảnh lá được xác thực, bạn nên tận dụng bối cảnh đó để hỏi sâu hơn về cách theo dõi và bổ sung dữ liệu thực tế."
      : "Nếu chưa có ca mới, bạn vẫn có thể hỏi về quy trình quan sát lá cây và cách chuẩn bị thông tin trước khi xử lý.",
    "Bạn cứ hỏi theo hướng thực tế ngoài ruộng vườn, mình sẽ trả lời ngắn gọn và dễ áp dụng hơn.",
  ].join("\n\n");
}

export function buildChatApiResponse({
  query,
  mode,
  latestDiagnosis,
}: {
  query: string;
  mode: ChatMode;
  latestDiagnosis?: DiagnosisRecord | null;
}): ChatApiResponse {
  const answer =
    mode === "expert"
      ? buildExpertAnswer(query, latestDiagnosis)
      : buildAssistantAnswer(query, latestDiagnosis);

  return {
    mode,
    answer,
    generatedAt: new Date().toISOString(),
  };
}
