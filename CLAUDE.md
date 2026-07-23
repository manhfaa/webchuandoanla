# Agromind AI - Context for Claude

Last verified: 2026-07-23 (Asia/Ho_Chi_Minh)

This file is the operational handoff for Claude Code. Read it before changing the repository.

## 1. Product summary

Agromind AI is a Vietnamese agriculture assistant. The primary user is a Vietnamese grower, not a developer.

Core user journey:

1. Upload or capture a leaf image.
2. YOLO verifies that a usable leaf is present and crops the leaf region.
3. CNN returns the top five plant/disease predictions.
4. The user may enter observed symptoms or skip this step.
5. If symptoms are entered, DeepSeek generates a web-search question and Tavily query.
6. Tavily retrieves real web sources.
7. DeepSeek reads the retrieved content, evaluates symptom compatibility, generates a second treatment search, summarizes treatment, and produces the final conclusion.
8. The result, sources, action recommendations and follow-up history are saved to the user's account.

Other product areas:

- Dashboard overview and recent diagnoses.
- Diagnosis history and result details.
- Farm plots and care logs.
- Real weather and pest-risk alerts by current or manually entered location.
- Crop plans and progress tracking.
- AI diagnosis chat using a selected diagnosis as context.
- Independent agriculture advice chat that must not pretend to use CNN data.
- Agricultural input library.
- User profile, authentication and Google sign-in.
- Subscription plans and SePay bank-transfer payments.

The AI result is advisory. Never claim 100% accuracy. When disease spreads quickly or pesticide use is considered, tell the user to consult a local agriculture expert.

## 2. Repository and production

- GitHub: `https://github.com/manhfaa/webchuandoanla`
- Remote: `origin`
- Branch: `main`
- Production frontend: `https://agromindai.vercel.app`
- Production backend: `https://webchuandoanla-backend.onrender.com`
- Hugging Face API: `https://phamducmanh-agromind-cnn-api.hf.space`
- Hugging Face Space: `https://huggingface.co/spaces/phamducmanh/agromind-cnn-api`
- Supabase project ID observed during setup: `emuitcpdfudfpjsjwjar`

Production infrastructure:

- Frontend: Vercel, Next.js.
- Backend: Render free web service, root directory `backend`.
- Database: Supabase PostgreSQL through `SUPABASE_DB_URL`.
- AI inference: Hugging Face Docker Space.
- Payment notifications: SePay webhook to Render.

Render commands:

```text
Build: pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput
Start: gunicorn core.wsgi:application --bind 0.0.0.0:$PORT --workers 1 --threads 2 --timeout 60
```

Vercel commands:

```text
Install: npm ci
Build: npm run build
Dev: npm run dev
```

Latest pushed `origin/main` at the time of this handoff:

```text
a81f1ca6941b384470335a7f013e7c4e65fbcdf3 Allow SePay QR images in frontend CSP
```

Important: the working tree is dirty and contains a large redesign plus AI/backend changes that are not all committed. Do not reset, checkout, clean, or overwrite these files. Inspect `git status` and `git diff` before every edit.

## 3. Current deployment state

Verified on 2026-07-23:

- `GET https://webchuandoanla-backend.onrender.com/api/health/` returned `status=ok`, `database=ok`.
- Unauthenticated payment-order access returned `401`, as expected.
- Unsigned SePay webhook POST returned `401` with `Thiếu chữ ký webhook.`, proving webhook signature protection is enabled.
- `GET https://phamducmanh-agromind-cnn-api.hf.space/health` returned HTTP 200 with:
  - `model_ready=true`
  - `classes=89`
  - `model_version=convnext_tiny_epoch_21`
  - `model_accuracy=0.9530098212017709`
  - `yolo_enabled=true`
- Production frontend returned HTTP 200 and CSP allows SePay/VietQR images.

The payment backend is deployed. A real-money end-to-end payment has not yet been confirmed. Use the lowest paid plan for the first controlled test and do not claim payment is fully proven until the webhook activates that user's plan.

The polished checkout currently in the working tree passed ESLint and `npm run build`, but it has not been committed or deployed at this handoff.

## 4. Technology stack

Frontend:

