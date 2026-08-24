# USER FLOWS

## 1. Auth và session

```mermaid
flowchart TD
  A[Mở app] --> B[Splash: hydrate session]
  B -->|có token hợp lệ| H[Hôm nay]
  B -->|chưa từng mở| O[Onboarding 3 trang]
  B -->|không có token| L[Login]
  O --> L
  L -->|email sai định dạng| L1[Lỗi ngay dưới trường]
  L1 --> L
  L -->|submit| L2[Nút khoá, hiện spinner]
  L2 -->|thành công| H
  L2 -->|sai mật khẩu| L3[Lỗi dưới trường mật khẩu]
  L3 --> L
  L --> R[Register: cần tick điều khoản]
  R --> H
  L --> F{delivery_enabled?}
  F -->|true| F1[Nhập email, gửi thư đặt lại]
  F -->|false| F2[Nói thật: chưa gửi được thư, đưa kênh hỗ trợ]
  H -->|401 và refresh thất bại| L4[Về Login, giữ deep link]
  L4 -->|đăng nhập lại| H2[Mở đúng màn đang xem trước đó]
```

## 2. Diagnosis 4 bước

```mermaid
flowchart TD
  S1[Bước 1 Chọn ảnh] -->|chạm Chụp ảnh| P{Đã có quyền camera?}
  P -->|chưa| PR[Rationale sheet: giải thích lợi ích]
  PR -->|đồng ý| PD[System dialog]
  PD -->|từ chối| PL[Dùng Photo Picker thay thế]
  PR -->|chọn thư viện| PL
  P -->|có| CAM[CameraX]
  CAM --> PV[Preview: xoay / chụp lại / xoá]
  PL --> PV
  PV -->|Dùng ảnh này| S2[Bước 2 Kiểm tra vùng lá]
  S2 -->|không thấy lá| RJ[Giải thích bình tĩnh + 3 mẹo + Chụp lại]
  RJ --> S1
  S2 -->|có vùng lá| S3[Bước 3 Thêm triệu chứng]
  S3 -->|Bỏ qua bước này| LD1[Chuỗi 4 trạng thái]
  S3 -->|Xem kết quả| LD2[Chuỗi 5 trạng thái, có đối chiếu nguồn]
  LD1 --> RS{Có kết quả phân loại?}
  LD2 --> RS
  RS -->|có| R1[Kết quả đầy đủ]
  RS -->|chỉ có vùng lá| R2[Ảnh lá hợp lệ, chưa có kết quả phân loại]
  RS -->|503| R3[AI tạm chưa sẵn sàng: giữ ảnh và mô tả, cho thử lại]
  R1 --> SV[Lưu vào lịch sử và nhật ký lô]
```

Mỗi bước ghi lại vào draft cục bộ, nên app bị đóng giữa luồng thì mở lại đúng bước đó với ảnh và mô tả còn nguyên.

## 3. Payment

```mermaid
flowchart TD
  PL[Gói dịch vụ: giá và quyền lợi từ máy chủ] --> V{Biến thể build}
  V -->|play| G1[Google Play purchase sheet]
  G1 -->|purchase acknowledged| G2[Chờ máy chủ xác nhận]
  G2 -->|active| OK[Mở quyền gói mới]
  V -->|direct| D1[Tạo đơn SePay]
  D1 --> D2[QR + ngân hàng + số tiền + nội dung CK + countdown 30:00]
  D2 --> W{Trạng thái từ máy chủ}
  W -->|pending| D2
  W -->|underpaid| U[Hiện số còn thiếu, giữ nguyên nội dung CK]
  U --> W
  W -->|paid| OK
  W -->|overpaid| OV[Mở gói + CTA yêu cầu đối soát]
  W -->|expired| EX[Đơn đóng, cho tạo đơn mới hoặc gửi đối soát]
  W -->|cancelled| CA[Không trừ tiền, cho tạo đơn mới]
  W -->|review| RV[Đang đối soát thủ công, cho xem tình trạng]
```

Không có màn chúc mừng nào trước khi máy chủ trả `paid`/`active`. Biến thể `play` không có bất kỳ liên kết nào dẫn sang SePay bên trong app.

## 4. Offline và retry

```mermaid
flowchart TD
  N[Mất mạng] --> B[Offline banner gọn dưới status bar]
  B --> C{Có cache?}
  C -->|có| C1[Hiện dữ liệu cache + nhãn Dữ liệu đã lưu trên thiết bị]
  C -->|không| C2[Empty state offline + nút Thử lại]
  C1 --> A{Người dùng chạm hành động cần mạng?}
  A -->|Kiểm tra ảnh| Q[Xếp ảnh vào hàng chờ, nói rõ sẽ gửi khi có mạng]
  A -->|Ghi nhật ký| Q2[Lưu cục bộ, đánh dấu chờ đồng bộ]
  N -->|có mạng lại| S[Tự đồng bộ, banner đổi thành Đã đồng bộ rồi tự ẩn]
  Q --> S
  Q2 --> S
  S -->|xung đột 409| K[Hiện bản trên máy chủ và bản của bạn, để người dùng chọn]
```
