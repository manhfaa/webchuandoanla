# Agromind AI Android - Bộ prompt triển khai

Thư mục này là đặc tả nguồn để Claude Design và Claude Code chuyển sản phẩm web Agromind AI thành ứng dụng Android native. Không đưa secret thật, mật khẩu, token, chuỗi kết nối database hoặc khóa ký ứng dụng vào bất kỳ file nào trong thư mục này.

## Thứ tự sử dụng

1. Đưa toàn bộ repository cho Claude Design đọc, sau đó gửi nguyên nội dung `01-CLAUDE-DESIGN-PROMPT.md`.
2. Yêu cầu Claude Design lưu bàn giao vào `AgromindAI-appandroid/design/` theo đúng danh sách đầu ra trong prompt.
3. Sau khi duyệt thiết kế, đưa toàn bộ repository cho Claude Code đọc, sau đó gửi nguyên nội dung `02-CLAUDE-CODE-PROMPT.md`.
4. Claude Code phải đọc thêm `CLAUDE.md`, `03-API-CONTRACT.md` và `04-CLOUD-SECURITY-DEPLOYMENT.md` trước khi viết code.
5. Chạy checklist trong `05-ACCEPTANCE-CHECKLIST.md` trước khi phát hành.

## Phạm vi thư mục

- Toàn bộ mã Android native được tạo trực tiếp trong `AgromindAI-appandroid/` với module ứng dụng tại `app/`.
- Không tạo một backend thứ hai trong thư mục Android.
- Nếu mobile cần endpoint mới, sửa backend Django hiện có ở `../backend/`, giữ tương thích với website.
- Không sửa model AI hoặc dữ liệu production chỉ để làm cho ứng dụng mobile chạy.

## Môi trường chính

- Website: `https://www.agromind.farm`
- Backend Android phải gọi: `https://api.agromind.farm`
- Android không được gọi trực tiếp Supabase, Hugging Face, DeepSeek, Tavily hoặc webhook SePay.
- Package đề xuất: `vn.agromind.app`
- Ngôn ngữ mặc định: tiếng Việt; tiếng Anh là tùy chọn.

## Quy tắc thanh toán quan trọng

- Bản phát hành qua Google Play phải dùng Google Play Billing cho gói tính năng số, trừ khi tài khoản đã được chấp thuận một chương trình thanh toán thay thế phù hợp.
- Bản APK phân phối trực tiếp có thể dùng luồng SePay hiện tại.
- Tách bằng product flavor `play` và `direct`; tuyệt đối không để CTA SePay xuất hiện trong bản `play` nếu chưa đủ điều kiện chính sách.

---

# Dự án Android (đã khởi tạo)

Mã nguồn nằm tại `app/`. Kết quả audit trước khi code: [AUDIT.md](AUDIT.md).

## Cấu hình lần đầu

1. `cp local.properties.example local.properties`, điền `sdk.dir`.
2. Repo không commit `gradle-wrapper.jar`. Sinh wrapper một lần:

```bash
gradle wrapper --gradle-version 8.11.1
```

Hoặc mở thư mục này bằng Android Studio stable — Studio tự sinh wrapper rồi sync.

3. Build:

```bash
./gradlew assembleDirectDebug
```

## Build variants

| Variant | Dùng khi | Thanh toán |
|---|---|---|
| `directDebug` · `directStaging` · `directRelease` | APK phát hành ngoài Play | SePay (`SEPAY_ENABLED=true`) |
| `playDebug` · `playStaging` · `playRelease` | Google Play | Play Billing; không render bất kỳ entry point SePay nào |

Base URL theo build type: `debug` → `AGROMIND_DEBUG_BASE_URL` (mặc định `http://10.0.2.2:8000/`, chỉ debug được phép cleartext), `staging` → `AGROMIND_STAGING_BASE_URL`, `release` → `https://api.agromind.farm/`.

## Không có secret nào trong app

`BuildConfig` chỉ chứa base URL, website URL, version metadata và hai cờ flavor. Token phiên được mã hoá AES-256/GCM bằng khoá sinh trong Android Keystore (không export được) rồi mới ghi vào DataStore — không có JWT plain text trên máy.

## Endpoint backend mà app cần

Đã bổ sung trong milestone này: `POST /api/diagnoses/cnn-multipart/`, `POST /api/diagnoses/research-symptoms/`, `POST /api/engagement/chat/respond/`, `GET /api/mobile/config/`.

Trên VPS phải đặt thêm `DEEPSEEK_API_KEY` và `TAVILY_API_KEY`. Thiếu key thì endpoint trả 503 và `/api/mobile/config/` báo tính năng tắt — app ẩn tính năng thay vì hiện rồi lỗi.

## Kiến trúc

Một application module, chia package theo `core/*` và `feature/*`:

```
core/common       AgroResult, AgroError
core/designsystem token màu/chữ/hình/chuyển động + primitives + LeafLens/LeafVein/StatusChain
                  + AgromindScaffold (bottom nav / rail) + HistoryRow
core/network      Retrofit/OkHttp, interceptor, authenticator, DTO, ErrorMapper
core/security     SecureTokenStore (Keystore), SessionManager
core/config       AppConfigRepository (/api/mobile/config/)
core/database     Room: nháp lần kiểm tra đang dở
core/model        Prediction, LeafDetection, Classification, SymptomResearch, LoadingStage
core/navigation   Route, DeepLink, NavHost, AppShell
core/settings     LocalPreferences (dữ liệu không nhạy cảm)
feature/auth      splash, đăng nhập, đăng ký, quên mật khẩu, phiên
feature/diagnosis luồng kiểm tra 4 bước, CameraX, tiền xử lý ảnh, màn kết quả
feature/history   Paging 3 trên limit/offset, chỉ tải thumbnail_url
feature/home      Hôm nay: hạn mức gói + kết quả gần đây
feature/chat      chọn workspace + hội thoại (assistant / expert)
feature/profile   hồ sơ, giao diện, giảm chuyển động, đăng xuất
feature/billing   bảng giá, gating theo flavor
feature/more      menu điều hướng
```

### Đã xong / còn lại

| Milestone | Trạng thái |
|---|---|
| 1 Nền tảng: Gradle, theme, network, phiên bảo mật | xong |
| 2 Auth + hồ sơ | xong (email/password, đổi mật khẩu, xoá tài khoản; không dùng Google Sign-In) |
| 3 Chẩn đoán end-to-end | xong |
| 4 Endpoint research/chat trên Django + màn triệu chứng/kết quả/chat | xong |
| 5 Lịch sử paging | xong (chưa có cache offline Room, chưa có bộ lọc) |
| 6 Vườn / thời tiết / thư viện | xong (chưa có truy xuất nguồn gốc QR) |
| 7 Kế hoạch trồng | xong (chưa có WorkManager + notification cục bộ) |
| 8 Thanh toán direct + play | xong (backend Play verify/RTDN + màn SePay + Play Billing) |
| 9 Accessibility / hiệu năng / bảo mật / release | **chưa** (CI, baseline profile, screenshot test) |

## Tách flavor cho thanh toán

Ép ở mức **biên dịch**, không phải bằng `if` lúc chạy:

```
app/src/direct/…/billing/PurchaseFlow.kt   -> SepayCheckoutScreen
app/src/play/…/billing/PurchaseFlow.kt     -> PlayBillingScreen
app/src/main/…/navigation/AgromindNavHost  -> gọi PurchaseFlow(...)
```

Không có `PurchaseFlow` nào trong `main`. Bản Play biên dịch **không có** file SePay, nên không route nào, deep link nào hay lần merge nhầm nào có thể làm màn chuyển khoản xuất hiện trong artifact nộp lên Google Play.

Backend: `POST /api/payments/google-play/verify/` lấy purchase token, hỏi Google Play Developer API, và cấp quyền theo **sản phẩm Google trả về** — không theo thứ client khai. `POST /api/payments/google-play/rtdn/` nhận Pub/Sub push, xác thực bằng `GOOGLE_PLAY_RTDN_TOKEN`, và vẫn hỏi lại Google trước khi cấp lại quyền.

## Luồng kiểm tra lá (milestone 3)

Máy trạng thái ở `feature/diagnosis/domain/DiagnosisFlow.kt` giữ ba luật mà UI không được phép phá:

- **YOLO từ chối → dừng.** `LeafRejected` không có đường sang `Classifying`; app cũng không render tên bệnh dù payload có.
- **Bỏ qua triệu chứng → không gọi research.** Đây là lựa chọn hợp lệ, không phải đường suy giảm, và không được âm thầm tiêu hai lượt Tavily.
- **Lỗi không làm mất dữ liệu người dùng.** Ảnh, mô tả và phần việc server đã làm xong được giữ trong nháp Room; `retry()` tiếp tục từ bước hỏng.

`client_request_id` sinh một lần cho mỗi ảnh và dùng lại cho mọi lần thử lại của ảnh đó — đây là thứ khiến một lần mất mạng tốn đúng một lượt inference thay vì một lượt mỗi lần bấm.

Ảnh: đọc EXIF và xoay vào pixel, hạ cạnh dài về 1800px, JPEG 85, xoá metadata (kể cả GPS), lưu trong cache riêng của app — không vào thư viện máy.

## Chạy test

```bash
./gradlew :app:testDirectDebugUnitTest
```

## Bẫy đã gặp, ghi lại để khỏi mất thời gian lần sau

- **Comment Kotlin lồng nhau.** `/api/auth/*` viết trong KDoc sẽ mở một block comment mới và làm cả file không đóng comment. Đừng viết glob đường dẫn có dấu sao trong `/** */`.
- **Converter kotlinx-serialization** của JakeWharton nằm ở package `com.jakewharton.retrofit2.converter.kotlinx.serialization`, không phải `retrofit2.converter.kotlinx.serialization`.
- **Icon Material** là extension property: phải `import androidx.compose.material.icons.outlined.CloudOff`, không dùng được tên đầy đủ `androidx.compose.material.icons.Icons.Outlined.CloudOff`.

Destination chưa xây dựng render `StateBlock` nói rõ "đang được xây dựng" kèm mã route — không có dữ liệu giả. Release gate: không destination nào như vậy còn tồn tại trong bản phát hành.
