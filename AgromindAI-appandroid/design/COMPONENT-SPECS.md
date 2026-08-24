# COMPONENT SPECS

Mỗi component dưới đây là một Composable. Ghi rõ tham số, state và hành vi ở mọi state.

## AgromindScaffold

```kotlin
AgromindScaffold(
  windowSizeClass: WindowSizeClass,
  selectedTab: TopTab,
  onTabSelect: (TopTab) -> Unit,
  offlineState: OfflineState,   // Online | Offline(hasCache) | Syncing
  topBar: @Composable () -> Unit = {},
  content: @Composable (PaddingValues) -> Unit
)
```

- Compact: `NavigationBar` 5 item, đích Kiểm tra có icon container tô `leaf`.
- Medium/Expanded: `NavigationRail`, đích Kiểm tra là container 56dp trên cùng, cách 4 đích còn lại 8dp.
- Offline: banner 1 dòng ngay dưới status bar, radius 12dp, nền `softLeaf`, icon `cloud_off` màu `sun`, text "Đang offline · Dữ liệu đã lưu trên thiết bị". Khi `Syncing` đổi thành "Đang đồng bộ" rồi tự ẩn sau 1.5s.
- Edge-to-edge, consume IME inset ở content, không consume ở navigation bar.

## LeafLensFrame

```kotlin
LeafLensFrame(
  image: ImageSource,
  markers: List<LeafMarker> = emptyList(),
  scanning: Boolean = false,
  aspect: Aspect = Aspect.FourThree,   // FourThree | Square
  scrim: Boolean = false,
  modifier: Modifier = Modifier
)
```

States: `empty` (nền `softLeaf`, icon 40dp, caption), `loaded`, `scanning` (một lần quét 1900ms), `markers shown` (stagger 160ms rồi dừng hẳn), `rejected` (scrim 42% + icon `image_not_supported` trong plate 58dp), `scrim` (gradient lên trên cho chữ đè ảnh).

Chỉ dùng ở luồng chẩn đoán và màn kết quả. Không dùng làm khung ảnh trang trí ở nơi khác.

## LeafVeinProgress

```kotlin
LeafVeinProgress(
  step: Int,          // 1..4
  labels: List<String>,
  modifier: Modifier = Modifier
)
```

- 4 node 28dp bo `50% 42% 50% 42%`, nối bằng gân 2dp có hai gân phụ nhỏ nghiêng 35°.
- Node đã xong: nền `leaf`, icon `check`. Node hiện tại: nền `softLeaf`, viền `leaf`, icon bước, FILL 1. Node chưa tới: viền `divider`, icon rỗng.
- Gân fill chạy 260ms theo `ease.standard` khi step tăng; step giảm thì fill rút không animate.
- Label dưới mỗi node 11-13sp; node đầu canh trái, node cuối canh phải để không tràn ở font 200%.
- `contentDescription`: "Bước {step} trên 4: {label}".

## ConfidenceMeter

```kotlin
ConfidenceMeter(
  percent: Int?,             // null = chưa có kết quả phân loại
  band: ConfidenceBand,      // High | Watch | Recheck
  animateOnFirstVisible: Boolean = true
)
```

- Số 28-40sp weight 700, màu `inkPrimary`, không bao giờ giảm opacity.
- Nhãn: High → "Tin cậy cao" (`leaf`), Watch → "Cần theo dõi" (`sun`), Recheck → "Nên kiểm tra lại" (`info`).
- Track 9dp radius 5dp; fill chạy một lần 900ms khi vào viewport, sau đó tĩnh.
- `percent == null`: hiện "—", không có track, band bắt buộc là Recheck.

## StatusChain (loading thật)

```kotlin
StatusChain(stages: List<Stage>, current: Int)
// Stage: Uploading | LeafCheck | SignAnalysis | SourceMatch | PreparingActions
```

- Mỗi dòng: icon 22dp + text 15-17sp. Done = `check_circle` FILL 1 màu `leaf`. Current = ring 22dp quay, text weight 700. Todo = `radio_button_unchecked`, opacity 45%.
- `SourceMatch` chỉ có trong danh sách khi người dùng đã nhập triệu chứng.
- Không có phần trăm. Không đổi thứ tự. Nếu một stage lỗi, dòng đó đổi icon `error` màu `danger` và mở retry tại chỗ, các dòng sau giữ nguyên trạng thái todo.
- Nút Huỷ luôn có, cao 52dp, không phải icon nhỏ.

## ResultCard / ActionTimingCard

```kotlin
ActionTimingCard(timing: Timing, title: String, body: String)
// Timing: Today | InTwoOrThreeDays | WhenWorse
```

Header 11dp label uppercase trên nền màu theo timing (`softLeaf`, `sun`@14%, `danger`@13%), thân card nền `surface`. Không bao giờ có nút "phun thuốc ngay" — CTA mạnh nhất ở `WhenWorse` là hỏi cán bộ khuyến nông.

## HistoryRow

```kotlin
HistoryRow(item: DiagnosisSummary, onClick: () -> Unit)
```