- Next.js App Router 16.x.
- React 18.
- TypeScript.
- Tailwind CSS 3.
- Zustand persisted session and domain stores.
- `next-themes` for light/dark mode.
- Framer Motion and GSAP for purposeful motion.
- Lucide icons, which are already established in this repository.
- Sonner for toasts.
- Leaflet/React Leaflet for maps.

Backend:

- Python 3.13.
- Django 5.1.
- Django REST Framework.
- Simple JWT.
- PostgreSQL/Supabase in production.
- SQLite is allowed only in local `DEBUG=True` development.
- Production settings intentionally throw an error when `DEBUG=False` and `SUPABASE_DB_URL` is missing. Do not weaken this guard.

AI Space:

- FastAPI.
- PyTorch and torchvision.
- Ultralytics YOLO.
- ConvNeXt Tiny CNN checkpoint.

## 5. Main source layout

```text
src/app/                         Next.js routes
src/components/                  Shared and feature UI
src/components/home/             Landing-page sections
src/components/diagnosis/        Upload, process, results and recommendations
src/components/layout/           Navbar, sidebar, dashboard shell and theme
src/components/ui/               Design-system primitives
src/data/mock/                   Static product content, not account data
src/lib/                         API clients, plans, labels and helpers
src/store/                       Zustand stores
src/styles/tokens.css            Semantic light/dark design tokens
backend/core/                    Django settings and URL composition
backend/users/                   Auth, profile and Google authentication
backend/diagnoses/               Diagnosis persistence and inference bridge
backend/engagement/              Plans and engagement APIs
backend/payments/                SePay orders, webhook and subscriptions
backend/crop_plans/              Crop plans and weather-related planning
backend/farmops/                 Farms, logs, traceability and input library
hf_space/                        Docker Space application
moduleyolola/                    YOLO training/export artifacts
scripts/deploy_hf_space.py       Hugging Face deployment script
render.yaml                      Render deployment declaration
vercel.json                      Vercel build declaration
next.config.js                   CSP and security headers
```

Main frontend routes:

```text
/                                      Landing page
/login                                 Login and optional Google OAuth
/register                              Registration
/dashboard                             Dashboard overview
/dashboard/diagnosis                   Leaf-image diagnosis flow
/dashboard/results/[id]                Diagnosis result
/dashboard/history                     Saved diagnoses
/dashboard/chat                        AI/expert agriculture chat
/dashboard/farms                       Farm plots
/dashboard/weather-alerts              Weather and pest alerts
/dashboard/crop-plans                  Crop plans
/dashboard/crop-plans/new              New crop plan
/dashboard/crop-plans/[id]             Crop plan detail
/dashboard/input-library               Agricultural input library
/dashboard/pricing                     Plans
/dashboard/pricing/checkout/[plan]     SePay checkout
/dashboard/profile                     Profile
/trace/[token]                         Public traceability page
```

## 6. Frontend design contract

Visual direction: `Agromind Field Lens`.

The interface should feel like a modern field-observation notebook and crop-health command center, not a generic AI SaaS dashboard.

Design principles:

- Vietnamese-first copy for real growers.
- Deep forest, leaf green, mint, warm light canvas and restrained sunlight yellow.
- Use semantic tokens from `src/styles/tokens.css`; do not scatter raw Tailwind slate/emerald colors.
- Keep light and dark modes visually consistent and readable.
- Normal text contrast must meet WCAG AA.
- Green means primary action or healthy state.
- Yellow means follow-up is needed.
- Red-orange means urgent action or error.
- Cards use the existing radius/elevation system. Do not make every element a floating glass card.
- Motion must communicate hierarchy, progress or state change. Respect `prefers-reduced-motion`.
- Mobile width around 390px is a first-class target.
- Do not expose words such as backend, API or pipeline in user-facing UI.
- Do not change routes, form field names, SEO structure or API contracts without an explicit requirement.
- Keep all five development-team members and their real photos.

Important product naming:

- Brand: `Agromind AI`.
- Do not show `Leafiq` in the user interface.
- The persisted Zustand storage key is still `leafiq-session` for backward compatibility. Do not rename it without a storage migration.

Landing navigation currently includes:

- Quy trình
- Tính năng
- Cây trồng
- Đội ngũ dự án
- Bảng giá

Dashboard navigation groups:

