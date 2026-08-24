# Agromind AI Android API contract

Base production: `https://api.agromind.io.vn/`

Mọi endpoint private dùng `Authorization: Bearer <access_token>`. JSON dùng snake_case đúng Django. Android không đi qua proxy `/api/django` của Next.js.

## 1. Auth và user

| Method | Path | Mục đích |
|---|---|---|
| POST | `/api/auth/register/` | `{email,password,accepted_terms}` -> user + access/refresh |
| POST | `/api/auth/login/` | `{email,password}` -> access/refresh |
| POST | `/api/auth/google/` | `{credential,accepted_terms}` -> access/refresh |
| POST | `/api/auth/refresh/` | `{refresh}` -> access và có thể refresh mới |
| POST | `/api/auth/logout/` | `{refresh}` -> blacklist refresh |
| POST | `/api/auth/password-reset/` | `{email}` -> detail, `delivery_enabled` |
| POST | `/api/auth/password-reset/confirm/` | `{token,new_password}` -> access/refresh |
| GET/PATCH/DELETE | `/api/users/me/` | Tài khoản hiện tại |
| GET | `/api/users/me/deletion-preview/` | Số dữ liệu sẽ xóa + phrase xác nhận |
| POST | `/api/users/change-password/` | current_password tùy loại account + new_password |
| GET/PATCH | `/api/users/settings/` | theme, language, notifications, auto-save, timezone |

Account fields chính: `id, username, email, full_name, phone, avatar_url, company_name, farm_name, location, current_plan, plan_expires_at, terms_accepted_at, terms_version, has_usable_password`.

## 2. Chẩn đoán

| Method | Path | Mục đích |
|---|---|---|
| POST | `/api/diagnoses/cnn/` | JSON `image_data_url`; YOLO rồi CNN |
| GET | `/api/diagnoses/usage/` | quota ngày/tháng và cửa sổ lịch sử |
| GET | `/api/diagnoses/?limit=20&offset=0` | paging history |
| POST | `/api/diagnoses/` | lưu diagnosis |
| GET/PATCH/DELETE | `/api/diagnoses/{id}/` | detail/update/delete |

CNN response chính:

```json
{
  "class_name": "...",
  "plant_name": "...",
  "disease_name": "...",
  "confidence": 0.91,
  "top_predictions": [
    {"class_name":"...","plant_name":"...","disease_name":"...","confidence":0.91}
  ],
  "model_version": "...",
  "model_accuracy": 0.95,
  "image_size": 123456,
  "action_plan": {},
  "yolo_payload": {
    "is_leaf": true,
    "confidence": 0.98,
    "reason": "...",
    "bbox_xyxy": [0,0,100,100],
    "crop_box_xyxy": [0,0,100,100]
  }
}
```

History list response:

```json
{
  "count": 42,
  "limit": 20,
  "offset": 0,
  "next_offset": 20,
  "results": []
}
```

Danh sách dùng `thumbnail_url`, không tải `image_data_url` lớn. Detail có thể trả ảnh đầy đủ.

Diagnosis record fields: `id,title,image_url,image_data_url,thumbnail_url,image_path,original_file_name,input_method,status,is_leaf,yolo_confidence,yolo_payload,cnn_confidence,cnn_payload,plant_name,disease_name,severity,symptom_input,user_question,field_location,note,recommendations,action_plan,rag_summary,rag_payload,saved_by_user,model_version,beyond_retention,created_at,updated_at`.

### Endpoint cần bổ sung cho mobile

1. `POST /api/diagnoses/cnn-multipart/`
   - Multipart: `image`, `input_method`, `client_request_id`.
   - Cùng response với `/cnn/`.
   - Idempotent theo `(user, client_request_id)`.
2. `POST /api/diagnoses/research-symptoms/`
   - Request ưu tiên: `{diagnosis_id,symptoms,client_request_id}`.
   - Response:

```json
{
  "skipped": false,
  "available": true,
  "compatibility_question": "...",
  "is_symptom_consistent": true,
  "best_match": "...",
  "compatibility_summary": "... [1]",
  "confidence_note": "...",
  "compatibility_sources": [{"id":1,"title":"...","url":"https://...","snippet":"...","domain":"..."}],
  "treatment_question": "...",
  "treatment_summary": "... [1]",
  "treatment_safety_note": "...",
  "treatment_sources": [],
  "final_conclusion": "...",
  "user_next_step": "...",
  "generated_at": "ISO-8601"
}
```

Không trả `raw_content` đầy đủ cho Android. Backend sanitize URL, giới hạn source/snippet và lưu trace cần thiết server-side.

## 3. Gói, chat và engagement

| Method | Path | Mục đích |
|---|---|---|
| GET | `/api/engagement/plans/` | catalogue public |
| GET/POST | `/api/engagement/subscriptions/` | subscription records |
| GET/POST | `/api/engagement/conversations/` | conversation |
| GET/PATCH/DELETE | `/api/engagement/conversations/{id}/` | detail |
| GET/POST | `/api/engagement/messages/` | message + quota |
| GET/POST | `/api/engagement/expert-consultations/` | request tư vấn |
| GET/PATCH | `/api/engagement/expert-consultations/{id}/` | detail |

Endpoint cần bổ sung:

`POST /api/engagement/chat/respond/`

```json
{
  "mode": "assistant",
  "query": "Lá này cần theo dõi gì?",
  "conversation_id": 12,
  "diagnosis_id": 34,
  "client_request_id": "uuid"
}
```

Response:

```json
{
  "mode": "assistant",
  "answer": "...",
  "conversation_id": 12,
  "message_id": 99,
  "generated_at": "ISO-8601"
}
```

