# Audit trước khi code Android

Ngày audit: 2026-08-01. Nguồn: `backend/`, `src/lib/*client.ts`, `src/app/api/chat/route.ts`, `src/app/api/research-symptoms/route.ts`, `03-API-CONTRACT.md`.

## 1. Endpoint Django đã có

Khớp contract, dùng được ngay cho Android:

| Nhóm | Đường dẫn | File |
|---|---|---|
| Auth | `register/ login/ google/ refresh/ logout/ password-reset/ password-reset/confirm/` | `users/urls.py` |
| User | `me/ me/deletion-preview/ change-password/ settings/` | `users/urls_profile.py` |
| Chẩn đoán | `"" cnn/ usage/ {id}/` | `diagnoses/urls.py` |
| Engagement | `plans/ subscriptions/ conversations/ conversations/{id}/ messages/ expert-consultations/…` | `engagement/urls.py` |
| Farm ops | `farm-locations/ weather/ pest-alerts/ farm-advisory/ farm-plots/ cultivation-logs/ traceability/ traceability/public/{token}/ input-library/ nutrition-symptoms/` | `farmops/urls.py` |
| Crop plans | `crops/ locations/ plans/preview/ plans/ plans/{id}/… steps/{id}/… reminders/…` | `crop_plans/urls.py` |
| Payments | `orders/ orders/{uuid}/ orders/{uuid}/reconcile/ subscription/ webhooks/sepay/` | `payments/urls.py` |
| Hạ tầng | `api/health/`, `api/maintenance/housekeeping/` | `core/urls.py` |

Cơ chế đã đúng và Android chỉ cần dùng lại, không được viết lại:

- `payments/entitlements.py` là nơi duy nhất quyết định hạn mức/feature. Mọi cap đọc từ catalogue `ServicePlan`, không hard-code. `PlanLimitExceeded` trả 402 kèm `detail, code, plan, limit, used, upgrade_to`.
- `diagnoses/quota.py` khoá tài khoản (`select_for_update`) trước khi đếm; đơn vị quota là **một bản ghi Diagnosis đã lưu**, không phải một lần gọi model.
- `history_cutoff` chỉ cắt danh sách, không xoá dữ liệu; detail vẫn mở được bằng id và serializer gắn cờ `beyond_retention`.
- SimpleJWT bật `ROTATE_REFRESH_TOKENS` và `BLACKLIST_AFTER_ROTATION` → Android **bắt buộc** thay atomically cả cặp token sau mỗi lần refresh, nếu không request kế tiếp sẽ 401 vĩnh viễn.
- Throttle scope `cnn_inference` = `60/hour`.

## 2. Endpoint còn thiếu cho mobile

| Cần thêm | Vì sao |
|---|---|
| `POST /api/diagnoses/cnn-multipart/` | `/cnn/` đã nhận `multipart` (`request.FILES["image"]`) nhưng **không có idempotency**. Retry vì mất mạng sẽ chạy lại model và, ở đường ghi, trừ quota lần hai. |
| `POST /api/diagnoses/research-symptoms/` | Toàn bộ chuỗi DeepSeek↔Tavily hiện chỉ tồn tại trong Next.js. Django không có dòng code nào gọi DeepSeek/Tavily. |
| `POST /api/engagement/chat/respond/` | Django chỉ **lưu** tin nhắn (`engagement/views.py`), không sinh câu trả lời. Next.js là nơi gọi DeepSeek. |
| `GET /api/mobile/config/` | Không có kill-switch/min-version/feature flag nào cho client. |
| `POST /api/payments/google-play/verify/` + `rtdn/` | Chưa có bất kỳ đường xác minh Play Billing nào; hiện chỉ có SePay. |

## 3. Code web đang giữ secret provider

| File | Secret | Hệ quả |
|---|---|---|
| `src/app/api/research-symptoms/route.ts` | `DEEPSEEK_API_KEY`, `TAVILY_API_KEY` (env Vercel) | Android không thể gọi. Nếu bọc lại thì app phải phụ thuộc Vercel làm backend bí mật — trái `CLAUDE.md`. |
| `src/app/api/chat/route.ts` | `DEEPSEEK_API_KEY` | Như trên. Route này gọi ngược Django để charge quota rồi mới gọi DeepSeek — logic nghiệp vụ nằm sai tầng. |
| `backend/core/settings.py` | **chưa** có `DEEPSEEK_API_KEY`/`TAVILY_API_KEY` | Phải bổ sung env trên VPS trước khi endpoint mới chạy được. |

## 4. Rủi ro migration

1. **Fallback dựng sẵn.** `src/app/api/chat/route.ts` khi DeepSeek lỗi sẽ rơi xuống `buildChatApiResponse()` — câu trả lời soạn sẵn hiển thị y như câu trả lời AI. Bản Django **không** làm vậy: lỗi provider trả 502/503 nói rõ bước hỏng. Đây là thay đổi hành vi có chủ ý, cần nói với người dùng web.
2. **Charge trước, trả lời sau.** Route chat hiện tạo conversation + ghi message qua HTTP nội bộ (3 lượt round-trip). Chuyển vào Django thành một transaction; nếu provider lỗi sau khi đã charge, phải có đường bồi hoàn hoặc idempotency, nếu không người dùng mất lượt mà không có câu trả lời.
3. **Trường `raw_content` của Tavily.** Web đang trả nguyên `rawContent` (1800 ký tự/nguồn) về client. Android không được nhận; backend phải cắt và chỉ trả `snippet`.
4. **camelCase vs snake_case.** Response web là camelCase (`compatibilitySummary`), contract Android là snake_case. Endpoint Django mới dùng snake_case; route Next.js phải map lại khi chuyển thành proxy, nếu không dashboard vỡ.
5. **Không có cột idempotency.** `Diagnosis` chưa có trường nào lưu `client_request_id` → cần model mới hoặc cột mới + migration.
6. **`DiagnosisCnnAPIView` không lưu gì.** Quota chỉ thực sự bị trừ khi POST `/api/diagnoses/`. Android phải giữ đúng mô hình đó: một lần kiểm tra = một lần lưu, không tự đếm ở client.
7. **Có thay đổi chưa commit trong repo** (`git status` bẩn ở `backend/`, `src/`, `CLAUDE.md`). Mọi chỉnh sửa phải thêm mới, không reset/clean.
