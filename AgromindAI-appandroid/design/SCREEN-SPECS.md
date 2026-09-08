# SCREEN SPECS

Copy trong tài liệu này là copy sản xuất (tiếng Việt, giọng cán bộ khuyến nông).

---

## Splash

Logo 96dp radius 34dp nền `forest`, icon `eco` 52dp `leaf`. Wordmark 24-28sp, dòng phụ "Người bạn đồng hành của nhà vườn". Thanh 120x3dp pulse + "Đang mở lại phiên làm việc…". Thời gian hiển thị = đúng thời gian hydrate session, không thêm delay trang trí.

## Onboarding (3 trang, chỉ lần đầu)

Ảnh 4:3 có Leaf Lens frame, label bước, title 28-36sp, body 15-17sp, dots (dot đang chọn dài 22dp), nút "Tiếp"/"Bắt đầu" 54dp, "Bỏ qua" ở góc trên phải.

1. **Chụp một chiếc lá** — "Đưa lá vào giữa khung, chụp ngoài trời râm là rõ nhất. Mình sẽ tìm vùng lá trong ảnh giúp bạn."
2. **Hiểu kết quả trong một phút** — "Mình đưa ra khả năng phù hợp nhất, mức độ tin cậy và việc nên làm theo từng mốc thời gian."
3. **Theo dõi vườn theo thời gian** — "Mỗi lần kiểm tra được lưu vào nhật ký từng lô, để bạn thấy bệnh đang đỡ hay nặng thêm."

Không xin quyền nào ở đây.

## Login

Logo 56dp, title "Chào bạn quay lại", body "Đăng nhập để xem lại vườn và các lần kiểm tra lá." Email → Mật khẩu (có nút hiện/ẩn 48dp) → "Quên mật khẩu?" → nút "Đăng nhập" 54dp → "Chưa có tài khoản? Đăng ký". App không có Google Sign-In.

Lỗi email: "Email chưa đúng định dạng. Bạn kiểm tra lại giúp mình nhé." Đang gửi: nút đổi thành "Đang đăng nhập…" + spinner, disable để chặn double submit.

Medium/Expanded: form giới hạn 480dp, canh giữa, cột trái là ảnh vườn full-bleed ở Expanded.

## Register

Họ tên, Email, Mật khẩu (3 vạch độ mạnh + "Đủ mạnh. Thêm một số hoặc dấu câu sẽ tốt hơn."), checkbox điều khoản với 2 link thật. Nút "Tạo tài khoản" chỉ bật khi đã tick.

## Quên mật khẩu

`delivery_enabled = false`: khối `softLeaf` icon `info` màu `sun`, title "Hệ thống gửi email chưa được bật", body "Vườn của bạn vẫn an toàn. Hiện mình chưa gửi được thư đặt lại, nên bạn liên hệ hỗ trợ để được đổi mật khẩu giúp." CTA "Liên hệ hỗ trợ qua Zalo" + "Quay lại đăng nhập".

`delivery_enabled = true`: field email + CTA "Gửi hướng dẫn đặt lại" + xác nhận đã gửi tới địa chỉ cụ thể.

## Rationale quyền (camera / vị trí / thông báo)

Bottom sheet 28dp, icon 52dp trong container `softLeaf`, title nói lợi ích, body nói dữ liệu dùng để làm gì, CTA "Đồng ý, mở camera" + đường thoát "Chọn ảnh từ thư viện". Hiện **trước** system dialog. Nếu người dùng đã từ chối 2 lần, đổi CTA thành "Mở cài đặt" và giữ đường thoát.

## Nhập vị trí thủ công

Dùng khi từ chối định vị. Title "Vườn của bạn ở đâu?", body "Bạn đã tắt định vị, không sao cả. Nhập tên xã hoặc huyện là mình vẫn xem được thời tiết và cảnh báo sâu bệnh." Input + list gợi ý (đã lưu / gần đây) + "Thử bật định vị lại".

## Hôm nay

Trong 5 giây người dùng thấy: số lượt kiểm tra gần đây, số kết quả cần theo dõi, thời tiết/cảnh báo ở vườn mặc định, việc nên làm tiếp theo.

Thứ tự compact:

1. Header: ngày + "Chào chú Tám" + avatar 46dp.
2. Hero `forest` radius 24dp, có Field Contour 9%: label "TÌNH TRẠNG VƯỜN HÔM NAY", insight thật ("2 lô cần để ý trong 3 ngày tới"), một câu giải thích, CTA "Kiểm tra ảnh lá" (nền `mint`, chữ `forest`) + "Xem cảnh báo".
3. Lưới 2x2: Lượt kiểm tra 30 ngày · Ảnh có vùng lá hợp lệ · Tin cậy trung bình · Cần theo dõi. Số 28-40sp; ô "Cần theo dõi" dùng `sun`.
4. "Việc nên làm" — 3 việc xếp theo ưu tiên, mỗi việc có mốc thời gian bên phải (Hôm nay / 2-3 ngày / Khi nặng hơn).
5. "Kết quả gần đây" — 3 item, thumbnail + cây + bệnh nghi + status chip + confidence + ngày, có "Xem tất cả".

Empty: minh hoạ Leaf Lens (khối bo hữu cơ 150dp + viền dashed), "Chưa có lần kiểm tra nào", một câu hướng dẫn, đúng một CTA.

Medium: hero full width, lưới chỉ số 4 cột, hai cột cho Việc nên làm + Kết quả gần đây. Expanded: hero + insight bên trái, cột phải là Việc nên làm và Kết quả gần đây.

## Kiểm tra — Bước 1 Chọn ảnh

Header có LeafVeinProgress + "Bước 1/4". Title "Chụp chiếc lá đang có dấu hiệu lạ". Ba mẹo (ánh sáng, khoảng cách, nền). Ảnh ví dụ 4:3 dán nhãn "Ảnh đạt chuẩn". CTA "Chụp ảnh" 56dp + "Chọn ảnh trong máy".

Preview: ảnh có Leaf Lens frame, hàng Xoay / Chụp lại / Xoá (3 nút 52dp), CTA "Dùng ảnh này", dòng mono "ảnh giữ nguyên trong bộ nhớ tạm nếu app bị chuyển ra nền".

## Kiểm tra — Bước 2 Xác nhận ảnh lá

Ảnh có scan line chạy đúng một lần + 2 marker xuất hiện stagger rồi dừng. Title "Đang xem ảnh có vùng lá không". StatusChain 3 dòng. Không hiện bất kỳ kết quả phân loại nào ở bước này.

Từ chối: scrim + icon trong plate, title "Mình chưa thấy rõ chiếc lá trong ảnh này", body "Không phải lỗi của bạn. Thường là do lá ở quá xa, ảnh bị rung, hoặc trong khung có nhiều thứ khác." Khối "THỬ LẠI NHƯ VẦY" 3 gạch đầu dòng. CTA "Chụp lại" + "Để sau".

## Kiểm tra — Bước 3 Thêm triệu chứng

Khối xác nhận "Ảnh lá hợp lệ · Đã tìm thấy 2 vùng lá trong ảnh". Title "Bạn thấy cây có dấu hiệu gì?", body "Kể thêm vài câu thì kết luận sẽ sát hơn. Không có gì để kể cũng không sao." Textarea ≥132dp. Hàng chip gợi ý (6 chip, chạm để thêm vào textarea, chip đã dùng đổi sang trạng thái chọn). CTA "Xem kết quả" + "Bỏ qua bước này" (viền, cùng cỡ chữ — rõ như nút chính).

Voice input: chỉ render khi thực sự đã triển khai. Chưa có thì không có icon micro.

Expanded: ảnh preview bên trái, textarea + chip bên phải.

## Kiểm tra — Loading

Vòng Leaf Lens 118dp có scan, title "Đang xem giúp bạn…", StatusChain:

1. Đang tải ảnh lên an toàn
2. Đang kiểm tra vùng lá
3. Đang phân tích dấu hiệu trên lá
4. Đang đối chiếu với nguồn tham khảo *(chỉ khi có triệu chứng)*
5. Đang chuẩn bị việc nên làm

Nút Huỷ 52dp. Không có phần trăm.

## Kết quả

