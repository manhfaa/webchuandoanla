# Android acceptance checklist

## Product

- [ ] Người dùng hiểu app kiểm tra ảnh lá trong 5 giây.
- [ ] Không có câu `chính xác 100%` hoặc chẩn đoán tuyệt đối.
- [ ] Mọi CTA mở màn/route thật.
- [ ] Không có dữ liệu demo trong release khi API có dữ liệu thật.
- [ ] Tiếng Việt có dấu đúng, không lỗi encoding hoặc xuống dòng một ký tự.

## Auth và security

- [ ] Register/login/Google/refresh/logout hoạt động với Django.
- [ ] Concurrent 401 chỉ refresh một lần.
- [ ] Token được mã hóa bằng khóa Android Keystore.
- [ ] Logout/xóa account xóa token, Room/cache và WorkManager jobs.
- [ ] APK scan không có server/provider/payment secret.
- [ ] Release cấm HTTP cleartext.
- [ ] Log/crash report không chứa token, password, image base64, email hoặc bank details đầy đủ.

## Diagnosis

- [ ] CameraX và Photo Picker đều hoạt động.
- [ ] Ảnh được normalize orientation, validate và compress ngoài main thread.
- [ ] YOLO từ chối thì CNN không chạy/không hiện kết quả giả.
- [ ] Top 5 hiển thị đúng confidence server.
- [ ] Bỏ qua triệu chứng thì không gọi research.
- [ ] Nhập triệu chứng chạy đủ hai search + ba bước tổng hợp/final bằng server.
- [ ] Research lỗi giữ ảnh, top 5 và symptom để retry.
- [ ] Save/retry diagnosis idempotent, không trừ quota hai lần.
- [ ] Result có kết luận, việc cần làm, lý do, top khác, nguồn, safety note.

## Data và offline

- [ ] History paging 20-50 item, dùng thumbnail URL.
- [ ] Không tải base64/full image trong list.
- [ ] Offline hiển thị timestamp/cache label, không giả live.
- [ ] GET retry có backoff; POST quota/payment không retry mù.
- [ ] Cache ảnh có TTL/quota và dọn khi logout.
- [ ] WorkManager dùng unique work, network constraints và cancel đúng user.

## Farms, weather, plans, chat

- [ ] Vị trí hiện tại là tùy chọn; nhập thủ công luôn dùng được.
- [ ] Weather hiển thị source/fetched_at/timezone.
- [ ] Farm plot chỉ gửi area unit backend hỗ trợ.
- [ ] Crop preview/create, complete/reopen/delay/note/reminders hoạt động.
- [ ] Chat diagnosis chỉ dùng diagnosis user chọn.
- [ ] Chat expert không dùng/giả vờ dùng CNN.
- [ ] 402 mở giải thích quota/upgrade; 429 có thời gian chờ.

## Payment

- [ ] `direct` dùng SePay và xử lý đủ 7 trạng thái order.
- [ ] `play` không hiển thị SePay/external payment nếu chưa được phép.
- [ ] Play purchase token được backend verify, idempotent và acknowledge.
- [ ] Không unlock gói trước khi subscription summary server cập nhật.
- [ ] Một controlled payment đã được test trước khi tuyên bố tự động kích hoạt hoàn chỉnh.

## UI/accessibility

- [ ] Light/dark/system đều đủ contrast.
- [ ] Touch target tối thiểu 48dp.
- [ ] Font scale 200% không cắt chữ/nút.
- [ ] TalkBack đọc đúng label và thứ tự focus.
- [ ] Loading/empty/error/offline/permission denied đều có thiết kế.
- [ ] Motion tắt đúng khi system animator scale = 0.
- [ ] 390x844, 600x960, 840x1200 không overflow hoặc horizontal scroll ngoài chủ ý.
- [ ] Keyboard/IME không che field/CTA.

## Tests và release

- [ ] `./gradlew ktlintCheck` xanh.
- [ ] `./gradlew lint` xanh, không suppress lỗi nghiêm trọng vô lý.
- [ ] Unit, MockWebServer, Room migration, Compose UI và navigation tests xanh.
- [ ] `assembleDirectDebug`, `assemblePlayDebug`, release bundle tương ứng build được.
- [ ] Backend tests cho endpoint mobile mới xanh.
- [ ] Baseline profile/macrobenchmark có kết quả chấp nhận được.
- [ ] AAB internal test cài, đăng nhập, chẩn đoán, notification và billing được.
- [ ] README ghi cách setup không lộ secret; manual cloud steps được liệt kê.
