import { ChatApiResponse, ChatMode, DiagnosisRecord } from "@/types";

/** Same shape as `useTr`, passed in so this module stays usable on the server. */
export type Tr = (vi: string, en: string) => string;

/** No caller language: keep the Vietnamese wording, exactly as before. */
const viOnly: Tr = (vi) => vi;

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

function buildAssistantAnswer(query: string, tr: Tr, latestDiagnosis?: DiagnosisRecord | null) {
  const normalized = normalize(query);

  if (normalized.includes("chup") || normalized.includes("anh")) {
    return [
      tr(
        "Để có ảnh lá dễ phân tích hơn, bạn nên chụp cận cảnh vùng có dấu hiệu bất thường, giữ khung hình đủ sáng và tránh rung.",
        "For a leaf photo that is easier to read, get in close on the part that looks wrong, keep the light good and hold the camera steady.",
      ),
      tr(
        "Hãy chụp thêm ít nhất 2 đến 3 góc khác nhau: toàn lá, mặt trước, mặt sau và cả phần cuống hoặc mép lá nếu có tổn thương.",
        "Take at least two or three more angles: the whole leaf, the top, the underside, and the stalk or leaf edge if those are damaged too.",
      ),
      latestDiagnosis
        ? tr(
            "Vì ca được chọn đã được YOLO xác thực là lá hợp lệ, bạn có thể dùng ảnh đó làm mốc và chụp bổ sung ở cùng điều kiện ánh sáng để tiện so sánh.",
            "The case you picked was already YOLO verified as a real leaf, so use that photo as your baseline and take the extra shots in the same light for an easy comparison.",
          )
        : tr(
            "Khi chưa có ca chẩn đoán được chọn, bạn chỉ cần ưu tiên ảnh rõ nét và có nền ít nhiễu để lần phân tích sau ổn định hơn.",
            "With no diagnosis picked yet, just aim for a sharp photo on a plain background so the next analysis comes out steadier.",
          ),
    ].join("\n\n");
  }

  if (normalized.includes("cnn") || normalized.includes("phan loai") || normalized.includes("benh")) {
    return [
      tr(
        "Hiện tại hệ thống chat này không tự suy diễn bệnh như một mô hình phân loại. Nó chỉ đóng vai trò trợ lý AI trò chuyện thông thường.",
        "This chat does not work the disease out on its own the way a classification model does. It is only an ordinary AI chat assistant.",
      ),
      hasClassification(latestDiagnosis)
        ? tr(
            `Nếu ca được chọn đã có thêm dữ liệu phân loại cho ${latestDiagnosis?.plant.toLowerCase()}, bạn có thể dùng cuộc trò chuyện này để hỏi tiếp về cách theo dõi, ghi chú và chuẩn bị bước xử lý.`,
            `If the case you picked already carries classification data for ${latestDiagnosis?.plant.toLowerCase()}, use this conversation to ask about how to keep watch, what to note down and how to get ready to treat it.`,
          )
        : tr(
            "Vì chưa có kết quả phân tích ảnh, bạn nên xem đây là kênh hỗ trợ hỏi đáp và chuẩn bị thông tin, không phải kết luận cuối cùng.",
            "With no photo result yet, treat this as a place to ask questions and gather information, not as a final conclusion.",
          ),
      tr(
        "Bạn có thể hỏi tiếp về cách mô tả triệu chứng, chụp bổ sung ảnh hoặc tổng hợp những gì cần ghi nhận ngoài hiện trường.",
        "You can go on to ask how to describe the symptoms, which extra photos to take, or what is worth writing down out in the field.",
      ),
    ].join("\n\n");
  }

  if (normalized.includes("nen hoi") || normalized.includes("hoi gi") || normalized.includes("ghi chu")) {
    return [
      tr(
        "Bạn nên hỏi theo 3 nhóm thông tin để cuộc trò chuyện hữu ích hơn.",
        "Ask along three lines and this conversation will be far more useful.",
      ),
      tr(
        "Nhóm 1: Lá đang đổi màu thế nào, xuất hiện đốm gì, lan nhanh hay chậm.",
        "Group 1: How the leaf is changing colour, what kind of spots have shown up, and whether they are spreading fast or slowly.",
      ),
      tr(
        "Nhóm 2: Gần đây có mưa nhiều, tưới nhiều, nắng gắt hay sâu xuất hiện không.",
        "Group 2: Whether there has been heavy rain, heavy watering, harsh sun or insects about lately.",
      ),
      tr(
        "Nhóm 3: Bạn muốn AI hỗ trợ điều gì, ví dụ tóm tắt tình huống, gợi ý ảnh cần chụp thêm hay lên checklist quan sát.",
        "Group 3: What you want the AI to help with, such as summing up the situation, suggesting more photos to take, or drawing up a checklist to watch by.",
      ),
    ].join("\n\n");
  }

  return [
    tr(
      "Mình có thể hỗ trợ bạn như một trợ lý AI trò chuyện thông thường: làm rõ câu hỏi, tóm tắt tình huống và gợi ý bước tiếp theo.",
      "I can help you the way an ordinary AI chat assistant would: making the question clearer, summing up the situation and suggesting the next step.",
    ),
    latestDiagnosis
      ? hasClassification(latestDiagnosis)
        ? tr(
            `Hiện bạn đang chọn một ca liên quan tới ${latestDiagnosis.plant.toLowerCase()}, nên mình có thể bám vào bối cảnh đó để tư vấn tiếp.`,
            `You currently have a case about ${latestDiagnosis.plant.toLowerCase()} picked, so I can stay with that context as we go on.`,
          )
        : tr(
            "Hiện trong phiên có ảnh lá đã được YOLO xác thực, nên mình có thể hỗ trợ bạn theo hướng quan sát, ghi chú và chuẩn bị dữ liệu cho bước sau.",
            "This session already has a leaf photo YOLO verified, so I can help you with what to watch for, what to note down and what to prepare for the step after.",
          )
      : tr(
          "Hiện chưa có ca chẩn đoán được chọn, nên mình sẽ trả lời ở mức hướng dẫn chung.",
          "No diagnosis case is picked yet, so I will keep the answers at the level of general guidance.",
        ),
    tr(
      "Bạn cứ đặt câu hỏi theo cách tự nhiên như đang chat với ChatGPT, mình sẽ giúp bạn hệ thống lại vấn đề.",
      "Just ask in your own words, the way you would chat with ChatGPT, and I will help you put the problem in order.",
    ),
  ].join("\n\n");
}

