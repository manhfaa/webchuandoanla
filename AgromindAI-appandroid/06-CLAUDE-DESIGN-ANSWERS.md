# Câu trả lời để gửi Claude Design

Dán nguyên phần dưới đây vào ô trả lời của Claude Design.

---
## Scope and source

Select: **I'll link the local codebase / GitHub repo now.**

Use these sources:

- Local repository: `C:\Users\Admin\Downloads\AGomindAI-main\AGomindAI-main`
- Android target directory: `C:\Users\Admin\Downloads\AGomindAI-main\AGomindAI-main\AgromindAI-appandroid`
- GitHub: `https://github.com/manhfaa/webchuandoanla`
- Read first: root `CLAUDE.md`, then every Markdown file in `AgromindAI-appandroid/`.
- Existing website: `https://agromind.io.vn`
- Backend base URL: `https://api.agromind.io.vn`

Do not design from screenshots alone. Inspect the real web routes, current components, API clients, types, existing images and design tokens. Preserve the actual business rules, but redesign the interaction for native Android rather than copying desktop cards onto a phone.

## What to build first

Select: **Both in parallel, screens leading.**

Build the high-fidelity Android screen system and the requested design Markdown documents together. Screens lead so visual and interaction decisions are real; the documents must be updated from those decisions, not written as abstract guidance disconnected from the prototype.

## Flows that matter

Select all listed flows:

- Hôm nay (dashboard)
- Luồng kiểm tra 4 bước + loading states
- Kết quả chẩn đoán
- Lịch sử + filter
- Vườn / lô / nhật ký
- Thời tiết & cảnh báo
- Kế hoạch trồng
- Chat (2 workspace)
- Gói & thanh toán SePay
- Hồ sơ & cài đặt
- Auth + onboarding + permissions

Priority order for fidelity:

1. Diagnosis 4-step flow and result.
2. Auth and session-expired recovery.
3. Dashboard and recent results.
4. History paging/filter/detail.
5. Farm, weather and crop plans.
6. Two chat workspaces.
7. Billing and profile/settings.

## Presentation format

Select: **Both: prototype for the diagnosis flow, boards for the rest.**

- Make the diagnosis flow a tappable phone-frame prototype with real transitions and all success/reject/retry/skip states.
- Make the remaining product a connected high-fidelity screen board with clear navigation links.
- Also make dashboard, history, garden and chat adaptive examples so Claude Code understands list-detail behavior on larger screens.

## Leaf photos

Select: **I'll drop real leaf photos into placeholders.**

However, first inspect and reuse the real leaf/plant assets already available under the repository `public/` and the plant dataset references. If a needed image is unavailable, use a clearly labeled licensed-photo placeholder with a source field. Do not hand-draw a generic leaf and do not use abstract gradients as a substitute for the actual diagnosis image.

## API contract answer

The Android app calls Django directly at `https://api.agromind.io.vn`; it does not call the Vercel `/api/django` proxy and never calls Supabase, Hugging Face, DeepSeek, Tavily or SePay webhook directly.

Authentication is JWT:

- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/google/`
- `POST /api/auth/refresh/`
- `POST /api/auth/logout/`
- `POST /api/auth/password-reset/`
- `POST /api/auth/password-reset/confirm/`
- `GET/PATCH/DELETE /api/users/me/`
- `POST /api/users/change-password/`
- `GET/PATCH /api/users/settings/`

CNN endpoint currently returns:

```json
{
  "class_name": "string",
  "plant_name": "string",
  "disease_name": "string",
  "confidence": 0.91,
  "top_predictions": [
    {
      "class_name": "string",
      "plant_name": "string",
      "disease_name": "string",
      "confidence": 0.91
    }
  ],
  "model_version": "string",
  "model_accuracy": 0.95,
  "action_plan": {},
  "yolo_payload": {
    "is_leaf": true,
    "confidence": 0.98,
    "reason": "string",
    "bbox_xyxy": [0, 0, 100, 100],
    "crop_box_xyxy": [0, 0, 100, 100]
  }
}
```

Critical diagnosis rules:

- If `yolo_payload.is_leaf=false`, stop immediately, do not display CNN results, and show a calm retake-photo state.
- A YOLO-only valid response is not a completed diagnosis. Say the image is valid and classification is still pending.
- CNN confidence is a normalized number from 0 to 1.
- Show the highest probability as the primary possibility and the remaining top five as alternatives, never as five confirmed diseases.
- Symptoms are optional. If skipped, preserve the highest CNN result and do not call web research.
- If symptoms are entered, the server must run the complete DeepSeek/Tavily verification and treatment sequence and return real clickable sources.

Diagnosis history:

- `GET /api/diagnoses/?limit=20&offset=0`
- Response: `{count, limit, offset, next_offset, results}`.
- List items use `thumbnail_url`; full image/base64 is loaded only from detail.
- `GET/PATCH/DELETE /api/diagnoses/{id}/`
- `GET /api/diagnoses/usage/` returns daily/monthly quota and history retention information.

Plan-limit errors use HTTP 402 and include fields such as `detail`, `limit`, `used`, `upgrade_to`. Design a specific upgrade/limit state rather than a generic network error.

SePay order status enum:

- `pending`
- `underpaid`
- `paid`
- `overpaid`
- `expired`
- `cancelled`
- `review`

Payment rules:

- Backend is the only authority that activates a plan.
- A pending QR or bank transfer does not unlock anything.
- Underpaid shows the remaining amount.
- Overpaid/review offers reconciliation.
- The direct APK build uses SePay.
- The Google Play build must use Google Play Billing for digital plans unless an approved alternative-billing program applies.

Plans are Seed, Grow, Bloom and Elite. Price, entitlements, quota and current subscription come from the backend catalogue; the UI must not invent them.

Other existing route groups:

- `/api/farm-locations/`, `/api/farm-plots/`, `/api/cultivation-logs/`
- `/api/weather/`, `/api/pest-alerts/`, `/api/farm-advisory/`
- `/api/traceability/`, `/api/input-library/`, `/api/nutrition-symptoms/`
- `/api/crop-plans/crops/`, `/api/crop-plans/locations/`, `/api/crop-plans/plans/`, `/api/crop-plans/reminders/`
- `/api/engagement/conversations/`, `/api/engagement/messages/`
- `/api/payments/subscription/`, `/api/payments/orders/`

Read the complete field-level contract from `AgromindAI-appandroid/03-API-CONTRACT.md`. The mobile multipart diagnosis, symptom-research, unified chat-response and Play Billing verification endpoints are explicitly marked as backend work still to implement; do not present them as already deployed.

## Vietnamese copy tone

Select: **Thân thiện như cán bộ khuyến nông nói chuyện.**

Tone constraints:

- Respectful, calm, direct and practical.
- Use `bạn`, not slang and not bureaucratic language.
- Explain what to observe and what to do next.
- Avoid internal engineering terms in customer-facing screens.
- Never say `chính xác 100%`, `đã xác nhận bệnh` from confidence alone, or imply a human expert inspected the plant.
- Always include a short safety note when disease spreads quickly or chemical treatment may be considered.

## Dark mode

Select: **Every screen I design gets a dark variant.**

Dark mode must be token-based, not color inversion. Keep readable muted text, preserve semantic green/yellow/red states and audit all form fields, charts, source links, disabled buttons and image scrims.

## Adaptive breakpoints

Select: **Show all three for every screen.**

- Compact reference: 390dp.
- Medium reference: 600dp.
- Expanded reference: 840dp.
- It is acceptable to use a representative state per breakpoint for secondary screens, but every screen spec must state its exact compact/medium/expanded composition.
- Medium/expanded must use navigation rail and list-detail where useful, not stretch the phone card width.

## Payment variant

Select: **Both play and direct, side by side.**

Design both as real, separate distribution variants:

- `direct`: SePay QR, bank details, exact transfer content, expiration, polling states and reconciliation.
- `play`: Google Play product details and native billing sheet entry; no SePay CTA or external payment link.

## Accessibility depth

Select: **Both.**

- Include real 200% font-scale screen examples and TalkBack focus-order annotations for diagnosis, result, payment and one complex list/detail screen.
- Also document complete rules in `ACCESSIBILITY.md` for all other screens.
- Minimum touch target 48dp, contrast WCAG AA, non-color status labels, correct keyboard/IME behavior and reduced-motion behavior.

## Motif animation

Select: **Yes — build them working, with a reduced-motion toggle.**

Animate Leaf Lens scan, Leaf Vein progress and Field Contour only when they communicate state. No continuously falling leaves or endless decorative motion. The prototype must provide a visible reduced-motion comparison, and it must also respect the Android system animation setting.

## Number of screens

Set the first pass to **32 screens**.

Required first-pass screen set:

1. Splash/session hydrate.
2. Onboarding.
3. Login.
4. Register/terms.
5. Forgot/reset password.
6. Dashboard/Hôm nay.
7. Diagnosis choose/capture image.
8. Diagnosis upload/leaf-validation loading.
9. Leaf rejected/retake.
10. CNN result/top five before symptoms.
11. Optional symptoms.
12. Research/finalizing loading.
13. Final diagnosis result.
14. History list/filter.
15. Diagnosis history detail.
16. Farm plot list.
17. Farm plot detail.
18. Add/edit cultivation log.
19. Traceability/QR.
20. Weather overview.
21. Pest alerts and advisory.
22. Crop plan list.
23. Crop plan creation wizard/preview.
24. Crop plan detail/timeline.
25. Reminder center.
26. Chat workspace selector.
27. Diagnosis-context chat.
28. Independent agriculture chat.
29. Input library.
30. Plans + direct/play checkout variants.
31. Profile and account security.
32. Settings, theme, language and account deletion.

States such as offline, expired session, 402 plan limit, 429 throttled, provider unavailable, empty, permission denied and large-font mode are variants of these screens and do not reduce the 32-screen scope.

---
