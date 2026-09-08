# HANDOFF CHECKLIST

## Redlines — dp/sp cố định

### Chrome

| Element | Giá trị |
|---|---|
| Status bar | 36dp (hệ thống), content edge-to-edge phía dưới |
| Offline banner | cao 40dp, margin ngang = gutter, radius 12dp, gap 8dp giữa icon và text |
| Bottom navigation | cao 56dp + 20dp gesture area; icon container 56x32dp radius 11dp; icon 22dp (đích Kiểm tra 25dp); label 11sp/600 |
| Navigation rail | rộng 88dp (medium) / 96dp (expanded); item 64dp rộng, icon container 44x32dp; đích Kiểm tra 56x56dp radius 18dp, margin dưới 8dp |
| Gutter | 20 / 28 / 32dp theo breakpoint |

### Điều khiển

| Element | Giá trị |
|---|---|
| Nút chính | min-height 54-56dp, radius 12dp, padding ngang 20-26dp, label 15-17sp/700 |
| Nút phụ (viền) | min-height 54dp, viền 1dp `divider`, radius 12dp |
| Icon button | 48x48dp, icon 22-24dp |
| Input / dropdown | min-height 54dp, radius 12dp, padding 12x14dp, label trên cách 7dp |
| Textarea triệu chứng | min-height 132dp, padding 14dp |
| Chip | min-height 44dp, padding ngang 14dp, radius 11dp, gap 8dp |
| Segmented | container radius 12-13dp padding 4dp; item min-height 46dp radius 9-10dp |
| Toggle | track 46x28dp radius 16dp, thumb 22dp, offset 3dp |
| Checkbox | 24dp, radius 7dp, viền 2dp |

### Card & ảnh

| Element | Giá trị |
|---|---|
| Card nhỏ / list row | radius 16dp, padding 14-15dp, viền 1dp |
| Card lớn / hero | radius 20-24dp, padding 18-20dp |
| Bottom sheet | radius trên 28dp, handle 38x4dp, padding 10dp trên / 24-26dp dưới |
| Thumbnail lịch sử | 64x64dp radius 12dp |
| Thumbnail Hôm nay | 62x62dp radius 12dp |
| Avatar | 46dp radius 16dp (header), 62dp radius 20dp (hồ sơ) |
| Ảnh lá | 4:3 ở luồng kiểm tra và kết quả; 1:1 ở thumbnail; 16:9 ở card lô; 16:10 ở card vật tư |
| Leaf Lens frame inset | 11-14dp, viền 2dp, radius 20/40/20/40dp |
| QR | 172-176dp trong plate radius 18dp |
| Node timeline | 14dp, viền 3dp màu canvas, trục 2dp |
| LeafVein node | 28dp, gân 2dp, gap 3dp |

## Asset list

| Asset | Định dạng | Ghi chú |
|---|---|---|
| Be Vietnam Pro | 400 / 500 / 600 / 700 / 800, TTF variable nếu có | đóng gói trong app, không tải runtime |
| Material Symbols Rounded | variable font, weight 400, FILL 0 và FILL 1 | **một họ icon duy nhất**; không trộn Phosphor hay bộ khác |
| App icon | adaptive icon: foreground `eco` mark + background `forest`, 108dp safe zone | + monochrome layer cho themed icon |
| Ảnh onboarding ×3 | WebP, 1600x1200, ≤180KB mỗi ảnh | ảnh lá cận cảnh / màn kết quả / vườn nhìn xa |
| Ảnh ví dụ "Ảnh đạt chuẩn" | WebP 1200x900 | dùng ở bước 1 |
| Minh hoạ empty Leaf Lens | vẽ bằng shape + icon trong Compose, không phải bitmap | 150dp |
| Field Contour | vẽ bằng `repeating-radial` tương đương trong Compose (`Brush`), không dùng ảnh PNG | opacity 2-5% |
| Icon thời tiết | Material Symbols Rounded: `sunny`, `partly_cloudy_day`, `cloud`, `rainy`, `thunderstorm` | không dùng bộ icon thời tiết riêng |

