# Prompt cho Claude Code

Bạn là Staff Android Engineer, Backend Engineer và Security Engineer. Hãy xây dựng ứng dụng Android native Agromind AI trong chính thư mục `AgromindAI-appandroid/`, đồng thời bổ sung các endpoint Django thật sự cần cho mobile trong backend hiện có `../backend/`. Không tạo backend riêng, không bọc website bằng WebView và không thay đổi logic AI chỉ để tránh tích hợp đúng.

## 1. Việc phải làm trước khi code

1. Đọc `../CLAUDE.md` và toàn bộ file trong thư mục này.
2. Đọc source thật của `../backend/`, `../src/lib/*client.ts`, `../src/app/api/chat/route.ts`, `../src/app/api/research-symptoms/route.ts`.
3. Chạy `git status`; không reset, clean hoặc ghi đè thay đổi không liên quan.
4. Ghi một audit ngắn: endpoint đã có, endpoint còn thiếu, code web nào đang giữ secret, rủi ro migration.
5. Tạo plan theo vertical slice; mỗi slice build/test được.
6. Không dùng version dependency alpha/beta chỉ vì snippet tài liệu dùng nó. Dùng bản stable mới nhất tương thích với compile SDK hiện có và quản lý bằng version catalog.

## 2. Kiến trúc Android bắt buộc

- Kotlin, Jetpack Compose, Material 3 được tùy biến theo `design/`.
- Gradle Kotlin DSL và `gradle/libs.versions.toml`.
- Single Activity, edge-to-edge.
- Package/application ID: `vn.agromind.app` trừ khi keystore/Play Console hiện có yêu cầu ID khác; nếu khác phải ghi ADR.
- `minSdk 26`; `compileSdk` stable mới nhất cài được; `targetSdk` theo yêu cầu Play hiện hành.
- UI/Data/Domain layers; UDF; screen-level ViewModel; `StateFlow`; `collectAsStateWithLifecycle`.
- Coroutines/Flow; Hilt DI.
- Retrofit + OkHttp + Kotlinx Serialization. Không trộn Gson/Moshi nếu không có lý do.
- Room cho cache/query offline; DataStore cho preference không nhạy cảm.
- Android Keystore dùng khóa không export được để mã hóa token; không lưu JWT plain text trong SharedPreferences/DataStore.
- WorkManager cho sync/nhắc việc/upload cần sống qua process restart.
- CameraX để chụp; Android Photo Picker để chọn ảnh, không xin quyền đọc toàn bộ thư viện.
- Coil cho ảnh/thumbnail với disk/memory cache và placeholder.
- Navigation bản stable tương thích; typed routes/deep links, không truyền object lớn qua route.
- Baseline Profiles + Macrobenchmark ở milestone release.

Giữ kiến trúc vừa đủ. Bắt đầu một application module với package theo feature và core; chỉ tách Gradle module khi thời gian build/ownership chứng minh cần thiết.

```text
app/src/main/java/vn/agromind/app/
  core/common
  core/designsystem
  core/network
  core/database
  core/security
  core/model
  core/navigation
  feature/auth
  feature/home
  feature/diagnosis
  feature/history
  feature/farms
  feature/weather
  feature/cropplans
  feature/chat
  feature/library
  feature/billing
  feature/profile
```

Mỗi feature có `data`, `domain` nếu thật sự có use-case dùng lại, `presentation`, tests. Không tạo interface/use-case rỗng chỉ để giống Clean Architecture.

## 3. Cấu hình build và môi trường

Tạo build types `debug`, `staging`, `release` và product flavors theo dimension `distribution`:

- `direct`: APK ngoài Play, cho phép checkout SePay.
- `play`: Google Play, dùng Play Billing; không render luồng/CTA/deep link SePay nếu chưa tham gia chương trình thanh toán thay thế hợp lệ.

Base URL:

- Production: `https://api.agromind.io.vn/`
- Staging: lấy từ `local.properties` hoặc CI secret, không commit URL nội bộ nếu nhạy cảm.
- Debug emulator: cấu hình riêng; nếu dùng `10.0.2.2`, chỉ debug Network Security Config được phép HTTP. Release luôn cấm cleartext.

