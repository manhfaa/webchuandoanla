# Agromind AI - webchuandoanla

Agromind AI là ứng dụng chẩn đoán ảnh lá cây và hỗ trợ canh tác. Repo này chứa cả frontend Next.js và backend Django để người clone về có thể chạy local, phát triển tiếp và deploy.

Repo GitHub: https://github.com/manhfaa/webchuandoanla

## Tính năng hiện có

- Chẩn đoán ảnh lá: upload ảnh, chụp bằng camera, dùng ảnh mẫu, nén ảnh trước upload.
- YOLO xác thực ảnh lá và CNN trả top 5 kết quả bệnh/cây.
- Cảnh báo độ tin cậy CNN bằng màu xanh/đỏ, cảnh báo khi confidence dưới 70%.
- Khuyến nghị hành động sau chẩn đoán: mức rủi ro, việc cần làm ngay, theo dõi 3-7 ngày, khi nào hỏi chuyên gia, có nên chụp lại ảnh, lưu ý an toàn.
- Chat AI qua DeepSeek nếu có `DEEPSEEK_API_KEY`, fallback local nếu chưa cấu hình.
- Giọng nói: nút micro hỏi bằng tiếng Việt và đọc kết quả chẩn đoán.
- Hỗ trợ mạng yếu: trạng thái online/offline, lưu tạm và gửi lại khi có mạng.
- Thời tiết và cảnh báo sâu bệnh theo tỉnh/huyện/xã/vị trí canh tác.
- Dự báo 3 ngày, 7 ngày, độ ẩm, nhiệt độ, mưa, gió và gợi ý tưới/bón/phun hôm nay.
- Kế hoạch canh tác theo cây trồng, vị trí, thời tiết và tiến độ thực hiện.
- Lô vườn/ruộng, nhật ký tưới nước, bón phân, phun thuốc, kiểm tra sâu bệnh.
- Liên kết kết quả chẩn đoán với lô vườn.
- QR truy xuất nguồn gốc và trang công khai cho QR.
- Thư viện vật tư: thuốc BVTV, phân bón, dinh dưỡng cây trồng, triệu chứng thiếu dinh dưỡng.
- Search/filter theo cây, bệnh, hoạt chất, loại vật tư.
- Gợi ý vật tư liên quan trong trang kết quả chẩn đoán.
- Song ngữ Việt/Anh, lưu lựa chọn ngôn ngữ bằng localStorage.
- Đăng nhập/đăng ký thật bằng backend Django JWT.

## Công nghệ

- Frontend: Next.js App Router, TypeScript, Tailwind CSS, Zustand.
- Backend: Django, Django REST Framework, Simple JWT.
- Database: SQLite local mặc định hoặc PostgreSQL/Supabase qua `SUPABASE_DB_URL`.
- CNN: chạy local bằng `best_model.pth` hoặc gọi Hugging Face Space qua `CNN_API_URL`.
- Deploy free: Vercel cho frontend, Render cho backend, Hugging Face Space cho CNN FastAPI.

## Cấu trúc chính

```text
.
├─ src/                         Frontend Next.js
│  ├─ app/                      Routes App Router
│  ├─ components/               UI và feature components
│  ├─ hooks/                    Voice, online status
│  ├─ lib/                      API clients, i18n, offline queue, compression
│  ├─ locales/                  Bản dịch Việt/Anh
│  ├─ store/                    Zustand stores
│  └─ types/                    TypeScript types
├─ backend/                     Django backend
│  ├─ core/                     Settings, urls, asgi, wsgi
│  ├─ users/                    Auth, profile, settings
│  ├─ diagnoses/                Diagnosis, CNN, action plan
│  ├─ engagement/               Plans, chat, expert consultation
│  ├─ crop_plans/               Kế hoạch canh tác, thời tiết, nhắc việc
│  ├─ farmops/                  Lô vườn, nhật ký, QR, thư viện vật tư
│  └─ requirements.txt
├─ hf_space/                    FastAPI Space cho CNN
├─ scripts/deploy_hf_space.py   Script deploy Hugging Face Space
├─ DEPLOY_FREE.md               Ghi chú deploy miễn phí
├─ render.yaml                  Cấu hình Render backend
├─ vercel.json                  Cấu hình Vercel frontend
├─ best_model.pth               CNN checkpoint local
└─ README.md
```

## Yêu cầu môi trường

- Node.js `20+`
- npm `10+`
- Python `3.13.x`
- pip
- Git

PostgreSQL/Supabase là tùy chọn. Nếu không có `SUPABASE_DB_URL`, backend dùng SQLite local.

## Clone và cài đặt

```bash
git clone https://github.com/manhfaa/webchuandoanla.git
cd webchuandoanla
npm install
```

Cài backend trên Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..
```

Cài backend trên macOS/Linux:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
```

## Cấu hình môi trường

Tạo env frontend:

```powershell
copy .env.example .env.local
```

Tạo env backend:

```powershell
copy backend\.env.example backend\.env
```

Các biến quan trọng:

```env
# Frontend
DJANGO_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash

# Backend
SECRET_KEY=change-me
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
SUPABASE_DB_URL=
CNN_MODEL_PATH=
CNN_API_URL=
CNN_API_TOKEN=
FRONTEND_ORIGIN=http://127.0.0.1:3000
CORS_ALLOWED_ORIGINS=
CSRF_TRUSTED_ORIGINS=
```