function buildExpertAnswer(query: string, tr: Tr, latestDiagnosis?: DiagnosisRecord | null) {
  const normalized = normalize(query);

  if (normalized.includes("theo doi") || normalized.includes("dau hieu") || normalized.includes("quan sat")) {
    return [
      tr(
        "Nếu theo dõi ngoài thực địa, tôi khuyên bạn quan sát cả mặt trên và mặt dưới lá, tốc độ lan rộng của vùng bất thường và mức độ ảnh hưởng trên các lá cùng tầng.",
        "Out in the field I would look at both the top and the underside of the leaf, how fast the bad patch is spreading, and how far it has reached the other leaves at the same level.",
      ),
      tr(
        "Bạn cũng nên ghi lại thời điểm phát hiện, điều kiện mưa nắng gần đây, chế độ tưới và việc có côn trùng hay không.",
        "Write down when you first noticed it, the recent rain and sun, how you have been watering, and whether there are insects about.",
      ),
      latestDiagnosis
        ? tr(
            "Với ảnh gần nhất đã xác thực là lá, bạn nên chụp thêm một ảnh toàn cây và một ảnh cụm lá lân cận để đối chiếu.",
            "Since the latest photo is confirmed as a leaf, take one more of the whole plant and one of the leaf cluster beside it to compare against.",
          )
        : tr(
            "Nếu chưa có ảnh gần nhất trong phiên, bạn nên bắt đầu bằng một bộ ảnh toàn cây, cận lá và bối cảnh khu vực trồng.",
            "With no recent photo in this session, start with a set: the whole plant, a close-up of the leaf, and the growing area around it.",
          ),
    ].join("\n\n");
  }

  if (normalized.includes("xu ly") || normalized.includes("giai phap") || normalized.includes("dieu tri")) {
    return [
      tr(
        "Ở góc nhìn chuyên gia, tôi sẽ ưu tiên xử lý an toàn và theo từng bước, không nên kết luận quá sớm khi dữ liệu còn ít.",
        "As an expert I would go for the safe, step-by-step route and hold off on a conclusion while there is still so little to go on.",
      ),
      tr(
        "Trước hết hãy khoanh vùng lá bị ảnh hưởng rõ, theo dõi mức lan trong vài ngày và giữ khu vực trồng thông thoáng.",
        "First mark off the clearly affected leaves, watch how far it spreads over the next few days, and keep the plot well aired.",
      ),
      tr(
        "Sau đó mới cân nhắc biện pháp phù hợp theo tình trạng thực tế, đồng thời lưu lại ảnh và ghi chú để đối chiếu với các lần quan sát tiếp theo.",
        "Only then weigh up the right measure for what you are actually seeing, and keep the photos and notes so you can hold them against your next look.",
      ),
    ].join("\n\n");
  }

  return [
    tr(
      "Tôi có thể hỗ trợ bạn như một chuyên gia nông nghiệp trong phần hỏi đáp: giúp bạn xác định nên quan sát gì, cần ghi chú gì và nên ưu tiên bước nào ngoài thực địa.",
      "I can help you here the way an agronomist would: working out what to look at, what to note down and which step to take first out in the field.",
    ),
    latestDiagnosis
      ? tr(
          "Vì phiên hiện tại đã có ảnh lá được xác thực, bạn nên tận dụng bối cảnh đó để hỏi sâu hơn về cách theo dõi và bổ sung dữ liệu thực tế.",
          "This session already has a verified leaf photo, so make use of that context and ask further about how to keep watch and what field data is worth adding.",
        )
      : tr(
          "Nếu chưa có ca mới, bạn vẫn có thể hỏi về quy trình quan sát lá cây và cách chuẩn bị thông tin trước khi xử lý.",
          "With no new case, you can still ask about how to inspect leaves and how to prepare the information before treating anything.",
        ),
    tr(
      "Bạn cứ hỏi theo hướng thực tế ngoài ruộng vườn, mình sẽ trả lời ngắn gọn và dễ áp dụng hơn.",
      "Ask in practical, out-in-the-field terms and I will keep the answers short and easy to act on.",
    ),
  ].join("\n\n");
}

export function buildChatApiResponse({
  query,
  mode,
  latestDiagnosis,
  tr = viOnly,
}: {
  query: string;
  mode: ChatMode;
  latestDiagnosis?: DiagnosisRecord | null;
  /** Pass the caller's `tr` to answer in the language the reader chose. */
  tr?: Tr;
}): ChatApiResponse {
  const answer =
    mode === "expert"
      ? buildExpertAnswer(query, tr, latestDiagnosis)
      : buildAssistantAnswer(query, tr, latestDiagnosis);

  return {
    mode,
    answer,
    generatedAt: new Date().toISOString(),
  };
}