- Theo dõi: Tổng quan, Kiểm tra ảnh, Lịch sử.
- Quản lý vườn: Lô vườn, Thời tiết & cảnh báo, Kế hoạch trồng.
- Hỗ trợ: Chat tư vấn, Thư viện vật tư.
- Tài khoản: Gói dịch vụ, Hồ sơ.

## 7. Team content that must remain

1. Phạm Tuấn Minh
   - Role: Media & giám sát triển khai.
   - Responsibilities: media, fact checking, post-deployment monitoring.
2. Phạm Đức Mạnh
   - Role: AI nhận diện bệnh lá.
   - Responsibilities: CNN/AI, digital transformation, technology value.
3. Lê Hoàng Sơn
   - Role: Website full-stack.
   - Responsibilities: website, backend, frontend.
4. Nguyễn Thị Thu Trang
   - Role: Khảo sát nhu cầu thực tế.
   - Responsibilities: user research and target users.
5. Đinh Mỹ Uyên
   - Role: Tester.
   - Responsibilities: testing, usability and user experience.

Team content is in `src/data/mock/team.ts`; presentation is in `src/components/home/team-section.tsx`. Desktop uses a slow scroll-driven member spotlight. Mobile uses a non-pinned fallback. Preserve accessibility and reduced-motion behavior.

## 8. Authentication and user data

- Authentication is Django JWT, not local-only fake auth.
- Main frontend session store: `src/store/session-store.ts`.
- User and tokens are persisted by Zustand.
- `hydrate()` calls Django `/api/users/me/`.
- Login, register, Google login and profile update use Django clients.
- Google login requires matching frontend/backend client IDs.
- User data and diagnoses must persist in Supabase PostgreSQL in production.
- Never allow production to silently fall back to SQLite.
- Never add a migration that hard-codes an admin username or password.
- Never expose credentials in source, screenshots, documentation or commits.

## 9. AI inference contract

Remote inference URL is set by backend `CNN_API_URL` and points to the Hugging Face Space.

Hugging Face behavior:

- `/health`: model and YOLO readiness.
- `/detect-leaf`: YOLO validation/crop only.
- `/predict`: YOLO first, then CNN only if a leaf is valid.
- YOLO threshold currently `0.35`.
- YOLO crop padding ratio currently `0.08`.
- CNN returns top predictions with plant, disease and confidence.

Required behavior:

- If YOLO finds no usable leaf, do not run CNN.
- Show a calm Vietnamese message asking for a clearer leaf image.
- Do not pretend that a non-leaf image has a disease.
- Keep top five CNN results available for symptom comparison.
- Disease labels displayed to users must be translated into natural Vietnamese.
- Recommendations must be disease-specific and based on the final selected/highest result.

Model-file deployment rules:

- `hf_space/app.py` expects `hf_space/agromindaimodel.pth` and `hf_space/yolo_leaf.pt`.
- The CNN checkpoint uses `model_state_dict` plus `class_to_index`, with a legacy loader retained only for older development checkpoints.
- `agromindaimodel.pth` is about 335 MB and is intentionally ignored by Git. A fresh clone must obtain the approved checkpoint separately before deploying the Space.
- `scripts/deploy_hf_space.py` refuses to deploy when the required checkpoint or YOLO file is missing.
- The production Space is currently healthy and reports ConvNeXt Tiny epoch 21, 89 classes and YOLO enabled.
- The Django local classifier defaults to the root `agromindaimodel.pth`; production normally uses the remote API.

## 10. Symptom verification contract

Route: `src/app/api/research-symptoms/route.ts`.

When symptoms are entered, the sequence is mandatory:

1. DeepSeek creates a natural Vietnamese display question and an effective Tavily search query for symptom compatibility.
2. Tavily searches the web.
3. DeepSeek reads and summarizes the returned source content.
4. DeepSeek creates a second question/query for treatment.
5. Tavily searches treatment sources.
6. DeepSeek reads and summarizes treatment evidence.
7. DeepSeek produces the final conclusion and next step.

The response exposes both user-facing questions and clickable sources. Sources should show title/domain and open the actual URL.

There is intentionally no canned answer when symptoms are provided and required services are unavailable. Missing `DEEPSEEK_API_KEY` or `TAVILY_API_KEY` returns a service-unavailable error. If the user skips symptoms, skip this research sequence and retain the normal CNN result flow.