Mode `expert` phải bỏ qua `diagnosis_id` ở backend dù client gửi nhầm.

## 4. Farm operations

| Method | Path |
|---|---|
| GET/POST | `/api/farm-locations/` |
| GET/PATCH/DELETE | `/api/farm-locations/{id}/` |
| GET | `/api/weather/?...` |
| GET | `/api/pest-alerts/?...` |
| GET | `/api/farm-advisory/?location={id}&crop={crop}` |
| GET/POST | `/api/farm-plots/` |
| GET/PATCH/DELETE | `/api/farm-plots/{id}/` |
| GET/POST | `/api/cultivation-logs/` |
| GET/PATCH/DELETE | `/api/cultivation-logs/{id}/` |
| GET/POST | `/api/traceability/` |
| GET/PATCH/DELETE | `/api/traceability/{id}/` |
| GET | `/api/traceability/public/{token}/` |
| GET | `/api/input-library/?q=&category=&crop=&disease=` |
| GET | `/api/nutrition-symptoms/?q=&crop=&disease=` |

Farm location: `id,name,province,district,ward,address_text,latitude,longitude,crop_type,is_default,metadata`.

Farm plot: `id,location,name,crop_type,area_value,area_unit,address_text,planting_start_date,growth_stage,note,logs`. `area_unit` chỉ nhận `m2`, `ha`, `sào`, `công`.

Weather/farm advisory phải giữ `source,fetched_at,observed_at,timezone,current,today,forecast_3d,forecast_7d,warnings,pest_alerts,recommendations,disclaimer`. Android luôn hiển thị độ mới dữ liệu.

## 5. Crop plans

| Method | Path |
|---|---|
| GET | `/api/crop-plans/crops/` |
| GET/POST | `/api/crop-plans/locations/` |
| GET/PATCH/DELETE | `/api/crop-plans/locations/{id}/` |
| POST | `/api/crop-plans/plans/preview/` |
| GET/POST | `/api/crop-plans/plans/` |
| GET/PATCH/DELETE | `/api/crop-plans/plans/{id}/` |
| POST | `/api/crop-plans/plans/{id}/regenerate/` |
| POST | `/api/crop-plans/plans/{id}/weather-refresh/` |
| POST | `/api/crop-plans/steps/{id}/complete/` |
| POST | `/api/crop-plans/steps/{id}/reopen/` |
| POST | `/api/crop-plans/steps/{id}/delay/` |
| POST | `/api/crop-plans/steps/{id}/notes/` |
| GET | `/api/crop-plans/reminders/?filter=&plan=&page=&page_size=` |
| PATCH | `/api/crop-plans/reminders/{id}/read/` |

List kế hoạch dùng pagination DRF `count,next,previous,results`. Tạo kế hoạch có thể trả 402 theo quota; preview không được tự tính là tạo.

## 6. Payment hiện có - direct distribution

| Method | Path |
|---|---|
| GET | `/api/payments/subscription/` |
| GET/POST | `/api/payments/orders/` |
| GET | `/api/payments/orders/{uuid}/` |
| POST | `/api/payments/orders/{uuid}/reconcile/` |
| POST | `/api/payments/webhooks/sepay/` | Chỉ SePay server gọi, Android không gọi |

Order status: `pending, underpaid, paid, overpaid, expired, cancelled, review`.

Created order gồm `order`, `bank`, `qr_url`; chỉ backend xác nhận paid và kích hoạt plan.

## 7. Payment cần bổ sung - Play distribution

Đề xuất:

- `POST /api/payments/google-play/verify/`: purchase token, product ID, package name, client request ID.
- `POST /api/payments/google-play/rtdn/`: Pub/Sub push có xác thực, không public tùy tiện.
- `GET /api/payments/google-play/products/`: mapping plan -> Play product/base plan nếu cần.

Backend xác thực purchase bằng Google Play Developer API, idempotent theo token, grant entitlement khi PURCHASED, acknowledge, xử lý renew/cancel/hold/expire. Android không được tự gửi `plan=elite` rồi nhận quyền mà không có server verification.

## 8. Error contract chung

- `400`: validation; parse field errors.
- `401`: refresh một lần; thất bại -> login.
- `402`: `{detail,limit,used,upgrade_to}` hoặc schema tương đương; mở upgrade UI.
- `403`: không đủ quyền.
- `404`: record không tồn tại/không thuộc user.
- `409`: idempotency/resource conflict.
- `413`: ảnh quá lớn.
- `415`: MIME không hỗ trợ.
- `429`: throttle, tôn trọng `Retry-After`.
- `502`: provider AI/search lỗi sau gateway.
- `503`: dịch vụ tạm chưa sẵn sàng/maintenance.

Mọi endpoint POST tốn quota hoặc tiền cần hỗ trợ `Idempotency-Key` header hoặc `client_request_id` body. Response nên echo `request_id` để support/debug mà không log dữ liệu nhạy cảm.

## 9. Endpoint mobile config đề xuất

`GET /api/mobile/config/` public, cache ngắn:

```json
{
  "minimum_supported_version": 1,
  "latest_version": 1,
  "maintenance": false,
  "maintenance_message": "",
  "features": {
    "google_sign_in": true,
    "symptom_research": true,
    "expert_chat": true,
    "direct_payment": true,
    "play_billing": false
  },
  "legal": {
    "terms_url": "https://agromind.io.vn/terms",
    "privacy_url": "https://agromind.io.vn/privacy"
  }
}
```

Chỉ trả config public, không trả provider URL/key, DB info hoặc secret.