Icon dùng trong app (một danh sách, để tree-shake): eco, center_focus_strong, wb_sunny, history, grass, apps, photo_camera, photo_library, rotate_right, replay, delete, check, check_circle, radio_button_unchecked, error, warning, info, visibility, visibility_off, water_drop, compost, content_cut, payments, add_a_photo, event, event_note, today, trending_up, trending_down, timer, timer_off, schedule, hourglass_top, cancel, gavel, qr_code_2, content_copy, location_on, my_location, search, search_off, tune, refresh, share, bookmark_add, forum, quiz, send, chevron_right, arrow_back, arrow_forward, close, expand_more, more_vert, open_in_new, public, lock, lock_reset, block, sync_problem, cloud_off, psychology_alt, workspace_premium, inventory_2, calendar_month, manage_accounts, language, notifications, mail, save, motion_photos_off, accessibility_new, text_fields, handshake, support_agent, pest_control, image_not_supported, image_search, blur_on, record_voice_over, task_alt, priority_high, confirmation_number, draft, layers_clear, crop_free, rainy, sunny, cloud, partly_cloudy_day, thunderstorm, signal_cellular_alt, wifi, wifi_off, battery_5_bar, build, delete_forever, add, animation.

## Screenshot acceptance

Chụp ở **390x844**, **600x960**, **840x1200**, mỗi kích thước ×2 theme (light/dark) và ×2 font scale (100%, 200%) cho các màn có dấu ✱.

| # | Màn | ✱ font 200% |
|---|---|---|
| 1 | Splash | |
| 2 | Onboarding trang 1 | ✱ |
| 3 | Login (rỗng) | |
| 4 | Login (lỗi email + đang gửi) | ✱ |
| 5 | Register (chưa tick / đã tick) | |
| 6 | Quên mật khẩu — delivery_enabled false | |
| 7 | Rationale camera | ✱ |
| 8 | Nhập vị trí thủ công | |
| 9 | Hôm nay (có dữ liệu) | ✱ |
| 10 | Hôm nay (empty) | |
| 11 | Hôm nay (offline + cache) | |
| 12 | Bước 1 Chọn ảnh | |
| 13 | Bước 1 Preview | |
| 14 | Bước 2 đang quét | ✱ |
| 15 | Bước 2 từ chối ảnh | |
| 16 | Bước 3 Triệu chứng (rỗng / đã nhập chip) | ✱ |
| 17 | Loading 5 trạng thái | |
| 18 | Kết quả đầy đủ | ✱ |
| 19 | Kết quả — accordion mở | |
| 20 | Kết quả — chỉ có vùng lá | |
| 21 | Lịch sử (list + skeleton + footer loading) | ✱ |
| 22 | Lịch sử — bộ lọc sheet | |
| 23 | Lịch sử — list-detail (chỉ 840) | |
| 24 | Vườn | |
| 25 | Form lô vườn | ✱ |
| 26 | Nhật ký lô | |
| 27 | Truy xuất nguồn gốc | |
| 28 | Thời tiết | ✱ |
| 29 | Cảnh báo sâu bệnh (dữ liệu cũ) | |
| 30 | Kế hoạch — preview trước khi tạo | |
| 31 | Kế hoạch — tiến độ | ✱ |
| 32 | Chat — chọn workspace | |
| 33 | Chat — theo kết quả (có context chip, có lỗi gửi) | ✱ |
| 34 | Chat — tư vấn chung | |
| 35 | Thư viện vật tư | |
| 36 | Gói dịch vụ (play) | |
| 37 | Gói dịch vụ (direct) | ✱ |
| 38 | SePay QR + countdown | |
| 39 | Trạng thái đơn (7 state) | |
| 40 | Hồ sơ & cài đặt | ✱ |
| 41 | Xoá tài khoản | |
| 42 | Bộ trạng thái lỗi (400-503) | |
| 43 | TalkBack focus order | |
| 44 | Màn bảo trì | |

Tiêu chí đạt: không có chữ bị cắt, không có nút dưới 48dp, không có body text dưới 4.5:1, không có horizontal scroll ngoài chip/carousel, không có animation nào còn chạy sau 3 giây ở trạng thái tĩnh.

## Before coding