Do not replace this sequence with one direct model call. Do not let Tavily invent the query before DeepSeek generates it.

## 11. Chat contract

Route: `src/app/api/chat/route.ts`.

Two distinct modes exist:

- Diagnosis assistant: may use only the diagnosis explicitly selected from history/context. It can explain CNN results, symptoms and follow-up recommendations. It must not invent missing CNN/YOLO facts.
- Agriculture expert: independent general agriculture advice for Vietnamese growers. It should ask for crop, location, season, irrigation, soil and observed symptoms when context is missing. It must not pretend to use the user's CNN history.

Current generic chat has a local response fallback when DeepSeek is unavailable. Do not change this behavior unless the task explicitly concerns fallback policy.

## 12. Plans and SePay payment contract

Frontend plan definitions are in `src/lib/plans.ts`:

- Seed: free.
- Grow: 9,000 VND per 30 days.
- Bloom: 39,000 VND per 30 days.
- Elite: 99,000 VND per 30 days.

Payment API:

```text
GET/POST /api/payments/orders/
GET      /api/payments/orders/<uuid>/
POST     /api/payments/webhooks/sepay/
```

SePay webhook configured URL:

```text
https://webchuandoanla-backend.onrender.com/api/payments/webhooks/sepay/
```

Expected authentication: HMAC-SHA256 using timestamp and shared webhook secret. API-key authentication remains only as a temporary compatibility fallback.

Order states:

- `pending`
- `underpaid`
- `paid`
- `overpaid`
- `expired`
- `cancelled`
- `review`

Safety behavior:

- Each order has a random payment code with `AGM` prefix.
- Order TTL defaults to 30 minutes.
- A valid exact incoming transfer activates the plan for 30 days.
- Duplicate webhook transactions are idempotent.
- Multiple underpayments may complete an order.
- Overpayments do not auto-upgrade and require review.
- Late payments require review.
- Wrong destination account does not activate the plan.
- Users can only view their own orders.
- Legacy self-upgrade/mock-transfer endpoints are removed.

The current uncommitted checkout redesign adds:

- Three-stage progress: request, bank transfer, plan activation.
- QR and bank-detail presentation.
- Copy feedback.
- Live expiry countdown.
- Polling after the user confirms transfer.
- Explicit underpaid, review and expired states.
- QR lock when the order is underpaid, closed or under review to prevent accidental overpayment.
- Manual transfer guidance for only the remaining amount.
- New-order action after expiry.
- Responsive light/dark styling.

Do not modify plan state directly on the frontend. The backend webhook is the authority that activates a paid plan.

Payment tests are in `backend/payments/tests.py`. At handoff, all 12 payment tests passed.

## 13. Environment variables

Never put real values in this file, source code or Git history.

Vercel/frontend:

```text
DJANGO_BASE_URL
NEXT_PUBLIC_API_BASE_URL
DEEPSEEK_API_KEY
DEEPSEEK_MODEL
TAVILY_API_KEY
NEXT_PUBLIC_GOOGLE_CLIENT_ID
NEXT_PUBLIC_CLARITY_PROJECT_ID
```

`NEXT_PUBLIC_CLARITY_PROJECT_ID` is the Microsoft Clarity project id (public, from `https://clarity.microsoft.com/projects`). A default id is baked into `src/components/system/clarity-analytics.tsx`; this var only overrides it. Clarity loads in production builds only (skipped in dev/preview). CSP in `next.config.js` already allows `*.clarity.ms` and `c.bing.com`.

Render/backend:

```text
SECRET_KEY
SUPABASE_DB_URL
CNN_API_URL
CNN_API_TOKEN
FRONTEND_ORIGIN
CORS_ALLOWED_ORIGINS
CORS_ALLOWED_ORIGIN_REGEXES
CSRF_TRUSTED_ORIGINS
GOOGLE_CLIENT_ID
SEPAY_WEBHOOK_SECRET
SEPAY_API_KEY
SEPAY_BANK_CODE
SEPAY_BANK_NAME
SEPAY_ACCOUNT_NUMBER
SEPAY_ACCOUNT_NAME
SEPAY_PAYMENT_PREFIX
SEPAY_WEBHOOK_MAX_AGE_SECONDS
SEPAY_ORDER_TTL_MINUTES
SEPAY_SUBSCRIPTION_DAYS
```