1. Ảnh crop 4:3 có Leaf Lens frame + scrim, đè label "KHẢ NĂNG PHÙ HỢP NHẤT" và "Sầu riêng · Thán thư lá".
2. ConfidenceMeter: 88%, band "Cần theo dõi", track fill một lần.
3. "Việc nên làm tiếp theo" — 3 ActionTimingCard: Ngay hôm nay / Trong 2-3 ngày / Khi dấu hiệu tăng.
4. "Triệu chứng bạn kể có phù hợp không" — chỉ hiện khi người dùng đã nhập; kết luận "Khá phù hợp" + 1 đoạn + chip khớp/yếu tố thuận lợi.
5. "Vì sao có gợi ý này" — 3 dòng: ảnh hợp lệ, dấu hiệu nhìn thấy trên ảnh, mô tả của bạn.
6. "Các khả năng khác" — accordion, top 2-5, mỗi dòng có tên + phân biệt ngắn + %.
7. "Nguồn tham khảo" — title, domain (mono, màu `info`), snippet, icon `open_in_new`, mở browser ngoài.
8. Safety note nền `softLeaf` icon `handshake` màu `soil`.
9. Cuối màn: "Hỏi thêm" (mở chat theo kết quả) + "Ghi vào nhật ký".

Biến thể chỉ có vùng lá: badge "Nên kiểm tra lại", title "Ảnh lá hợp lệ, chưa có kết quả phân loại", khối "BẠN CÓ THỂ" 3 gợi ý, CTA "Thử phân tích lại". Không có ConfidenceMeter số, không có accordion khả năng khác.

Expanded: ảnh + confidence cột trái sticky, các section cột phải.

## Lịch sử

Search debounce 350ms, hàng chip lọc nhanh, nút bộ lọc có dot `sun` khi đang có filter. List paging: HistoryRow + skeleton đúng hình + footer "Đang tải thêm…" + retry tại chỗ. Pull-to-refresh. Empty theo filter: "Không có kết quả nào khớp bộ lọc" + "Xoá lọc".

Expanded: list-detail. Detail tải ảnh đầy đủ khi mở, có CTA "Mở kết quả đầy đủ".

## Vườn

Grid card lô: ảnh 16:9 + badge giai đoạn, tên lô, "cây · diện tích", "lần chăm sóc gần nhất". Nút "Thêm lô". Entry truy xuất nguồn gốc ở cuối.

## Form lô vườn

Tên lô, Cây trồng, Diện tích + đơn vị (`m2` · `ha` · `sào` · `công`), Vị trí, Giai đoạn (chip). Medium/Expanded: 2 cột. CTA "Lưu lô vườn" 56dp.

## Nhật ký lô

Header: tên lô + "giai đoạn · diện tích · địa điểm". Hàng nút thêm nhanh: Tưới / Bón / Quan sát / Chi phí / Ảnh. Timeline theo ngày giảm dần.

## Truy xuất nguồn gốc

QR 172dp trong card, đường link mono, tên lô. Danh sách công tắc quyền riêng tư: Cây trồng và giai đoạn (bật), Nhật ký chăm sóc (bật), Chi phí vật tư (tắt), Vị trí chính xác (tắt — chỉ hiện xã/huyện). CTA "Mở trang công khai" → browser/deep link.

## Thời tiết

Header `forest`: 29° / cảm giác 33° / "Mưa rào rải rác" + icon 60dp; 3 ô độ ẩm, mưa 24h, gió; dòng mono "cập nhật 09:12 · GMT+7 · nguồn Open-Meteo". Nút refresh 48dp. Danh sách 7 ngày (hôm nay ở đầu). Entry "2 cảnh báo sâu bệnh".

## Cảnh báo sâu bệnh

Banner dữ liệu cũ khi cần: "Số liệu này lấy lúc 21:40 hôm qua nên có thể đã cũ." + "Làm mới ngay". AlertCard theo severity, mỗi card gắn với một lô.

## Kế hoạch trồng

Wizard 4 bước: cây → vị trí/lô → ngày bắt đầu → số cây/diện tích. Bước 4 là **preview** trước khi tạo, kèm khối quota "Gói Grow của bạn còn 3 lượt tạo kế hoạch trong tháng này." CTA "Tạo kế hoạch" + "Quay lại sửa".

