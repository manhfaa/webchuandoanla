# Prompt cho Claude Design

Bạn là Principal Product Designer chuyên mobile agriculture, đồng thời hiểu Material 3 và quy tắc thiết kế Android native. Hãy thiết kế toàn bộ ứng dụng Android Agromind AI dựa trên sản phẩm web hiện có trong repository này.

## 1. Design read bắt buộc

Trước khi thiết kế, hãy in đúng một dòng:

`Reading this as: a Vietnamese grower-first Android product for field diagnosis and garden follow-up, with a calm premium agricultural intelligence language, leaning toward Material 3 foundations customized into Agromind Field Lens.`

Thiết lập ba mức:

- `DESIGN_VARIANCE: 7/10`: có bản sắc, không phải app Material mẫu, nhưng không gây khó sử dụng ngoài đồng.
- `MOTION_INTENSITY: 6/10`: có chuyển động lá và quét ảnh có ý nghĩa, không trang trí liên tục.
- `VISUAL_DENSITY: 5/10`: đủ dữ liệu để ra quyết định, vẫn đọc nhanh bằng một tay.

## 2. Bối cảnh sản phẩm

Agromind AI là trợ lý nông nghiệp dành trước hết cho người Việt Nam. Luồng chính:

1. Người dùng chụp hoặc chọn ảnh lá.
2. Hệ thống kiểm tra ảnh có vùng lá hợp lệ và crop lá.
3. Hệ thống trả tối đa năm khả năng cây/bệnh kèm độ tin cậy.
4. Người dùng có thể nhập triệu chứng quan sát được hoặc bỏ qua.
5. Nếu có triệu chứng, hệ thống tạo câu tìm kiếm, lấy nguồn web, đối chiếu độ phù hợp, tìm phương pháp xử lý và tổng hợp kết luận.
6. Người dùng xem việc nên làm, nguồn tham khảo và lưu lịch sử.

Sản phẩm còn có tổng quan vườn, lịch sử, lô vườn, nhật ký chăm sóc, thời tiết/cảnh báo sâu bệnh theo vị trí, kế hoạch trồng cây, nhắc việc, chat theo ca chẩn đoán, chat nông nghiệp độc lập, thư viện vật tư, hồ sơ, gói dịch vụ và thanh toán.

Đây là công cụ tham khảo, không phải kết luận tuyệt đối. Khi bệnh lan nhanh hoặc định dùng thuốc, UI phải nhắc hỏi chuyên gia nông nghiệp địa phương.

## 3. Đối tượng và hoàn cảnh dùng

- Người trồng cây Việt Nam, có thể không quen thuật ngữ AI.
- Dùng ngoài vườn: ánh sáng mạnh, một tay, mạng yếu, màn hình bẩn, cần chữ rõ và mục tiêu chạm lớn.
- Thiết bị chính 360-430 dp; phải mở rộng tốt cho tablet và foldable.
- Ngôn ngữ mặc định tiếng Việt; mọi text phải hiển thị dấu tốt và không xuống dòng vô lý.
- Không đưa các từ `backend`, `API`, `pipeline`, `inference`, `RAG` vào nội dung người dùng.
- Tên YOLO/CNN/DeepSeek/Tavily chỉ được xuất hiện trong khu vực giải thích công nghệ hoặc chi tiết minh bạch, không phải CTA chính.

## 4. Visual direction: Agromind Field Lens

Tạo cảm giác kết hợp giữa sổ tay canh tác, kính quan sát lá và trung tâm sức khỏe cây trồng. Không dùng AI tím, neon, lưới dashboard SaaS chung chung, card kính khắp nơi hoặc stock art không liên quan.

### Màu semantic

Light:

- Canvas `#F7F5EE`
- Surface `#FFFEFA`
- Raised `#FFFFFF`
- Soft leaf surface `#EAF4EC`
- Primary ink `#13251A`
- Secondary ink `#5C6D62`
- Divider `#DCE8DD`
- Forest `#0B2B1D`
- Leaf `#238554`
- Leaf strong `#17683F`
- Mint `#BFE8CD`
- Sun/watch `#D89A28` (không dùng vàng nhạt trên nền trắng)
- Soil `#77563C`
- Danger `#C9513E`
- Info `#2F6FA9`

Dark:

- Canvas `#07170F`
- Surface `#0D2418`
- Raised `#123321`
- Soft `#173C29`
- Primary ink `#F2F8F3`
- Secondary ink `#B5C8BA`
- Divider `rgba(213,245,223,0.14)`
- Primary leaf `#55C982`
- Watch `#F2C45B`
- Danger `#F07A63`

Quy tắc:

- Xanh lá: hành động chính, trạng thái tốt, tab đang chọn.
- Vàng: cần theo dõi, không phải chữ trang trí.
- Đỏ cam: lỗi hoặc cần xử lý sớm.
- Mọi body text đạt WCAG AA 4.5:1.
- Không dùng hơn một accent trang trí ngoài màu trạng thái.
- Dark mode không chỉ đảo màu; dùng chênh bề mặt và viền, tránh shadow đen nặng.

### Kiểu chữ

- Dùng Be Vietnam Pro được đóng gói trong app.
- Display 28-36sp, 700-800, line-height 1.10-1.18.
- Screen title 24-28sp, 700.
- Section title 18-22sp, 650-700.
- Body 15-17sp, 400-500, line-height 1.5-1.65.
- Label 12-14sp, 600; uppercase rất hạn chế.
- Số độ tin cậy 28-40sp, 700; không để số mờ.
- Hỗ trợ font scaling 200%; không cắt chữ hoặc khóa chiều cao text.

### Hình khối

- Button/input 12dp; card nhỏ 16dp; card lớn 24dp; bottom sheet 28dp phía trên.
- Button chính cao ít nhất 52dp; mọi touch target tối thiểu 48x48dp.
- Dùng card chỉ khi cần nhóm thông tin; phần còn lại dùng khoảng trắng/divider.
- Icon dùng một họ Material Symbols Rounded hoặc Phosphor Android, không trộn nhiều họ.
- Ảnh lá crop nhất quán 4:3 hoặc 1:1 tùy bối cảnh, có scrim khi đặt chữ lên ảnh.

## 5. Ý tưởng nhận diện riêng trên mobile

Tạo ba motif có kiểm soát:

1. `Leaf Lens`: khung bo hữu cơ nhẹ quanh ảnh, có marker vùng lá; chỉ xuất hiện ở chẩn đoán và kết quả.
2. `Leaf Vein Progress`: đường gân lá mảnh kết nối bốn bước chẩn đoán; tiến độ chạy dọc theo gân, không phải spinner generic.
3. `Field Contour`: pattern đường đồng mức opacity 2-4% ở dashboard/empty state; không làm giảm contrast.

Motion:

- Chuyển màn hình 180-260ms, fade + translate 8-12dp.
- Chụp ảnh: shutter ngắn, sau đó đường quét đi qua vùng lá một lần.
- Marker vùng lá xuất hiện stagger, rồi dừng hoàn toàn.
- Confidence meter fill một lần khi result vào viewport.
- Bottom sheet dùng spring nhẹ, không bounce quá mức.
- Tôn trọng `Settings.Global.ANIMATOR_DURATION_SCALE`; nếu animation tắt, hiển thị trạng thái cuối ngay.
- Không có lá bay vô hạn, parallax liên tục, shimmer vô hạn hoặc motion làm hao pin.

## 6. Information architecture

Bottom navigation trên phone có 5 đích:

1. `Hôm nay`
2. `Kiểm tra`
3. `Lịch sử`
4. `Vườn`
5. `Thêm`

`Kiểm tra` là hành động trung tâm nổi bật nhưng không che nội dung. Tablet dùng navigation rail; màn rộng dùng rail + detail pane.

Trong `Thêm`:

- Chat tư vấn
- Thời tiết & cảnh báo
- Kế hoạch trồng
- Thư viện vật tư
- Gói dịch vụ
- Hồ sơ & cài đặt

Không tạo hai mục trùng nghĩa như Kết quả và Lịch sử.

## 7. Các luồng và màn hình bắt buộc

### A. Khởi động, onboarding, quyền

- Splash tối đa thời gian cần hydrate session; logo rõ, không animation dài.
- Onboarding tối đa ba trang, chỉ lần đầu: chụp lá, hiểu kết quả, theo dõi vườn.
- Không xin camera, vị trí hoặc notification ngay khi mở app. Xin đúng lúc người dùng chạm tính năng, giải thích lợi ích trước system dialog.
- Cho phép nhập vị trí thủ công nếu từ chối location.
- Có offline banner gọn và màn bảo trì theo server config.

### B. Login/register

- Email + password, hiện/ẩn mật khẩu, lỗi ngay dưới trường, trạng thái loading khóa double submit.
- Đăng ký có checkbox điều khoản và liên kết thật.
- Quên mật khẩu phải phản ánh `delivery_enabled`; nếu email chưa cấu hình, không nói dối rằng thư đã gửi.
- Sau 401 refresh thất bại, chuyển về login và giữ deep link để quay lại sau đăng nhập.

### C. Hôm nay