| Quyết định | Đã chốt ở thiết kế | Claude Code phải kiểm tra trực tiếp trong backend |
|---|---|---|
| Navigation 5 đích + 6 mục trong Thêm | ✅ Cố định, không thêm mục "Kết quả" | — |
| Palette light/dark, type scale, spacing, radius, motion token | ✅ Xem DESIGN-TOKENS.md | — |
| Ba motif Leaf Lens / Leaf Vein / Field Contour và phạm vi dùng | ✅ | — |
| Chuỗi 5 trạng thái loading và điều kiện hiện bước "đối chiếu nguồn" | ✅ Bước 4 chỉ hiện khi có triệu chứng | Xác nhận response có cờ cho biết đã chạy đối chiếu nguồn hay không |
| Copy tiếng Việt toàn bộ màn | ✅ Xem SCREEN-SPECS.md | — |
| Font 200%, TalkBack, reduced motion | ✅ Xem ACCESSIBILITY.md, MOTION-SPEC.md | — |
| Trạng thái "Ảnh lá hợp lệ, chưa có kết quả phân loại" | ✅ Có màn riêng | Response thực tế khi chỉ có YOLO: field nào là null, có mã lỗi riêng không |
| Số khả năng trả về | Thiết kế cho 2-5 | Giới hạn thật của endpoint (min/max), thứ tự đã sort hay chưa |
| Band độ tin cậy | Nhãn Tin cậy cao / Cần theo dõi / Nên kiểm tra lại | **Ngưỡng phần trăm cho từng band nằm ở backend hay client** — nếu backend, đọc đúng field |
| Đơn vị diện tích | `m2` · `ha` · `sào` · `công` | Tập enum chính xác và cách backend quy đổi khi báo cáo |
| Nguồn tham khảo | title + domain + snippet + url, mở browser ngoài | Có luôn trả snippet không; có rate limit hiển thị không |
| Quên mật khẩu | Hai biến thể theo `delivery_enabled` | Đọc cờ này từ endpoint nào; giá trị hiện tại trên production |
| Đổi mật khẩu | current password chỉ bắt buộc với tài khoản có password | Cách backend phân biệt tài khoản Google-only |
| Gói và quota | Seed / Grow / Bloom / Elite, giá lấy từ máy chủ | Tên field giá, chu kỳ, quota còn lại; đơn vị quota (lượt/tháng?) |
| Thanh toán | Hai biến thể build `play` và `direct` | Biến thể nào bật trên bản release; SePay có webhook trạng thái hay client phải poll (và chu kỳ poll) |
| 7 trạng thái đơn | pending · underpaid · paid · overpaid · expired · cancelled · review | Tên chuỗi trạng thái chính xác trong response; có state nào khác không |
| Countdown 30 phút | Hiển thị từ thời điểm tạo đơn | Backend trả `expires_at` hay chỉ trả TTL; xử lý lệch giờ máy |
| Avatar | Field URL | Backend vẫn dùng URL hay đã chuyển sang upload file |
| Kế hoạch trồng | Preview trước khi tạo vì tốn quota | Tạo kế hoạch trừ quota ở bước nào; regenerate có trừ thêm không; regenerate có reset tiến độ thật không |
| Thời tiết | Hiện "cập nhật lúc" + timezone + nguồn | Backend trả timestamp và tên nguồn hay client phải tự ghi |
| Cảnh báo sâu bệnh | 3 mức severity | Tập severity thật; cảnh báo có gắn với plot_id hay chỉ theo vị trí |
| Truy xuất nguồn gốc | Công tắc quyền riêng tư từng mục | Danh sách field có thể ẩn/hiện; URL công khai có cần token không |
| Chat | Hai workspace tách hẳn | Endpoint riêng cho từng workspace hay cùng endpoint với tham số context |
| Offline | Cache + nhãn "Dữ liệu đã lưu trên thiết bị" | Những endpoint nào an toàn để cache và TTL bao lâu |
| 503 | Giữ ảnh và mô tả đã nhập | Backend có trả `retry_after` không |
| Màn bảo trì | Theo server config | Endpoint/field cấu hình bảo trì và cách client poll |
| Deep link | `agromind://` + `https://agromind.vn/t/{code}` | Scheme và host thật đã đăng ký |