Tiến độ: tab Hôm nay / Quá hạn / Sắp tới. Mỗi bước có label mốc, ngày, tên, mô tả, và nút Đánh dấu xong / Hoãn 3 ngày / Ghi chú / Mở lại. Khối cảnh báo `danger` nhạt: "Tạo lại kế hoạch sẽ xoá tiến độ bạn đã đánh dấu xong. Mình sẽ hỏi lại trước khi làm."

## Chat

Màn chọn: hai card lớn — "Hỏi về kết quả đã lưu" (mình trả lời dựa trên ảnh và kết luận của lần đó) và "Tư vấn nông nghiệp" (hỏi chung, không dùng ảnh hay lịch sử kiểm tra). Dòng mono nhắc: không hứa nối máy với chuyên gia thật.

Trong hội thoại: context chip (chỉ workspace 1), bubble, tin nhắn AI chia khối TÓM TẮT / VIỆC NÊN LÀM / LƯU Ý AN TOÀN / NGUỒN. Composer sticky 52dp + nút gửi 52dp. States: đang gửi (3 chấm), gửi thất bại (bubble mờ + "Chưa gửi được" + "Gửi lại"), 402 hết lượt, mất mạng.

## Thư viện vật tư

Chip loại + grid card: ảnh 16:10, tên, mô tả ngắn, tag. Vật tư cần thận trọng dùng tag `danger` "Cần thận trọng" và luôn kèm câu "Chỉ dùng theo hướng dẫn của cán bộ kỹ thuật địa phương."

## Gói dịch vụ

Card gói hiện tại `forest`: tên gói, hết hạn, 2 ô quota (kiểm tra ảnh còn lại, kế hoạch còn lại). Segmented "Qua Google Play" / "Chuyển khoản" (biến thể build). 4 gói Seed / Grow / Bloom / Elite, giá và quyền lợi từ máy chủ; gói đang dùng có viền `leaf` + badge.

## SePay chuyển khoản

Banner countdown "Đơn giữ trong 29:11" + nhãn "Chờ thanh toán". QR 176dp. Hàng thông tin: Ngân hàng, Số tài khoản, Chủ tài khoản, Số tiền, Nội dung — mỗi hàng có nút copy. Nhắc "Ghi đúng nội dung chuyển khoản… Chuyển đúng số tiền, đừng làm tròn." CTA "Tôi đã chuyển, kiểm tra giúp tôi".

## Trạng thái đơn

7 state, mỗi state một câu người dùng đọc được:

| State | Title | CTA |
|---|---|---|
| pending | Đang chờ nhận tiền | — |
| underpaid | Còn thiếu 49.000 đ | Xem lại thông tin chuyển |
| paid | Đã nhận đủ, gói đã mở | — |
| overpaid | Bạn chuyển dư 51.000 đ | Yêu cầu đối soát |
| expired | Đơn đã hết hạn | Tạo đơn mới |
| cancelled | Đơn đã huỷ | — |
| review | Đang đối soát thủ công | Xem tình trạng yêu cầu |

## Hồ sơ & cài đặt

Card hồ sơ (avatar, tên, email, trang trại · địa điểm, nút Sửa). Nhóm HIỂN THỊ: Giao diện (Sáng / Tối / Theo hệ thống), Ngôn ngữ, Nhắc việc trên máy, Email thông báo, Tự lưu nháp triệu chứng, Giảm chuyển động. Nhóm BẢO MẬT: Đổi mật khẩu, Xoá tài khoản (`danger`). Ghi chú: tài khoản Google không có ô mật khẩu hiện tại.

## Xoá tài khoản

Lưới 4 ô số dữ liệu sẽ mất (18 lần kiểm tra · 4 lô vườn · 62 dòng nhật ký · 2 kế hoạch). Field phrase `XOA TAI KHOAN` (mono), field mật khẩu hiện tại. Nút xoá chỉ bật khi phrase đúng. "Giữ lại tài khoản" bên dưới.

## Màn bảo trì (server config)

Full-screen StateBlock: icon `build`, "Hệ thống đang bảo trì", câu nói rõ khung giờ nếu server trả về, nút "Thử lại". Không có bottom navigation.
