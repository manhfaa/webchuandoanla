import type { ActionPlan } from "@/types";

/**
 * Per-disease-family guidance, shared by the diagnosis flow and the public
 * disease pages.
 *
 * This used to live inside the diagnosis page. It moved here when the public
 * /benh-cay pages were built, because those pages had to say the same thing the
 * app says. Two copies would have drifted, and a public page contradicting the
 * app about how to treat a disease is worse than having no page.
 *
 * The text is the team's own, already reviewed and already user-facing. Nothing
 * here was written by guessing at agronomy: it names no pesticide, and defers
 * to a local technician wherever a real treatment decision starts.
 */

export type DiseaseGuidance = {
  risk: ActionPlan["risk_level"];
  severity: string;
  immediate: string[];
  followUp: string[];
  safety: string[];
  recheckDays: number;
  expertRequired: boolean;
};

/** Folded form used for keyword matching: no diacritics, no đ. */
export function normalizeDiseaseText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Accepts either a prediction-shaped object or a plain disease name, so the
 * public pages can ask about a disease they only know by its Vietnamese label.
 */
export function guidanceForDiseaseText(text: string): DiseaseGuidance {

  if (text.includes("healthy") || text.includes("khoe")) {
    return {
      risk: "low",
      severity: "Khỏe",
      immediate: [
        "Duy trì chế độ tưới và ánh sáng hiện tại nếu cây vẫn phát triển bình thường.",
        "Tiếp tục quan sát mặt trên, mặt dưới lá và chụp lại nếu xuất hiện đốm hoặc vàng lá.",
        "Không phun thuốc khi chưa có dấu hiệu bệnh rõ ràng.",
      ],
      followUp: [
        "Kiểm tra lại sau 7 ngày hoặc sớm hơn nếu lá đổi màu.",
        "Ghi chú thời tiết, lượng tưới và phân bón để so sánh ở lần kiểm tra sau.",
      ],
      safety: ["Kết quả khỏe mạnh vẫn nên được xem là hỗ trợ, không thay thế quan sát thực địa."],
      recheckDays: 7,
      expertRequired: false,
    };
  }

  if (text.includes("blight") || text.includes("chay") || text.includes("scorch")) {
    return {
      risk: "high",
      severity: "Nguy cơ cháy lá",
      immediate: [
        "Cắt bỏ lá bị cháy nặng và gom ra khỏi khu vực trồng.",
        "Tránh tưới lên tán lá; ưu tiên tưới gốc vào buổi sáng.",
        "Tăng độ thông thoáng, giảm ẩm kéo dài quanh tán cây.",
      ],
      followUp: [
        "Theo dõi tốc độ lan trong 2 đến 3 ngày.",
        "Nếu vết cháy lan nhanh, cân nhắc hỏi kỹ thuật viên địa phương trước khi dùng thuốc.",
      ],
      safety: ["Không trộn nhiều loại thuốc cùng lúc; luôn đọc nhãn và dùng bảo hộ khi xử lý."],
      recheckDays: 3,
      expertRequired: true,
    };
  }

  if (text.includes("spot") || text.includes("scab") || text.includes("septoria") || text.includes("dom")) {
    return {
      risk: "medium",
      severity: "Đốm lá",
      immediate: [
        "Tỉa bỏ các lá có nhiều đốm và không ủ trực tiếp vào gốc.",
        "Giữ lá khô, hạn chế tưới phun mưa vào chiều tối.",
        "Vệ sinh dụng cụ cắt tỉa trước khi chuyển sang cây khác.",
      ],
      followUp: [
        "Chụp lại cùng vị trí sau 3 đến 5 ngày để so sánh mật độ đốm.",
        "Nếu đốm tăng nhanh, cân nhắc biện pháp phòng nấm/vi khuẩn phù hợp với cây trồng.",
      ],
      safety: ["Không dùng thuốc khi cây đang stress nặng do nắng nóng hoặc thiếu nước."],
      recheckDays: 4,
      expertRequired: false,
    };
  }

  if (text.includes("mildew") || text.includes("mold") || text.includes("phan") || text.includes("moc")) {
    return {
      risk: "medium",
      severity: "Mốc/phấn lá",
      immediate: [
        "Tăng thông gió và giãn khoảng cách giữa các cây nếu trồng quá dày.",
        "Loại bỏ lá có lớp mốc/phấn dày để giảm nguồn lây.",
        "Tránh để lá ẩm qua đêm.",
      ],
      followUp: [
        "Quan sát mặt dưới lá sau 2 đến 3 ngày.",
        "Nếu mốc lan rộng, hỏi chuyên gia về chế phẩm sinh học hoặc thuốc phù hợp.",
      ],
      safety: ["Không phun lưu huỳnh hoặc chế phẩm mạnh khi trời quá nóng."],
      recheckDays: 3,
      expertRequired: false,
    };
  }

  if (text.includes("rust") || text.includes("gi")) {
    return {
      risk: "medium",
      severity: "Gỉ lá",
      immediate: [
        "Cắt bỏ lá có ổ bào tử màu vàng/cam/nâu rõ rệt.",
        "Giữ vườn thông thoáng và tránh tưới ướt lá.",
        "Thu gom lá rụng để giảm nguồn bệnh tồn dư.",
      ],
      followUp: [
        "Theo dõi mặt dưới lá trong 3 ngày tới.",
        "Nếu xuất hiện nhiều ổ gỉ mới, cần tư vấn thuốc đặc trị theo cây trồng.",
      ],
      safety: ["Dùng găng tay khi loại bỏ lá bệnh và rửa tay sau khi xử lý."],
      recheckDays: 3,
      expertRequired: false,
    };
  }

  if (text.includes("rot") || text.includes("thoi") || text.includes("black")) {
    return {
      risk: "high",
      severity: "Thối/đen mô lá",
      immediate: [
        "Ngừng tưới quá nhiều và kiểm tra thoát nước của đất/chậu.",
        "Loại bỏ phần lá hoặc mô bị thối mềm, có mùi hoặc chuyển đen.",
        "Tách cây nghi nhiễm nặng khỏi cây khỏe nếu trồng gần nhau.",
      ],
      followUp: [
        "Theo dõi thân, cuống và rễ trong 2 ngày.",
        "Nếu thối lan xuống thân hoặc rễ, cần chuyên gia kiểm tra trực tiếp.",
      ],
      safety: ["Không dùng lại đất/chậu bẩn cho cây khác nếu nghi có mầm bệnh."],
      recheckDays: 2,
      expertRequired: true,
    };
  }

  if (text.includes("virus") || text.includes("curl") || text.includes("mosaic") || text.includes("yellow")) {
    return {
      risk: "high",
      severity: "Nghi virus/xoăn vàng",
      immediate: [
        "Cách ly cây nghi nhiễm để hạn chế côn trùng truyền bệnh lan sang cây khác.",
        "Kiểm tra rệp, bọ phấn, bọ trĩ ở mặt dưới lá và đọt non.",
        "Không lấy giống, cành chiết hoặc hạt từ cây đang nghi nhiễm.",
      ],
      followUp: [
        "Chụp ảnh toàn cây và đọt non sau 2 đến 3 ngày.",
        "Nếu cây còi cọc, xoăn lá tăng nhanh, nên hỏi kỹ thuật viên trước khi giữ lại cây.",
      ],
      safety: ["Virus thường khó chữa bằng thuốc; tránh phun thuốc tràn lan gây tốn kém và tồn dư."],
      recheckDays: 3,
      expertRequired: true,
    };
  }

  if (text.includes("mite") || text.includes("spider") || text.includes("nhen")) {
    return {
      risk: "medium",
      severity: "Nghi nhện hại",
      immediate: [
        "Soi mặt dưới lá để tìm chấm nhỏ di chuyển hoặc tơ mịn.",
        "Phun rửa nhẹ bằng nước sạch để giảm mật số ban đầu nếu cây chịu được.",
        "Tách cây bị nặng và tránh để khô nóng kéo dài.",
      ],
      followUp: [
        "Kiểm tra lại sau 2 ngày, nhất là mặt dưới lá non.",
        "Nếu mật số tăng, dùng biện pháp sinh học hoặc thuốc theo khuyến cáo địa phương.",
      ],
      safety: ["Không lạm dụng thuốc trừ sâu phổ rộng vì có thể làm giảm thiên địch."],
      recheckDays: 2,
      expertRequired: false,
    };
  }

  return {
    risk: "medium",
    severity: "Cần theo dõi",
    immediate: [
      "Khoanh vùng lá có dấu hiệu rõ nhất và chụp thêm ảnh ở mặt trên, mặt dưới lá.",
      "Giữ cây thông thoáng, tránh tưới lên lá vào chiều tối.",
      "Ghi lại thời điểm phát hiện, thời tiết gần đây và cách chăm sóc.",
    ],
    followUp: [
      "Kiểm tra lại sau 3 đến 5 ngày để xem triệu chứng có lan không.",
      "Nếu cây suy nhanh hoặc bệnh lan rộng, nên hỏi chuyên gia nông nghiệp địa phương.",
    ],
    safety: ["Chỉ dùng thuốc khi đã xác định rõ nhóm nguyên nhân và đúng hướng dẫn trên nhãn."],
    recheckDays: 4,
    expertRequired: false,
  };
}
