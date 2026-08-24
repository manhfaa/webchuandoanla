# DESIGN-READ

Reading this as: a Vietnamese grower-first Android product for field diagnosis and garden follow-up, with a calm premium agricultural intelligence language, leaning toward Material 3 foundations customized into Agromind Field Lens.

## Ba mức đã chốt

| Dial | Mức | Nghĩa trong sản phẩm này |
|---|---|---|
| DESIGN_VARIANCE | 7/10 | Có bản sắc riêng (Leaf Lens, Leaf Vein Progress, Field Contour, nền canvas ngà, xanh rừng đậm). Không phải app Material mẫu, nhưng mọi cấu trúc điều hướng và cử chỉ vẫn là Android quen tay. |
| MOTION_INTENSITY | 6/10 | Chỉ ba nhóm chuyển động có nghĩa: quét ảnh một lần, marker vùng lá xuất hiện rồi dừng, confidence fill một lần. Không có gì chạy vô hạn. |
| VISUAL_DENSITY | 5/10 | Đủ số để quyết định (4 chỉ số, confidence, ngày, trạng thái) nhưng mỗi màn chỉ có một hành động chính, đọc được bằng một tay. |

## Người dùng

Người trồng cây Việt Nam, phần lớn không quen thuật ngữ AI. Đọc app khi đang đứng trong vườn: nắng chói, một tay, mạng yếu, tay và màn hình có thể bẩn.

Hệ quả thiết kế:

- Chữ body không dưới 15sp, số độ tin cậy 28-40sp và luôn đủ đậm.
- Mọi mục tiêu chạm tối thiểu 48x48dp; nút chính cao từ 52dp.
- Tương phản body text đạt WCAG AA 4.5:1 ở cả hai theme.
- Câu ngắn, giọng như cán bộ khuyến nông nói chuyện: gọi người dùng là "bạn", nói việc cần làm trước, không quy lỗi.
- Không có chữ `backend`, `API`, `pipeline`, `inference`, `RAG` trong nội dung người dùng. Tên YOLO/CNN/DeepSeek/Tavily chỉ nằm trong khu vực giải thích công nghệ hoặc chi tiết minh bạch.

## Nguyên tắc

1. **Nói đúng trạng thái đang có.** Ảnh hợp lệ không phải là đã chẩn đoán. Nếu chỉ có vùng lá mà chưa có phân loại, UI viết đúng: "Ảnh lá hợp lệ, chưa có kết quả phân loại".
2. **Việc nên làm đứng trước lời giải thích.** Người trồng cây cần biết làm gì hôm nay, không cần biết mô hình nào chạy.
3. **Đây là công cụ tham khảo.** Khi bệnh lan nhanh hoặc người dùng định dùng thuốc, UI nhắc hỏi cán bộ khuyến nông hoặc kỹ thuật viên địa phương.
4. **Không mất dữ liệu người dùng đã nhập.** 503, mất mạng, app bị đưa ra nền — ảnh và mô tả triệu chứng vẫn còn.
5. **Xin quyền đúng lúc.** Camera, vị trí, thông báo chỉ xin khi người dùng chạm đúng tính năng, và luôn có màn giải thích lợi ích trước system dialog.
6. **Một accent trang trí duy nhất.** Ngoài màu trạng thái (vàng theo dõi, đỏ cam cần xử lý, xanh dương thông tin) không thêm accent nào.

## Anti-pattern (không làm)

- AI tím, neon, gradient hào nhoáng, card kính khắp nơi, lưới dashboard SaaS chung chung.
- Stock art không liên quan; minh hoạ cây cối vẽ tay bằng SVG.
- Phần trăm loading giả; spinner vô danh thay cho chuỗi trạng thái thật.
- Lá bay vô hạn, parallax liên tục, shimmer vô hạn.
- Hai mục trùng nghĩa trong navigation (ví dụ vừa "Kết quả" vừa "Lịch sử").
- Chúc mừng nâng gói trước khi máy chủ xác nhận đã thanh toán.
- Nói "đã gửi email đặt lại mật khẩu" khi hệ thống gửi mail chưa được bật.
- Vàng nhạt trên nền trắng; dark mode làm bằng cách đảo màu.
