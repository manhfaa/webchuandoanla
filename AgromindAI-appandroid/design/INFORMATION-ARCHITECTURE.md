# INFORMATION ARCHITECTURE

## Bottom navigation (compact <600dp)

5 đích, thứ tự cố định:

1. **Hôm nay** — `wb_sunny`
2. **Lịch sử** — `history`
3. **Kiểm tra** — nút tròn 60dp ở **chính giữa** thanh nav, dùng app icon Agromind, nhô lên 22dp khỏi thanh, viền 3dp màu surface, badge dấu cộng 22dp ở góc dưới phải. Nổi hơn 4 đích còn lại nhưng vẫn nằm trong thanh nav nên không che nội dung.
4. **Vườn** — `grass`
5. **Thêm** — `apps`

Không có mục "Kết quả" riêng: kết quả là detail của Lịch sử.

## Sitemap

```
Splash
├─ Onboarding (3 trang, chỉ lần đầu)
├─ Login ─ Register ─ Forgot password
└─ App shell
   ├─ Hôm nay
   │  ├─ Hero tình trạng vườn
   │  ├─ 4 chỉ số
   │  ├─ Việc nên làm  → chi tiết việc
   │  └─ Kết quả gần đây → Kết quả
   ├─ Kiểm tra (4 bước, resume được)
   │  ├─ 1 Chọn ảnh → Preview
   │  ├─ 2 Xác nhận ảnh lá → (từ chối) Chụp lại
   │  ├─ 3 Thêm triệu chứng / Bỏ qua
   │  └─ 4 Kết quả
   ├─ Lịch sử
   │  ├─ Bộ lọc (bottom sheet)
   │  └─ Chi tiết → Kết quả đầy đủ
   ├─ Vườn
   │  ├─ Danh sách lô → Nhật ký lô
   │  ├─ Thêm/sửa lô
   │  └─ Truy xuất nguồn gốc (QR + quyền riêng tư)
   └─ Thêm
      ├─ Chat tư vấn → chọn workspace
      │  ├─ Hỏi về kết quả đã lưu (bắt buộc chọn 1 chẩn đoán)
      │  └─ Tư vấn nông nghiệp (độc lập)
      ├─ Thời tiết & cảnh báo → Cảnh báo sâu bệnh
      ├─ Kế hoạch trồng → Wizard (4 bước, có preview) → Tiến độ & nhắc việc
      ├─ Thư viện vật tư
      ├─ Gói dịch vụ → play sheet | SePay direct → Trạng thái đơn
      └─ Hồ sơ & cài đặt → Đổi mật khẩu | Xoá tài khoản
```

## Adaptive navigation

| Breakpoint | Điều hướng | Nội dung |
|---|---|---|
| Compact <600dp | Bottom navigation 5 đích; sheet cho bộ lọc và rationale | Một cột |
| Medium 600-839dp | Navigation rail (icon + label, đích Kiểm tra là container tô màu ở trên cùng) | Hai cột cho lưới lô vườn, gói, cảnh báo, thư viện |
| Expanded ≥840dp | Rail + list-detail | Lịch sử: list bên trái, chi tiết bên phải. Kiểm tra: preview ảnh và form triệu chứng song song. Vườn: danh sách lô + nhật ký. |

Tất cả breakpoint tôn trọng safe area, gesture nav, edge-to-edge và IME inset. Không có horizontal scroll trừ hàng chip và carousel có affordance rõ (chip cắt nửa ở mép).

## Deep link

| Link | Đích | Khi chưa đăng nhập |
|---|---|---|
| `agromind://diagnosis/{id}` | Kết quả | Giữ link, về Login, sau khi vào thì mở đúng kết quả |
| `agromind://plot/{id}` | Nhật ký lô | Như trên |
| `agromind://order/{id}` | Trạng thái đơn | Như trên |
| `https://agromind.vn/t/{code}` | Trang truy xuất công khai | Mở browser ngoài, không cần đăng nhập |