- Thumbnail 62-64dp radius 12dp, load bằng thumbnail URL. **Không** load base64 hay ảnh đầy đủ trong danh sách.
- Nội dung: cây (body strong) · bệnh nghi (body, 2 dòng tối đa ở font 100%, không giới hạn ở font ≥150%) · status chip · confidence (section size, canh phải) · ngày.
- States: normal, pressed (ripple), skeleton (khối bo 12dp đúng hình: ô vuông 64dp + 3 dải), error-inline (dòng "Không tải được, thử lại" + nút retry 48dp).

## FilterSheet

`ModalBottomSheet` radius trên 28dp, handle 38x4dp, spring damping cao. Nhóm: Cây trồng (chip), Trạng thái (chip), Khoảng ngày (2 field 52dp). Nút "Xoá lọc" ở header (không phá layout khi font 200%), CTA dưới hiện số kết quả sẽ thấy.

## PlotForm

- Field: tên lô, cây trồng (dropdown), diện tích + đơn vị, vị trí, giai đoạn (chip).
- Đơn vị diện tích: segmented `m2` · `ha` · `sào` · `công` — đúng tập giá trị backend, mỗi ô ≥ 46dp cao và 48dp rộng.
- Validate: tên bắt buộc, diện tích > 0. Lỗi hiện dưới field, focus nhảy về field sai đầu tiên.
- Xoá/sửa dùng `AlertDialog` nêu rõ tên lô và số dòng nhật ký sẽ mất.

## JournalTimeline

Trục 2dp bên trái, node 14dp có viền 3dp màu canvas để tách khỏi trục. Loại entry: Tưới (`water_drop`, info), Bón (`compost`, leafStrong), Quan sát (`visibility`, sun), Tỉa (`content_cut`, leafStrong), Chi phí (`payments`, soil), Ảnh (`add_a_photo`). Chi phí hiện dạng "1.240.000 đ" weight 700 màu `soil`.

## WeatherHeader

Bắt buộc hiện: nhiệt độ hiện tại, cảm giác, mô tả, 3 ô phụ (độ ẩm, mưa 24h, gió), và dòng mono "cập nhật {HH:mm} · GMT+7 · nguồn {name}". Nếu dữ liệu cũ hơn 3 giờ, thêm banner `sun` nói rõ giờ lấy số và nút "Làm mới ngay". Không hiện số giả khi chưa có dữ liệu — hiện skeleton hoặc empty.

## AlertCard

Severity: `CẦN XỬ LÝ SỚM` (danger), `CẦN THEO DÕI` (sun), `BÌNH THƯỜNG` (leaf). Mỗi cảnh báo phải gắn với một lô cụ thể. Ngày mưa bình thường không được đẩy lên mức danger.

## ChatMessage

```kotlin
ChatMessage(role: Role, blocks: List<Block>, state: SendState)
// Block: Summary | Actions | SafetyNote | Sources
// SendState: Sending | Sent | Failed | QuotaExceeded
```

- Bubble người dùng: nền `forest`, chữ `#EAF4EC`, radius 18/18/6/18.
- Bubble AI: `surface` + viền, radius 18/18/18/6, các khối có label uppercase 12-14sp màu `leafStrong`.
- `Sending`: 3 chấm pulse. `Failed`: bubble opacity 55% + "Chưa gửi được" + nút "Gửi lại" 44dp. `QuotaExceeded` (402): thay composer bằng khối "Hết lượt chat trong gói" + CTA xem gói, giữ nguyên nội dung đã nhập.
- Workspace "Tư vấn nông nghiệp" không có context chip và không được nói là dùng ảnh hay lịch sử người dùng.

## ContextChip

Chỉ có ở workspace "Hỏi về kết quả đã lưu". Thumbnail 34dp + "cây · bệnh · ngày" + nút xoá 44dp. Xoá chip thì composer bị khoá kèm dòng "Chọn một lần kiểm tra để hỏi" + nút chọn.

## PlanCard (gói dịch vụ)

Giá, chu kỳ, quyền lợi và quota lấy từ máy chủ. Gói đang dùng có viền 2dp `leaf` + badge "Đang dùng" và CTA "Gia hạn". Biến thể `play`: CTA mở Google Play purchase sheet. Biến thể `direct`: CTA tạo đơn SePay. Trong build `play` không render bất kỳ entry point SePay nào.

## SePayOrderPanel

QR 176dp, hàng thông tin (ngân hàng, số TK, chủ TK, số tiền, nội dung CK) mỗi hàng có nút copy 44dp. Countdown 30:00 dạng mono, cùng nhãn trạng thái. Trạng thái: pending, underpaid (hiện đúng số còn thiếu), paid, overpaid (CTA đối soát), expired, cancelled, review. Không chúc mừng trước khi máy chủ trả paid/active.

## StateBlock (dùng chung cho mọi lỗi và empty)

```kotlin
StateBlock(
  art: Art,               // LeafLens | Contour | None
  title: String,
  body: String,
  primary: Action?,
  secondary: Action? = null,
  tone: Tone = Tone.Neutral
)
```

Không bao giờ để một state chỉ có chữ mà không có hành động. Không hiện mã lỗi trong title; mã (nếu cần) nằm ở dòng mono nhỏ cuối cùng cho hỗ trợ kỹ thuật.