Chỉ các giá trị public được phép vào `BuildConfig`: base URL, website URL, Google Web client ID công khai, build/version metadata. Không bao giờ đưa Django secret, Supabase URL, HF token, DeepSeek/Tavily key, SePay webhook secret, Google service-account JSON hoặc signing password vào APK.

Tạo `local.properties.example` chỉ chứa tên biến trống. CI lấy secret từ GitHub Actions/Play Console environment. Keystore nằm ngoài repo; ký release từ CI secret file/base64 và password secret.

## 4. Network và session

Android gọi trực tiếp `https://api.agromind.io.vn`, không gọi `/api/django` của Vercel.

OkHttp:

- Interceptor thêm `Authorization: Bearer <access>` và `X-Agromind-App-Version`, `X-Request-ID`.
- Authenticator đồng bộ refresh để nhiều request 401 chỉ tạo một refresh call.
- Refresh token rotation: nếu response có refresh mới, thay atomically cả cặp token; blacklist token cũ phía server.
- Chỉ retry một lần sau refresh; refresh thất bại thì xóa session và phát trạng thái `SessionExpired`.
- Không log Authorization, password, token, ảnh base64, response Tavily raw content, số tài khoản đầy đủ hoặc payload thanh toán.
- Normal timeout 20-30s; inference/research có read timeout tối đa 120s và UI progress/cancel rõ.
- Retry GET/idempotent lỗi mạng/5xx bằng exponential backoff + jitter; không tự retry POST tính quota hoặc tạo đơn nếu chưa có idempotency key.
- Parse lỗi DRF theo `detail`, `non_field_errors`, `error`, rồi field errors.
- Map 402 thành domain `PlanLimitError(limit, used, upgradeTo)`; không biến thành lỗi mạng generic.

Network Security Config release:

- `cleartextTrafficPermitted=false`.
- Chỉ trust system CAs.
- Không pin certificate Cloudflare nếu chưa có quy trình backup pin và rotation; pin sai sẽ làm toàn bộ app mất kết nối khi certificate đổi.
- Debug-only override cho proxy/dev CA nếu thật sự cần, không lan vào release.

## 5. Auth

Triển khai email/password, register, logout, refresh, Google, quên/đặt lại/đổi mật khẩu, profile và xóa tài khoản theo `03-API-CONTRACT.md`.

Google:

- Dùng Credential Manager + Sign in with Google.
- Lấy Google ID token rồi gửi vào Django `/api/auth/google/`; backend xác thực token. Không tin email/profile chỉ do client gửi.
- Dùng Web client ID đúng audience backend; Android OAuth client phải khai báo package + SHA-1/SHA-256 debug/release trong Google Cloud.
- Logout phải gọi Django blacklist refresh token và clear local credential/session.

Password reset:

- Deep link HTTPS/App Link từ email phải mở app vào màn confirm token.
- Nếu backend trả `delivery_enabled=false`, hiển thị dịch vụ chưa được bật; không nói email đã gửi.

## 6. Ảnh và chẩn đoán

### Capture/select

- CameraX `ImageCapture` ưu tiên chất lượng, có overlay hướng dẫn nhưng không crop giả ở client.
- Photo Picker `PickVisualMedia(ImageOnly)`; fallback hệ thống tự xử lý.
- Đọc EXIF orientation, normalize bitmap, strip metadata nhạy cảm, giữ bản tạm trong cache private.
- Kiểm tra MIME thực và magic bytes; chỉ JPEG/PNG/WebP nếu backend hỗ trợ; giới hạn kích thước.
- Downscale long edge khoảng 1600-2048px và JPEG 82-88 để cân bằng bệnh lá/chi phí mạng; đo bằng test với model trước khi chốt.
- Hiển thị preview, dung lượng trước/sau, cho xóa/chụp lại.

### API

Giai đoạn tương thích có thể gửi `image_data_url` như web, nhưng phải bổ sung endpoint multipart Django cho mobile để tránh base64 tăng ~33% và ngốn RAM:

- Đề xuất `POST /api/diagnoses/cnn-multipart/` với part `image`, optional `input_method`, `client_request_id`.
- Backend validate MIME/size, stream file, gọi HF server-side, trả cùng schema `/cnn/`.
- Giữ `/cnn/` cũ cho website; không breaking change.
- `client_request_id` unique theo user để retry không trừ quota/chạy model hai lần.

Flow state machine persisted bằng `SavedStateHandle` + Room draft:

`Draft -> Uploading -> LeafValidating -> LeafRejected | Classifying -> AwaitingSymptoms -> Researching | Finalizing -> Saved | FailedRetryable | FailedPermanent`.

Quy tắc:

- YOLO `is_leaf=false`: dừng, không gọi/hiển thị CNN.
- CNN trả top 5: lưu raw payload cần thiết nhưng UI dùng model domain rõ.
- Triệu chứng trống: bỏ qua research và giữ kết quả confidence cao nhất.
- Có triệu chứng: gọi endpoint Django mobile mới chạy đúng đủ chuỗi DeepSeek -> Tavily -> DeepSeek -> Tavily -> DeepSeek -> final. Không gọi provider từ app, không fallback sang nội dung dựng sẵn.
- Nếu research lỗi, giữ draft, top 5 và symptom để retry; không bắt chụp lại ảnh.
- Chỉ tạo diagnosis record một lần. Dùng idempotency key và server response ID.

## 7. Chuyển AI server routes về Django

Hiện `../src/app/api/chat/route.ts` và `../src/app/api/research-symptoms/route.ts` chứa secret provider trên Vercel. Native Android không được gọi provider hoặc phụ thuộc Next.js làm backend bí mật. Hãy triển khai/mirror chúng trong Django:

### Research

Đề xuất authenticated endpoint:

`POST /api/diagnoses/research-symptoms/`

Request: diagnosis ID hoặc selected/top predictions + symptoms + `client_request_id`. Ưu tiên diagnosis ID để server tự lấy dữ liệu user sở hữu và tránh client sửa confidence.

Backend phải:

1. Kiểm tra JWT, ownership, gói RAG và quota.
2. DeepSeek tạo câu hỏi tiếng Việt hiển thị và Tavily query tiếng Anh.
3. Tavily advanced search tối đa 5 nguồn.
4. DeepSeek đọc/tóm tắt độ phù hợp có citations.
5. DeepSeek tạo câu hỏi/tavily query xử lý.
6. Tavily search xử lý.
7. DeepSeek tóm tắt xử lý và safety note.
8. DeepSeek chốt kết luận cuối.
9. Lưu kết quả/source sanitized vào diagnosis; không lưu/log raw provider secret.
10. Trả response schema ở contract; retry cùng request ID trả cùng kết quả.

Không có fallback câu search hard-code. Nếu provider thiếu key/trả rỗng, trả 503/502 rõ bước thất bại.

### Chat

Đề xuất authenticated endpoint:

`POST /api/engagement/chat/respond/`

Request gồm `mode`, `query`, optional `conversation_id`, optional `diagnosis_id`. Backend tự kiểm tra ownership diagnosis.

- `assistant`: được dùng đúng diagnosis được chọn.
- `expert`: không truyền context CNN/YOLO/history vào prompt.
- Ghi user message và charge quota atomically trước provider.
- Khi provider thành công, lưu assistant message.
- Nếu provider thất bại, không tính phí hai lần khi retry cùng `client_request_id`; lưu trạng thái failure/compensation rõ.
- Không dùng câu trả lời offline dựng sẵn như câu trả lời AI thật.

Sau khi Django endpoint ổn, sửa Next.js route thành proxy mỏng dùng cùng endpoint hoặc giữ adapter tương thích. Website và Android phải cùng một nguồn nghiệp vụ.

## 8. Offline-first có giới hạn

Cache Room:

- User summary/preferences không nhạy cảm.
- Diagnosis list paged + thumbnail URL; detail đã mở gần đây.
- Farm locations/plots/logs.
- Weather payload cùng `fetched_at`, không giả là live khi offline.
- Crop plans/reminders.
- Input library.

