# DESIGN TOKENS

## Color — Light

| Token | Hex | Dùng ở đâu |
|---|---|---|
| `canvas` | #F7F5EE | Nền app |
| `surface` | #FFFEFA | Card, list row, input |
| `raised` | #FFFFFF | Bottom sheet, dialog, nút phụ |
| `softLeaf` | #EAF4EC | Vùng nhấn nhẹ, chip đang chọn, icon container |
| `inkPrimary` | #13251A | Chữ chính |
| `inkSecondary` | #5C6D62 | Chữ phụ, label |
| `divider` | #DCE8DD | Viền, đường kẻ |
| `forest` | #0B2B1D | Hero, rail đậm, bubble người dùng |
| `leaf` | #238554 | Hành động chính, tab đang chọn, trạng thái tốt |
| `leafStrong` | #17683F | Chữ và icon trên nền sáng |
| `mint` | #BFE8CD | Chữ/nhấn trên nền forest |
| `sun` | #D89A28 | Cần theo dõi (không bao giờ là chữ trang trí, không dùng vàng nhạt trên nền trắng) |
| `soil` | #77563C | Chi phí, safety note |
| `danger` | #C9513E | Lỗi, cần xử lý sớm |
| `info` | #2F6FA9 | Thông tin trung tính, nguồn web |

## Color — Dark

| Token | Value |
|---|---|
| `canvas` | #07170F |
| `surface` | #0D2418 |
| `raised` | #123321 |
| `soft` | #173C29 |
| `inkPrimary` | #F2F8F3 |
| `inkSecondary` | #B5C8BA |
| `divider` | rgba(213,245,223,0.14) |
| `leaf` | #55C982 |
| `leafStrong` | #3FB870 |
| `sun` | #F2C45B |
| `danger` | #F07A63 |
| `info` | #7FB4E0 |
| `soil` | #A98263 |

Dark mode dùng chênh bề mặt (canvas → surface → raised → soft) và viền sáng mờ, không dùng shadow đen nặng. Elevation trong dark = đổi surface + viền, không phải bóng.

### Quy tắc màu

- Xanh lá: hành động chính, trạng thái tốt, tab đang chọn.
- Vàng: cần theo dõi. Luôn đi kèm nhãn chữ, không bao giờ là màu trang trí.
- Đỏ cam: lỗi hoặc cần xử lý sớm.
- Xanh dương: thông tin trung tính và nguồn web.
- Không thêm accent trang trí nào ngoài bộ trạng thái trên.
- Mọi body text ≥ 4.5:1; label và chữ phụ ≥ 4.5:1 (đã kiểm inkSecondary trên canvas và trên surface ở cả hai theme).

## Typography — Be Vietnam Pro (đóng gói trong app)

| Style | Size | Weight | Line-height | Dùng |
|---|---|---|---|---|
| Display | 28-36sp | 800 | 1.10-1.18 | Câu insight hero, tiêu đề onboarding |
| Screen title | 24-28sp | 700 | 1.20-1.28 | Tiêu đề màn |
| Section title | 18-22sp | 700 | 1.30-1.35 | Tiêu đề nhóm |
| Body | 15-17sp | 400-500 | 1.50-1.65 | Nội dung |
| Body strong | 15-17sp | 600-700 | 1.40 | Tên kết quả, tên việc |
| Label | 12-14sp | 600 | 1.25-1.45 | Nhãn, trạng thái, meta |
| Confidence | 28-40sp | 700 | 1.0 | Số độ tin cậy, số chỉ số |
| Mono (kỹ thuật) | 10-12sp | 500 | 1.5-1.6 | Nội dung chuyển khoản, mã đơn, timestamp nguồn |

Letter-spacing: -0.02em cho Display, -0.015em cho Screen title, 0 cho phần còn lại. Uppercase chỉ dùng cho label mốc thời gian và tiêu đề khối trong tin nhắn AI (TÓM TẮT / VIỆC NÊN LÀM / LƯU Ý AN TOÀN / NGUỒN).

Font scaling tới 200%: không khoá chiều cao khối text, không `maxLines` trên tên cây/bệnh, mọi nút cao theo `min-height` chứ `height`.

## Spacing (4dp grid)

```
4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 22 · 26 · 28 · 32 · 40
```

- Gutter màn: 20dp compact, 28dp medium, 32dp expanded.
- Khoảng giữa các section: 26-28dp.
- Khoảng trong card: 14-18dp.
- Khoảng giữa item trong list: 9-10dp (list có card) hoặc 0 + divider (list dày).

## Radius

| Thành phần | Radius |
|---|---|
| Button, input, chip nhỏ | 12dp |
| Chip / segmented item | 9-11dp |
| Card nhỏ, list row | 16dp |
| Card lớn, hero, ảnh | 20-24dp |
| Bottom sheet (trên) | 28dp |
| Leaf Lens frame | 20dp 40dp 20dp 40dp (bo hữu cơ, lệch nhau) |
| Node Leaf Vein | 50% 42% 50% 42% |

## Elevation

| Level | Light | Dark |
|---|---|---|
| 0 | canvas, không bóng | canvas |
| 1 card | viền divider + bóng 0 2 10 rgba(11,43,29,.07) | surface + viền sáng mờ |
| 2 sheet/dialog | 0 8 28 rgba(11,43,29,.12) | raised + viền sáng mờ |
| 3 device chrome | ngoài phạm vi app | — |

## Motion tokens

| Token | Value |
|---|---|
| `dur.screen` | 180-260ms |
| `dur.state` | 120-180ms |
| `dur.scan` | 1900ms, chạy đúng một lần |
| `dur.confidence` | 900ms |
| `ease.standard` | cubic-bezier(0.2, 0.8, 0.2, 1) |
| `ease.emphasized` | cubic-bezier(0.2, 0.9, 0.3, 1) |
| `ease.sheet` | spring, damping cao, overshoot ≤ 4dp |
| `translate.screen` | 8-12dp |
| `stagger.marker` | 160ms giữa các marker, tối đa 3 marker |

## Touch targets

Tối thiểu 48x48dp cho mọi thứ chạm được. Nút chính ≥ 52dp cao. Icon button 48dp với icon 22-24dp. Chip ≥ 44dp cao, đặt trong hàng có gap 8dp nên vùng chạm không dính nhau.