Trong 5 giây người dùng hiểu:

- Bao nhiêu lượt kiểm tra gần đây.
- Bao nhiêu kết quả cần theo dõi.
- Thời tiết/cảnh báo đáng chú ý tại vườn mặc định.
- Việc tiếp theo nên làm.

Layout phone:

- Header chào ngắn + avatar.
- Hero `Tình trạng vườn hôm nay` với insight thật.
- CTA `Kiểm tra ảnh lá`.
- 2x2 metric: tổng lượt, ảnh hợp lệ, tin cậy trung bình, cần theo dõi.
- `Việc nên làm` xếp theo ưu tiên.
- `Kết quả gần đây` có thumbnail, cây, bệnh khả nghi, confidence, ngày, trạng thái.
- Không có dữ liệu: minh họa leaf lens, một câu hướng dẫn, một CTA.

### D. Luồng kiểm tra ảnh

Thiết kế thành bốn bước có thể resume:

1. `Chọn ảnh`: CameraX hoặc Photo Picker, hướng dẫn ánh sáng/nền/khoảng cách, preview, xoay/xóa/chụp lại.
2. `Xác nhận ảnh lá`: hiển thị trạng thái đang kiểm tra; nếu từ chối, giải thích bình tĩnh và CTA chụp lại. Không hiển thị kết quả CNN khi chưa qua bước này.
3. `Thêm triệu chứng`: textarea lớn, gợi ý chip quan sát, voice input chỉ nếu thật sự triển khai, nút `Bỏ qua bước này` rõ.
4. `Xem kết quả`: kết luận chính, việc cần làm, lý do, khả năng khác, nguồn.

Loading là chuỗi trạng thái thật, không giả phần trăm:

- Đang tải ảnh an toàn.
- Đang kiểm tra vùng lá.
- Đang phân tích dấu hiệu.
- Nếu có triệu chứng: Đang đối chiếu với nguồn tham khảo.
- Đang chuẩn bị việc nên làm.

### E. Kết quả

Hierarchy:

1. `Khả năng phù hợp nhất` + cây/bệnh + confidence có nhãn `Tin cậy cao`, `Cần theo dõi` hoặc `Nên kiểm tra lại`.
2. `Việc nên làm tiếp theo` theo thời điểm: ngay hôm nay, 2-3 ngày, khi dấu hiệu tăng.
3. `Triệu chứng có phù hợp không` nếu người dùng đã nhập.
4. `Vì sao có gợi ý này`: ảnh hợp lệ, dấu hiệu hình ảnh, mô tả người dùng.
5. `Các khả năng khác`: top 2-5 trong accordion.
6. `Nguồn tham khảo`: title, domain, snippet, mở browser ngoài.
7. Safety note.

Không gọi ảnh hợp lệ là đã chẩn đoán xong. Nếu API chỉ trả YOLO và chưa có CNN, UI phải nói `Ảnh lá hợp lệ, chưa có kết quả phân loại`.

### F. Lịch sử

- Paging/infinite list dùng thumbnail, không tải base64/full image trong danh sách.
- Filter cây, trạng thái, khoảng ngày; search debounced.
- Pull-to-refresh; loading cuối danh sách; retry tại chỗ.
- Item: thumbnail, cây, bệnh, confidence, ngày, trạng thái.
- Detail tải ảnh đầy đủ khi mở.

### G. Vườn, nhật ký, truy xuất

- Danh sách lô vườn với cây, giai đoạn, vị trí, lần chăm sóc gần nhất.
- Form lô vườn: đơn vị diện tích đúng backend (`m2`, `ha`, `sào`, `công`).
- Timeline nhật ký; thêm tưới/bón/quan sát/chi phí/ảnh.
- Truy xuất nguồn gốc hiển thị QR và quyền riêng tư; public page mở bằng browser/deep link.
- Xóa/sửa dùng confirm dialog rõ đối tượng bị tác động.

### H. Thời tiết và cảnh báo

- Cho phép dùng vị trí hiện tại hoặc chọn địa điểm đã lưu/nhập thủ công.
- Hiển thị `cập nhật lúc`, timezone và nguồn dữ liệu.
- Current condition, hôm nay, 3 ngày, 7 ngày.
- Cảnh báo sâu bệnh theo severity; không biến mọi ngày mưa thành cảnh báo đỏ.
- Nếu dữ liệu cũ, nói rõ và cho refresh; không hiển thị dữ liệu giả.

### I. Kế hoạch trồng