Không lưu lâu dài raw ảnh/base64 nếu người dùng không chọn lưu; cache ảnh phải có quota, TTL và nút xóa. Encrypt dữ liệu nhạy cảm nếu cần.

WorkManager:

- Unique work cho sync lịch sử, reminder và queued upload.
- Network constraint; exponential backoff; tags để cancel theo user.
- Khi logout/xóa account, cancel work và xóa Room/cache/token.
- Không background-retry inference POST nếu server chưa hỗ trợ idempotency.
- Crop reminder có unique ID và reschedule sau reboot/timezone change qua WorkManager; exact alarm chỉ khi nghiệp vụ thật sự cần và có lý do chính sách.

## 9. Location, weather, notification

- Xin fine/coarse location chỉ khi người dùng chọn `Dùng vị trí hiện tại`; one-shot location, không background tracking.
- Nếu từ chối, nhập/chọn vị trí thủ công vẫn đầy đủ.
- Gửi lat/lon tới Django weather/farm advisory; app không gọi provider weather trực tiếp.
- Notification Android 13+ xin quyền theo ngữ cảnh sau khi user bật nhắc việc.
- Local notifications cho crop plan reminders; chuẩn bị abstraction cho FCM nhưng không thêm Firebase chỉ để có dependency.
- Deep link notification mở đúng plan/step; notification không lộ thông tin bệnh nhạy cảm trên lock screen nếu user tắt preview.

## 10. Thanh toán

### Flavor direct - SePay

- Gọi Django tạo order; render QR bằng `qr_url` server trả, không tự ghép URL ngân hàng nếu không cần.
- Hiển thị ngân hàng, số tài khoản masked + copy, số tiền, nội dung chuyển khoản, expiration countdown theo server time.
- Poll detail 5-10s khi màn checkout foreground, giãn tần suất khi lâu; dừng khi terminal/background.
- `pending`: chờ; `underpaid`: còn thiếu; `paid`: refresh subscription rồi mới unlock; `overpaid/review`: yêu cầu đối soát; `expired/cancelled`: tạo đơn mới khi server cho phép.
- App không nhận webhook; SePay gọi Django. Không nhúng webhook secret.

### Flavor play - Google Play Billing

- Vì Grow/Bloom/Elite mở tính năng số trong app, bản phân phối Google Play phải dùng Play Billing trừ khi đã được duyệt chương trình thay thế.
- Tạo product/base plan mapping server-side, không lấy giá SePay để hiển thị thay cho `ProductDetails` trong purchase UI Play.
- App launch billing flow, gửi purchase token + product ID + package name tới endpoint Django mới.
- Django dùng Google Play Developer API/service account server-side để verify; chỉ grant khi PURCHASED; idempotent theo purchase token; acknowledge từ backend; xử lý RTDN cho renew/cancel/hold/expire.
- App gọi subscription summary sau verify/resume và không tự set plan.
- Không commit service-account JSON vào repo/Android.

Nếu chưa cấu hình Play Console/backend verification, ẩn purchase CTA của flavor play và hiển thị `Thanh toán trên Google Play đang được hoàn thiện`; không lén mở SePay/web checkout.

## 11. Cloudflare và bảo vệ API

- DNS/TLS/WAF ở Cloudflare là server-side; Android chỉ biết hostname HTTPS.
- Không áp Managed Challenge toàn bộ `/api/*`: JSON client không giải challenge browser và sẽ lỗi 403 HTML.
- Dùng rate limit theo route/auth/IP, Bot/WAF rule có ngoại lệ hợp lý cho mobile API, Django throttling và JWT.
- Nếu bắt buộc Turnstile cho register/login nhạy cảm, native phải mở trang challenge tối thiểu trong WebView theo tài liệu Cloudflare, lấy token một lần, gửi token về Django; Django gọi Siteverify bằng secret. Secret không ở app.
- Tốt hơn cho API authenticated: rate limit, replay/idempotency, Google Play Integrity ở bước rủi ro cao sau khi backend sẵn sàng; không coi device attestation là thay thế auth.
- Content-Type bất ngờ (HTML Cloudflare thay vì JSON) phải map thành `SecurityGatewayError`, không crash serializer.

