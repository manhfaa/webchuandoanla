import { DiagnosisRecord } from "@/types";

export const mockDiagnoses: DiagnosisRecord[] = [
  {
    id: "demo-corn-leaf-verified",
    plant: "Ngô",
    disease: "Ảnh lá đã xác thực",
    confidence: 0.96,
    severity: "Chờ CNN",
    classificationReady: false,
    image: "/illustrations/leaf-sample-corn.svg",
    createdAt: "2026-03-29T08:30:00.000Z",
    note: "YOLO đã xác nhận đây là ảnh lá ngô hợp lệ. Mô hình CNN phân loại bệnh sẽ được bổ sung ở giai đoạn tiếp theo.",
    yoloVerified: true,
    leafConfidence: 0.96,
    leafCheckNote: "Ảnh mẫu có phiến lá rõ, vùng xanh nổi bật và đủ ổn định để qua bước xác thực đầu vào.",
    inputMethod: "sample",
    origin: "mock",
    symptomSummary:
      "Phiến lá hiển thị rõ, nền ít nhiễu và vùng thực vật chiếm phần lớn khung hình. Ảnh này phù hợp để lưu làm đầu vào sạch cho giai đoạn CNN sau này.",
    causes: [
      "Ảnh đủ sáng, bề mặt lá dễ quan sát.",
      "Phiến lá chiếm phần lớn khung hình và ít vật thể gây nhiễu.",
      "Góc chụp bám sát lá nên hệ thống nhận diện vùng thực vật rõ hơn.",
    ],
    recommendations: [
      {
        title: "Bước nên làm tiếp",
        items: [
          "Lưu ảnh này vào lịch sử để dùng lại khi mô hình CNN được tích hợp.",
          "Giữ thêm 2 đến 3 ảnh chụp ở các góc khác nhau nếu muốn so sánh về sau.",
          "Ghi chú tình trạng thực tế của ruộng hoặc chậu cây để làm context cho chat Light RAG.",
        ],
      },
      {
        title: "Mẹo chụp ảnh tốt hơn",
        items: [
          "Ưu tiên chụp dưới ánh sáng tự nhiên, tránh vùng quá tối hoặc cháy sáng.",
          "Đưa lá vào gần khung hình và giảm bớt nền thừa phía sau.",
          "Nếu lá rung hoặc gió mạnh, hãy chụp thêm ảnh dự phòng để chọn ảnh rõ nhất.",
        ],
      },
    ],
  },
  {
    id: "demo-tomato-leaf-verified",
    plant: "Cà chua",
    disease: "Ảnh lá đã xác thực",
    confidence: 0.95,
    severity: "Chờ CNN",
    classificationReady: false,
    image: "/illustrations/leaf-sample-tomato.svg",
    createdAt: "2026-03-25T10:15:00.000Z",
    note: "Ảnh lá cà chua đã vượt qua bước YOLO xác thực đầu vào. Hệ thống hiện chưa chạy lớp CNN phân loại bệnh.",
    yoloVerified: true,
    leafConfidence: 0.95,
    leafCheckNote: "Ảnh có độ tương phản ổn và vùng lá chiếm tỉ lệ cao nên phù hợp cho bước nhận diện lá.",
    inputMethod: "sample",
    origin: "mock",
    symptomSummary:
      "Ảnh tập trung tốt vào bề mặt lá, đủ điều kiện để xác nhận đây là lá cây hợp lệ. Trong phiên bản hiện tại, kết quả dừng ở bước xác thực ảnh thay vì chẩn đoán bệnh.",
    causes: [
      "Mặt lá hiển thị rõ, ít bóng đổ.",
      "Màu xanh và kết cấu lá được giữ tốt trong khung hình.",
      "Nền sau ảnh không lấn át vùng lá chính.",
    ],
    recommendations: [
      {
        title: "Bước nên làm tiếp",
        items: [
          "Lưu lại ảnh để theo dõi chuỗi ảnh cùng một cây trong các ngày khác nhau.",
          "Chuẩn bị thêm ảnh cận cảnh nếu sau này cần chạy CNN hoặc gửi cho chuyên gia.",
          "Dùng chat Light RAG để hỏi về cách thu thập dữ liệu ảnh nông nghiệp tốt hơn.",
        ],
      },
      {
        title: "Mẹo chụp ảnh tốt hơn",
        items: [
          "Tránh chụp ngược sáng để không làm mất chi tiết gân lá.",
          "Không đặt tay hoặc vật thể sáng màu che mép lá khi chụp.",
          "Nếu lá có nước đọng, lau nhẹ hoặc chụp thêm ảnh khô để giảm nhiễu phản sáng.",
        ],
      },
    ],
  },
  {
    id: "demo-grape-leaf-verified",
    plant: "Nho",
    disease: "Ảnh lá đã xác thực",
    confidence: 0.93,
    severity: "Chờ CNN",
    classificationReady: false,
    image: "/illustrations/leaf-sample-grape.svg",
    createdAt: "2026-03-18T06:45:00.000Z",
    note: "YOLO đã xác nhận đây là ảnh lá nho hợp lệ. CNN chưa được kích hoạt trong phiên bản hiện tại của Agromind AI.",
    yoloVerified: true,
    leafConfidence: 0.93,
    leafCheckNote: "Ảnh có vùng xanh rõ và hình dạng lá đủ nổi bật để qua bước xác thực lá cục bộ.",
    inputMethod: "sample",
    origin: "mock",
    symptomSummary:
      "Đây là một ảnh đầu vào tốt cho pipeline xác thực lá. Agromind AI hiện dùng nó để minh họa quá trình kiểm tra ảnh và chuẩn bị dữ liệu trước khi có lớp phân loại bệnh.",
    causes: [
      "Lá nằm nổi bật so với nền phía sau.",
      "Độ bão hòa màu và vùng thực vật đạt ngưỡng xác thực.",
      "Ảnh giữ được hình dạng lá khá trọn vẹn.",
    ],
    recommendations: [
      {
        title: "Bước nên làm tiếp",
        items: [
          "Lưu ảnh này và bổ sung thêm ảnh cùng cây ở các ngày khác nhau.",
          "Đánh dấu ngày chụp để tiện đối chiếu khi CNN được bổ sung sau.",
          "Nếu cần hỗ trợ ngay, dùng chat Light RAG để hỏi về quy trình ghi nhận dữ liệu ruộng vườn.",
        ],
      },
      {
        title: "Mẹo chụp ảnh tốt hơn",
        items: [
          "Giữ lá đứng yên, tránh rung tay khi chụp gần.",
          "Ưu tiên nền đơn giản để hệ thống tách vùng lá dễ hơn.",
          "Chụp thêm một ảnh toàn cảnh tán cây nếu muốn có thêm context cho chuyên gia sau này.",
        ],
      },
    ],
  },
];
