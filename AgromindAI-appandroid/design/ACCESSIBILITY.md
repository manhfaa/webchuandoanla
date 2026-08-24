# ACCESSIBILITY

## Contrast (đã kiểm)

| Cặp màu | Light | Dark |
|---|---|---|
| inkPrimary trên canvas | 13.9:1 | 14.6:1 |
| inkPrimary trên surface | 14.6:1 | 12.1:1 |
| inkSecondary trên canvas | 5.1:1 | 6.9:1 |
| inkSecondary trên surface | 5.4:1 | 5.8:1 |
| leafStrong trên surface | 5.6:1 | — |
| leaf trên surface (dark) | — | 7.4:1 |
| onleaf trên leaf (nút chính) | 4.7:1 | 9.2:1 |
| mint trên forest | 9.8:1 | — |
| sun trên surface | 4.6:1 (chỉ dùng cho label ≥13sp weight 700) | 8.1:1 |
| danger trên surface | 4.9:1 | 7.0:1 |

Quy tắc: vàng `#D89A28` không được dùng cho body text trên nền trắng. Chỉ dùng cho label 13sp+ weight 700, icon, và fill.

Không truyền tải thông tin chỉ bằng màu: mọi band độ tin cậy và mọi severity cảnh báo đều có nhãn chữ.

## TalkBack — nhãn và thứ tự đọc

### Hôm nay

| # | Element | Nhãn đọc | Ghi chú |
|---|---|---|---|
| 1 | Header chào | "Chào chú Tám, thứ Sáu 31 tháng 7" | text, không focus bằng chạm đôi |
| 2 | Avatar | "Hồ sơ của bạn, nút" | 48x48dp |
| 3 | Hero | "Tình trạng vườn hôm nay: 2 lô cần để ý trong 3 ngày tới. Lô sầu riêng B có dấu hiệu thán thư ở mức cần theo dõi." | `mergeDescendants = true` |
| 4 | CTA chính | "Kiểm tra ảnh lá, nút" | hành động chính |
| 5 | 4 ô chỉ số | mỗi ô một cụm: "Lượt kiểm tra 30 ngày: 18 lượt" | không đọc rời số và nhãn |
| 6 | Việc nên làm, item | "Hôm nay: ngưng tưới lên lá lô B, nút" | mốc thời gian đọc trước |
| 7 | Kết quả gần đây, item | "Sầu riêng, nghi thán thư lá, độ tin cậy 88 phần trăm, cần theo dõi, ngày 31 tháng 7, nút" | gộp cả trạng thái |
| 8 | Bottom navigation | "Hôm nay, tab 1 trên 5, đang chọn" | đọc sau cùng |

### Luồng kiểm tra

- LeafVeinProgress: một node duy nhất nhận focus, đọc "Bước 2 trên 4: Xác nhận lá". Các node khác `clearAndSetSemantics {}`.
- Ảnh đang quét: "Đang kiểm tra vùng lá trong ảnh" — cập nhật bằng `liveRegion = Polite`, không spam mỗi frame.
- StatusChain: chỉ dòng đang chạy là live region. Khi xong đọc "Đã kiểm tra vùng lá".
- Marker vùng lá: gộp thành một nhãn "Đã tìm thấy 2 vùng lá trong ảnh", không đọc từng marker.
- Chip triệu chứng: "Lá vàng từ chóp vào, thêm vào mô tả, nút"; khi đã thêm: "…, đã thêm".
- Nút "Bỏ qua bước này" đọc nguyên văn, không rút thành "Bỏ qua".

### Kết quả

- ConfidenceMeter: một cụm — "Độ tin cậy 88 phần trăm, mức cần theo dõi". Không đọc track riêng.
- ActionTimingCard: "Ngay hôm nay: cắt bỏ lá bệnh, gom lại đem ra khỏi vườn."
- Accordion khả năng khác: "Các khả năng khác, 4 khả năng còn lại, đang đóng, nút". Mở ra thì `announceForAccessibility("Đã mở, 4 khả năng")`.
- Nguồn: "Mở trang khuyennongvn.gov.vn: phòng trừ bệnh thán thư trên cây sầu riêng, liên kết, mở bằng trình duyệt".
- Safety note nằm trong thứ tự đọc trước hai nút cuối màn, không bị bỏ qua.

### Thanh toán

- Countdown: `liveRegion = Polite`, chỉ đọc lại ở mốc 5 phút, 1 phút, 30 giây — không đọc từng giây.
- Mỗi hàng thông tin: "Nội dung chuyển khoản: A G M 8 F 2 K 9 1" — đọc rời từng ký tự cho mã, và nút copy có nhãn riêng "Sao chép nội dung chuyển khoản".

## Focus order và bàn phím

- Thứ tự focus = thứ tự đọc trên; không có bẫy focus.
- Bottom sheet: focus vào title khi mở, trả focus về nút đã mở sheet khi đóng, `Esc`/back đóng sheet.
- Dialog xoá: focus mặc định vào nút an toàn ("Giữ lại"), không phải nút xoá.
- IME mở: composer và field đang focus không bị che; content scroll bằng `imePadding`.

## Font scale 200%

- Không `height` cố định trên bất kỳ khối có text — dùng `heightIn(min = …)`.
- Nút chính, chip, row: chiều cao tăng theo nội dung; label 2 dòng vẫn nằm trong nút.
- LeafVeinProgress: label node đầu canh trái, node cuối canh phải; ở scale ≥150% label rút còn 1 từ ("Ảnh", "Lá", "Dấu hiệu", "Kết quả") thay vì bị cắt.
- Lưới 2x2 chỉ số chuyển thành 1 cột ở scale ≥175% trong compact.
- Bảng thông tin chuyển khoản chuyển từ hàng ngang sang xếp dọc (nhãn trên, giá trị dưới) ở scale ≥150%.
- Không `maxLines` trên tên cây, tên bệnh, tên việc.

## Reduced motion

Tôn trọng `Settings.Global.ANIMATOR_DURATION_SCALE`. Khi = 0:

- Scan line không chạy; hiện luôn trạng thái cuối (marker đã hiện, viền Leaf Lens tĩnh).
- ConfidenceMeter hiện fill ở giá trị cuối ngay lập tức.
- LeafVeinProgress đổi node tức thì.
- Chuyển màn: fade 0ms (cắt cảnh), không translate.
- Bottom sheet xuất hiện không spring.
- Chấm "đang gửi" trong chat đổi thành text "Đang gửi…".

## Ngôn ngữ và chữ Việt

- `lang="vi"`, TalkBack đọc bằng giọng Việt.
- Be Vietnam Pro có đủ dấu; không dùng font fallback cho tiếng Việt.
- Không `textAllCaps` trên chuỗi có dấu dài; uppercase chỉ ở label ngắn đã kiểm dấu (TÓM TẮT, VIỆC NÊN LÀM, LƯU Ý AN TOÀN, NGUỒN, mốc thời gian).
- Không ngắt dòng giữa "sầu" và "riêng" — dùng `text-wrap: pretty` tương đương (`LineBreak.Heading`/`Paragraph` phù hợp) và no-break space ở đơn vị ("88 %" → "88%").

## Landscape

Mọi màn scroll được ở landscape. Hero Hôm nay giảm padding dọc; luồng kiểm tra đổi thành 2 cột (ảnh trái, nội dung phải) thay vì nén dọc. Bottom sheet cao tối đa 92% và scroll trong.