## 12. UI implementation

Thực thi đúng file handoff trong `design/`:

- Semantic Compose tokens light/dark/system.
- Reusable primitives: `AgroScaffold`, `PageHeader`, `AgroSurface`, `PrimaryButton`, `SecondaryButton`, `StatusBadge`, `ConfidenceMeter`, `DiagnosisStatus`, `SourceList`, `ActionCard`, `LoadingState`, `EmptyState`, `InlineError`, `OfflineBanner`.
- Preview cho light/dark, compact/expanded, font scale lớn.
- Không hard-code màu trực tiếp trong feature screen.
- Loading/empty/error không chỉ là spinner/toast.
- TalkBack description cho ảnh, icon action, progress; decorative icon không đọc.
- Focus order đúng; keyboard/IME actions; không chỉ dựa vào màu để truyền trạng thái.

## 13. Testing

Backend:

- Pytest/Django tests cho auth ownership, quota 402, idempotency, provider timeout/error, research đủ thứ tự, chat mode isolation, multipart validation, payment verification và webhook/RTDN.
- Không gọi provider thật trong unit test; dùng fake responses có schema thực.

Android:

- Unit test repository, token rotation concurrency, ViewModel StateFlow, plan/error mapping, image preprocess.
- MockWebServer contract tests cho 200/204/400 fields/401 refresh/402/429/502/503/non-JSON Cloudflare.
- Room migration tests.
- Compose UI tests cho auth, diagnosis reject/success/skip symptom/research retry, history paging, payment states, font scale, dark mode.
- Navigation/deep link tests.
- Screenshot tests tại 390x844 light/dark và tablet.
- WorkManager tests cho unique/retry/cancel logout.
- Macrobenchmark startup, scroll history và mở result.

## 14. CI/CD

GitHub Actions pull request:

- `./gradlew ktlintCheck lint testDebugUnitTest assembleDirectDebug assemblePlayDebug`.
- Backend tests cho endpoint thay đổi.
- Secret scan; fail nếu có key/keystore/service-account/.env.

Release:

- `directRelease`: signed APK/AAB nội bộ; SePay enabled.
- `playRelease`: signed AAB; Play Billing enabled, SePay UI absent.
- Generate mapping/native symbols, artifact checksum, SBOM/dependency report nếu pipeline hỗ trợ.
- Play internal testing trước closed/open/production.
- Staged rollout, crash/ANR monitoring, rollback plan.

## 15. Milestone bắt buộc

1. Foundation: Gradle, themes, navigation, network, secure session, CI.
2. Auth + profile.
3. Diagnosis end-to-end không symptoms.
4. Django research/chat mobile endpoints + Android symptoms/result/chat.
5. History paging/offline cache.
6. Farms/weather/library.
7. Crop plans/reminders/notifications.
8. Billing direct + play separation.
9. Accessibility/performance/security/release.

Mỗi milestone phải có demo path thật và tests; không chờ đến cuối mới nối API.

## 16. Definition of done

- Android project mở/build được bằng Android Studio stable.
- Không còn screen release dùng mock account data.
- Core diagnosis hoạt động qua Django production/staging.
- Không secret provider trong APK/source/log.
- YOLO rejection dừng CNN; symptom skip dừng research; symptom entered chạy đủ research.
- History dùng paging + thumbnail.
- Session refresh rotation an toàn khi concurrent 401.
- Dark/light/font scale/TalkBack đạt checklist.
- `play` không chứa SePay purchase flow; `direct` không giả Play Billing.
- Backend tests và Android tests xanh.
- Cập nhật README cách cấu hình local/staging/release mà không ghi secret.
- Xuất báo cáo cuối: file thay đổi, endpoint thêm, migration, test output, rủi ro còn lại, bước cấu hình thủ công ở Google Cloud/Play/Cloudflare/CI.