- Wizard chọn cây, vị trí, ngày bắt đầu, số cây/diện tích.
- Preview trước khi tạo vì tạo kế hoạch có thể tốn quota.
- Timeline bước chăm sóc với complete/reopen/delay/note.
- Nhắc việc theo hôm nay/quá hạn/sắp tới; hỗ trợ local notification.
- Regenerate phải cảnh báo tiến độ có thể reset.

### J. Chat

Hai workspace tách riêng:

- `Hỏi về kết quả đã lưu`: phải chọn một chẩn đoán; context chip có thể xóa/đổi.
- `Tư vấn nông nghiệp`: độc lập, không tuyên bố dùng dữ liệu CNN/lịch sử.

Tin nhắn AI nhóm rõ `Tóm tắt`, `Việc nên làm`, `Lưu ý an toàn`, `Nguồn` khi có. Có trạng thái đang gửi, retry, quota 402 và lỗi mạng. Không giả vờ kết nối chuyên gia con người.

### K. Gói và thanh toán

- Seed, Grow, Bloom, Elite lấy giá/quyền lợi từ API, không hard-code làm nguồn sự thật.
- Hiển thị gói hiện tại, thời hạn, quota còn lại.
- Thiết kế hai biến thể:
  - `play`: dùng purchase sheet của Google Play; không dẫn SePay bên trong app.
  - `direct`: tạo đơn SePay, QR, ngân hàng, số tiền, nội dung chuyển khoản, countdown 30 phút, trạng thái pending/underpaid/paid/overpaid/expired/cancelled/review.
- Không chúc mừng/nâng gói trước khi backend trả paid/active.
- Underpaid hiển thị số còn thiếu; overpaid/review có CTA yêu cầu đối soát.

### L. Hồ sơ, bảo mật, cài đặt

- Sửa họ tên, điện thoại, trang trại, vị trí, avatar URL nếu backend vẫn dùng URL.
- Đổi mật khẩu: current password chỉ bắt buộc với tài khoản có password; tài khoản Google có hướng dẫn phù hợp.
- Theme sáng/tối/theo hệ thống, ngôn ngữ, email/push, auto-save.
- Xóa tài khoản: preview số dữ liệu sẽ mất, phrase xác nhận, password nếu cần.

## 8. Trạng thái toàn cục bắt buộc

Thiết kế rõ cho:

- Loading skeleton đúng hình nội dung.
- Empty state có hành động.
- Offline có dữ liệu cache và nhãn `Dữ liệu đã lưu trên thiết bị`.
- 400 lỗi form; 401 hết phiên; 402 giới hạn gói; 403 cấm; 404; 409 xung đột; 429 chờ; 5xx retry.
- 503 AI tạm chưa sẵn sàng không làm mất ảnh/triệu chứng đã nhập.
- Permission denied camera/location/notification.
- Upload đang chạy, app background, upload resume.
- Font scale 200%, TalkBack focus, landscape và keyboard mở.

## 9. Adaptive layout

- Compact <600dp: bottom navigation, một cột, bottom sheet.
- Medium 600-839dp: navigation rail, hai cột nơi phù hợp.
- Expanded >=840dp: rail + list-detail; diagnosis preview và form song song.
- Không chỉ kéo giãn card phone lên tablet.
- Không horizontal scroll ngoại trừ chip/carousel có affordance rõ.
- Tôn trọng safe area, gesture nav, edge-to-edge và IME inset.

## 10. Đầu ra bắt buộc

Lưu vào `AgromindAI-appandroid/design/`:

1. `DESIGN-READ.md`: audience, principles, three dials, anti-patterns.
2. `INFORMATION-ARCHITECTURE.md`: sitemap và navigation compact/expanded.
3. `USER-FLOWS.md`: Mermaid cho auth, diagnosis, payment, offline retry.
4. `DESIGN-TOKENS.md`: màu light/dark, typography, spacing, radius, elevation, motion.
5. `COMPONENT-SPECS.md`: API thiết kế của từng Compose component và tất cả state.
6. `SCREEN-SPECS.md`: từng màn hình, hierarchy, copy, compact/medium/expanded.
7. `ACCESSIBILITY.md`: TalkBack labels, focus order, contrast, font scale, reduced motion.
8. `MOTION-SPEC.md`: duration/easing/trigger/cancel/reduced mode cho Leaf Lens, Leaf Vein và transition.
9. `HANDOFF-CHECKLIST.md`: redlines dp/sp, asset list, screenshot acceptance ở 390x844, 600x960, 840x1200.

Không viết lại nghiệp vụ, không thêm số liệu giả và không bỏ màn hình vì chưa có mockup. Kết thúc bằng một bảng `Before coding` liệt kê quyết định nào đã chốt và điểm nào Claude Code phải kiểm tra trực tiếp trong backend.