Không commit `.env`, `.env.local`, token DeepSeek hoặc Hugging Face thật.

## Database

Chạy migration:

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py migrate
cd ..
```

Nếu dùng macOS/Linux:

```bash
cd backend
.venv/bin/python manage.py migrate
cd ..
```

## Chạy local

Mở 2 terminal.

Terminal backend:

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Terminal frontend:

```powershell
npm run dev
```

URL local:

- Frontend: http://127.0.0.1:3000
- Trang chẩn đoán: http://127.0.0.1:3000/dashboard/diagnosis
- Backend admin: http://127.0.0.1:8000/admin/login/

## Tài khoản demo

Giao diện có tài khoản gợi ý:

```text
Email: demo@agromindai.vn
Password: Demo@12345
```

Nếu tài khoản chưa có trong database local, đăng ký tài khoản mới tại `/register` hoặc tạo bằng Django admin/shell.

## CNN model

Backend ưu tiên theo thứ tự:

1. Gọi remote CNN FastAPI nếu có `CNN_API_URL`.
2. Chạy local checkpoint nếu có `CNN_MODEL_PATH` hoặc file `best_model.pth` ở root repo.

File `best_model.pth` đang nằm trong repo để dev local có thể tiếp tục ngay. Nếu muốn deploy nhẹ hơn, đưa model lên Hugging Face Space và set:

```env
CNN_API_URL=https://username-agromind-cnn-api.hf.space
CNN_API_TOKEN=
```

Deploy Hugging Face Space:

```powershell
$env:HF_TOKEN="your_huggingface_token"
python scripts\deploy_hf_space.py
```

## DeepSeek chat

Chat AI dùng DeepSeek qua biến:

```env
DEEPSEEK_API_KEY=your_key
DEEPSEEK_MODEL=deepseek-v4-flash
```

Nếu không có key, app vẫn dùng fallback local để trả lời cơ bản.

## Kiểm tra trước khi commit

Frontend:

```powershell
npm run build
```

Backend:

```powershell
backend\.venv\Scripts\python.exe backend\manage.py makemigrations --check --dry-run
backend\.venv\Scripts\python.exe backend\manage.py check
backend\.venv\Scripts\python.exe backend\manage.py migrate --noinput
```

## API chính

Auth:

- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `GET /api/users/me/`

Diagnoses:

- `GET /api/diagnoses/`
- `POST /api/diagnoses/`
- `GET /api/diagnoses/{id}/`
- `PATCH /api/diagnoses/{id}/`
- `DELETE /api/diagnoses/{id}/`

Crop plans:

- `GET /api/crop-plans/crops/`
- `GET /api/crop-plans/locations/`
- `POST /api/crop-plans/locations/`
- `POST /api/crop-plans/preview/`
- `GET /api/crop-plans/plans/`
- `POST /api/crop-plans/plans/`
- `POST /api/crop-plans/steps/{id}/complete/`
- `POST /api/crop-plans/steps/{id}/delay/`
- `GET /api/crop-plans/reminders/`

Farmops:

- `GET /api/farmops/locations/`
- `POST /api/farmops/locations/`
- `GET /api/farmops/plots/`
- `POST /api/farmops/plots/`
- `GET /api/farmops/cultivation-logs/`
- `POST /api/farmops/cultivation-logs/`
- `GET /api/farmops/traceability/`
- `POST /api/farmops/traceability/`
- `GET /api/farmops/traceability/public/{token}/`
- `GET /api/farmops/weather-alerts/`
- `GET /api/farmops/input-library/`
- `GET /api/farmops/nutrition-symptoms/`

Engagement:

- `GET /api/engagement/plans/`
- `GET /api/engagement/subscriptions/`
- `POST /api/engagement/verify-transfer/`
- `GET /api/engagement/conversations/`
- `POST /api/engagement/messages/`
- `GET /api/engagement/expert-consultations/`

## Deploy miễn phí

Tài liệu nhanh nằm ở `DEPLOY_FREE.md`.

Gợi ý cấu hình:

- Frontend: Vercel, build `npm run build`.
- Backend: Render free, dùng `render.yaml`.
- Database: Supabase Postgres hoặc SQLite cho local.
- CNN: Hugging Face Space free.
- DeepSeek: set `DEEPSEEK_API_KEY` và `DEEPSEEK_MODEL` trong Vercel env.
- Cloudflare: xem `CLOUDFLARE_SECURITY.md` để bật proxy, SSL strict, WAF/rate limit và cập nhật domain production.

Backend Render cần các biến chính:

```env
DEBUG=False
ALLOWED_HOSTS=.onrender.com
FRONTEND_ORIGIN=https://your-vercel-project.vercel.app
CORS_ALLOWED_ORIGINS=https://your-vercel-project.vercel.app
CSRF_TRUSTED_ORIGINS=https://your-backend.onrender.com,https://*.vercel.app
SUPABASE_DB_URL=postgresql://...
CNN_API_URL=https://username-agromind-cnn-api.hf.space
```

## Ghi chú phát triển

- Không đưa secret thật vào GitHub.
- Không commit `node_modules`, `.next`, `backend/.venv`, database SQLite local.
- Khi thêm model lớn mới, ưu tiên Hugging Face Space hoặc Git LFS.
- Nếu đổi schema backend, tạo migration và chạy `migrate`.
- Nếu thêm text giao diện, giữ tiếng Việt có dấu và cập nhật i18n khi cần.
