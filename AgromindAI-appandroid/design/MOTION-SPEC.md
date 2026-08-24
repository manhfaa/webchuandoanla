# MOTION SPEC

MOTION_INTENSITY 6/10. Mọi animation dưới đây có điểm dừng rõ ràng. Không có gì lặp vô hạn ngoài hai spinner trạng thái (ring loading và 3 chấm chat), và cả hai chỉ tồn tại khi thật sự đang chờ.

## Global

| Thuộc tính | Value |
|---|---|
| Chuyển màn (forward) | 220ms, fade 0→1 + translateY 10dp→0, `ease.standard` |
| Chuyển màn (back) | 180ms, fade + translateY 0→8dp |
| Đổi state trong màn | 140ms |
| Bottom sheet vào | spring: stiffness 380, damping ratio 0.86 — overshoot ≤ 4dp |
| Bottom sheet ra | 180ms accelerate |
| Ripple | mặc định Material, màu `leaf` @ 12% |

## Leaf Lens — scan

- **Trigger:** vào bước 2 (Xác nhận ảnh lá), một lần cho mỗi ảnh.
- **Chuyển động:** dải sáng cao 74dp (gradient `leaf` 0 → 50% → 0) đi từ trên xuống dưới khung ảnh.
- **Duration:** 1900ms, `cubic-bezier(.5,0,.5,1)`.
- **Số lần:** đúng 1 lần. Nếu phản hồi máy chủ chưa về sau 1 lượt quét, dải sáng dừng và StatusChain tiếp tục làm việc báo tiến độ (không quét lại vòng nữa).
- **Cancel:** người dùng back hoặc bấm Huỷ → dải sáng biến mất trong 120ms, không có gì chạy tiếp.
- **Reduced motion:** không có dải sáng; viền Leaf Lens và marker hiện luôn ở trạng thái cuối.

## Leaf Lens — marker vùng lá

- **Trigger:** khi có toạ độ vùng lá.
- **Chuyển động:** mỗi marker scale 0.4→1.08→1 + fade in.
- **Duration:** 340ms mỗi marker, `ease.emphasized`.
- **Stagger:** 160ms. Tối đa 3 marker được animate; marker thứ 4 trở đi hiện ngay không animate.
- **Sau đó:** dừng hoàn toàn — không pulse, không nhấp nháy, không viền chạy.
- **Cancel:** rời màn → dừng, không animate ngược.
- **Reduced motion:** hiện tất cả marker ngay, opacity 1.

## Leaf Vein Progress

- **Trigger:** `step` tăng.
- **Chuyển động:** gân nối fill từ trái sang phải 0%→100%; node đích đổi từ viền `divider` sang `softLeaf`+viền `leaf` trong cùng nhịp; node vừa xong đổi sang nền `leaf` + icon `check` (crossfade 120ms).
- **Duration:** 260ms, `ease.standard`.
- **Không animate:** khi `step` giảm (back) — fill rút tức thì, tránh cảm giác đi lùi có chủ ý.
- **Gân phụ:** hai gân nhỏ nghiêng 35° là tĩnh, chỉ là hoạ tiết; không bao giờ animate.
- **Cancel:** thoát luồng → reset tức thì.
- **Reduced motion:** đổi trạng thái tức thì.

## Confidence meter

- **Trigger:** khối confidence vào viewport lần đầu trong session của màn kết quả.
- **Chuyển động:** width 0 → percent.
- **Duration:** 900ms, `cubic-bezier(.2,.8,.2,1)`, delay 140ms sau khi màn vào.
- **Số lần:** một lần. Scroll ra rồi vào lại không chạy lại.
- **Cancel:** rời màn giữa animation → không cần trạng thái trung gian, lần sau vào lại chạy lại từ đầu.
- **Reduced motion:** set width = percent ngay.

## Shutter

- **Trigger:** bấm chụp.
- **Chuyển động:** overlay trắng opacity 0→0.75→0 trong 120ms + haptic `LongPress`.
- **Sau đó:** chuyển sang Preview bằng chuyển màn tiêu chuẩn 220ms.
- **Reduced motion:** không overlay, chỉ haptic.

## Field Contour

Tĩnh hoàn toàn. Là pattern đường đồng mức opacity 2-4% (light) / 4-5% (dark) ở hero Hôm nay, thời tiết và empty state. Không parallax, không drift, không đổi theo scroll.

## Loading spinner

| Nơi | Hình | Ghi chú |
|---|---|---|
| StatusChain dòng hiện tại | ring 22dp, 1 vòng/1000ms | chỉ 1 spinner trên màn tại một thời điểm |
| Nút đang submit | ring 17dp trong nút | nút bị disable, label đổi thành "Đang…" |
| Chat đang gửi | 3 chấm 7dp pulse, stagger 200ms | reduced motion → text "Đang gửi…" |

Không dùng shimmer chạy trên skeleton. Skeleton là khối tĩnh màu `softLeaf` đúng hình nội dung — dễ đọc ngoài nắng hơn và không hao pin.

## Thứ tự khi nhiều thứ cùng xảy ra

Vào màn kết quả: chuyển màn (0-220ms) → confidence fill (140-1040ms) → không có gì khác. ActionTimingCard, accordion, nguồn đều hiện tĩnh cùng màn, không stagger dây chuyền.

## Ngân sách

Không quá **2** animation đang chạy cùng lúc trên một màn. Không animation nào chạy khi màn không ở foreground. Mọi animation dừng khi `onStop`.