Security warning:

- Secrets were previously pasted into the development conversation. Treat pasted Hugging Face, Tavily, database or other API credentials as compromised and rotate them.
- `backend/.env.example` contains account-like example values. Do not copy them into public documentation; sanitize examples before committing future changes.
- Never read secrets back to the user. Only verify whether a variable is present/configured.

## 14. Security and Cloudflare

Application headers are configured in `next.config.js`:

- Content-Security-Policy.
- Strict-Transport-Security.
- X-Frame-Options.
- X-Content-Type-Options.
- Referrer-Policy.
- Permissions-Policy.

The CSP currently allows Google sign-in, Render/Vercel connections, OpenStreetMap tiles and SePay/VietQR images.

`CLOUDFLARE_SECURITY.md` is a setup checklist, not proof that a custom Cloudflare domain and challenge page are active. Do not claim Cloudflare verification is deployed unless DNS/proxy/WAF are verified in the Cloudflare account.

If the public domain changes, update Vercel and Render origins/CORS/CSRF settings together.

## 15. Local development

Frontend:

```powershell
npm ci
npm run dev
```

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Frontend local route proxy expects Django at the configured `DJANGO_BASE_URL`. If Django is not running, `/api/django/*` returns a connection error and authentication cannot hydrate.

## 16. Required verification before delivery

For frontend-only changes:

```powershell
npx eslint <changed-files>
npm run build
```

For backend changes:

```powershell
backend\.venv\Scripts\python.exe backend\manage.py check
backend\.venv\Scripts\python.exe backend\manage.py makemigrations --check --dry-run
backend\.venv\Scripts\python.exe backend\manage.py test
```

For payment changes, run at minimum:

```powershell
backend\.venv\Scripts\python.exe backend\manage.py test payments --verbosity 1
```

For AI Space changes:

1. Confirm `hf_space/agromindaimodel.pth` and `hf_space/yolo_leaf.pt` exist.
2. Confirm the checkpoint contains `model_state_dict` and `class_to_index` for ConvNeXt Tiny.
3. Run local `/health`, non-leaf rejection and valid-leaf prediction tests.
4. Deploy only after those checks.
5. Verify the production `/health` response after deployment.

For payment production verification:

1. Deploy the latest frontend/backend commits.
2. Sign in with a real test account.
3. Create a Grow order.
4. Transfer exactly the expected amount with the exact generated content.
5. Confirm SePay webhook delivery.
6. Confirm order becomes `paid`.
7. Confirm `/api/users/me/` returns the new plan and expiry.
8. Confirm the UI updates without manually changing local storage.

Never simulate a production payment or spend real money without explicit user approval.

## 17. Git and editing rules

- The working tree contains extensive user work. Never run `git reset --hard`, `git checkout --`, `git clean`, or broad restore commands.
- Never revert unrelated changes.
- Before editing a dirty file, inspect its current content and diff.
- Use focused patches.
- Do not commit `.env*`, tokens, passwords, database URLs or large unintended artifacts.
- Do not commit model files unless the repository/deployment strategy explicitly requires it and Git size limits are handled.
- Run tests/build before commit.
- Do not deploy or push unless the user explicitly asks.
- If deploying, report the commit SHA and verify the public URLs afterward.

## 18. Current priority and open items

Highest-priority next actions:

1. Perform one controlled Grow payment to prove SePay end to end.
2. Verify DeepSeek and Tavily production environment variables by exercising symptom research without exposing key values.
3. Verify Google OAuth production client/origins.
4. Verify whether Cloudflare DNS/WAF is actually active; the repository currently only proves application security headers and documentation.
5. Sanitize stale branding and unsafe example values while preserving storage migrations and deployment compatibility.

## 19. How to respond to future requests

- Communicate in Vietnamese unless the user asks otherwise.
- Prefer making and testing the requested code change over only describing it.
- Be explicit about what is local, committed, pushed and deployed.
- Do not say a feature is working merely because code exists; verify the relevant production endpoint or state.
- For high-risk operations such as payments, database migrations, credentials or deployment, explain the exact verification status and remaining risk.
- Preserve the product's Vietnamese user-facing language and avoid developer terminology in visible UI.
