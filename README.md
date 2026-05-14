# UI-UXdetectleaf

Leafiq là website chẩn đoán lá cây và quản lý quy trình chăm sóc cây trồng. Project hiện gồm:

- Frontend: `Next.js App Router + TypeScript + Tailwind CSS`
- Backend: `Django + Django REST Framework + JWT Auth`
- Database: `PostgreSQL / Supabase Postgres`

Repo này đang chứa cả frontend và backend trong cùng một source tree để tiện phát triển local và deploy.

## Tính năng hiện có

### Public website

- Landing page giới thiệu sản phẩm
- Trang đăng nhập
- Trang đăng ký
- Giao diện thương hiệu Leafiq

### Dashboard người dùng

- Tổng quan dashboard
- Kiểm tra ảnh lá cây
- Kết quả kiểm tra ảnh
- Lịch sử kiểm tra ảnh
- Chat tư vấn
- Gói dịch vụ
- Hồ sơ người dùng
- Kế hoạch trồng cây theo địa điểm

### Backend API

- Đăng ký / đăng nhập bằng email + mật khẩu
- JWT authentication
- Hồ sơ người dùng
- Cài đặt người dùng
- Lưu lịch sử chẩn đoán
- Quản lý gói dịch vụ và dữ liệu engagement
- API kế hoạch trồng cây

## Cấu trúc thư mục

```text
.
├─ src/                        Frontend Next.js
│  ├─ app/                     Routes App Router
│  ├─ components/              UI components và feature components
│  ├─ constants/               Text, navigation, brand constants
│  ├─ data/mock/               Mock data
│  ├─ lib/                     Helpers, API clients, detector logic
│  ├─ store/                   Zustand stores
│  └─ types/                   Shared TypeScript types
├─ public/                     Ảnh minh họa, avatars, SVG assets
├─ backend/                    Django backend
│  ├─ core/                    settings, urls, asgi, wsgi
│  ├─ users/                   Auth, profile, settings
│  ├─ diagnoses/               Diagnosis models + APIs
│  ├─ engagement/              Plans, subscriptions, chat, consultations
│  ├─ crop_plans/              Crop planning feature
│  ├─ sql/                     PostgreSQL schema tham chiếu
│  ├─ requirements.txt         Python dependencies
│  └─ .env.example             Env mẫu cho backend
├─ render.yaml                 Cấu hình deploy Render
├─ package.json                Frontend scripts và dependencies
└─ README.md
```

## Yêu cầu môi trường

### Frontend

- Node.js `20+`
- npm `10+`

### Backend

- Python `3.13.x`
- pip mới
- PostgreSQL hoặc Supabase Postgres

## Chạy local

### 1. Clone repo

```bash
git clone https://github.com/phamducmanhhj-design/UI-UXdetectleaf.git
cd UI-UXdetectleaf
```

### 2. Cài frontend

```bash
npm install
```

### 3. Cài backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

## Cấu hình backend

Tạo file `.env` trong thư mục `backend/` từ mẫu:

```bash
copy backend\.env.example backend\.env
```

Các biến quan trọng:

```env
SECRET_KEY=change-me
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
SUPABASE_DB_URL=
FRONTEND_ORIGIN=http://127.0.0.1:3000
CORS_ALLOWED_ORIGINS=
CSRF_TRUSTED_ORIGINS=
```

### Giải thích nhanh

- `SUPABASE_DB_URL`: connection string PostgreSQL của Supabase
- `FRONTEND_ORIGIN`: URL frontend local
- `CORS_ALLOWED_ORIGINS`: danh sách origin frontend nếu chạy nhiều môi trường
- `CSRF_TRUSTED_ORIGINS`: origin backend/frontend trusted khi deploy

Nếu chưa có Supabase, backend sẽ fallback sang SQLite local theo settings hiện tại.

## Chạy database migration

```bash
cd backend
python manage.py migrate
cd ..
```

## Khởi động local

### Cách 1: Development mode

Mở 2 terminal riêng.

Terminal 1, frontend:

```bash
npm run dev
```

Terminal 2, backend:

```bash
cd backend
python manage.py runserver 127.0.0.1:8000
```

Frontend:

- `http://localhost:3000`

Backend:

- `http://127.0.0.1:8000`

Lưu ý:

- Nên mở frontend bằng `http://localhost:3000`
- Không nên mở bằng `127.0.0.1:3000` khi đang dùng `next dev` nếu trình duyệt giữ cache HMR cũ

### Cách 2: Production-like local

```bash
npm run build
npm run start
```

Backend vẫn chạy riêng:

```bash
cd backend
python manage.py runserver 127.0.0.1:8000
```

## Tài khoản test

Tài khoản test hiện dùng trong giao diện:

```text
Email: demo@leafiq.vn
Password: Demo@12345
```

Nếu cần tạo lại user test:

```bash
cd backend
python manage.py shell
```

Rồi tạo user bằng Django ORM hoặc qua API register.

## Frontend scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Backend dependencies

Các package backend chính:

- `Django==5.1.1`
- `djangorestframework==3.15.2`
- `djangorestframework-simplejwt==5.3.1`
- `psycopg[binary]==3.2.3`
- `dj-database-url==2.2.0`
- `python-dotenv==1.0.1`
- `django-cors-headers==4.4.0`
- `gunicorn==22.0.0`
- `whitenoise==6.7.0`

## API chính

### Auth

- `POST /api/auth/register/`
- `POST /api/auth/login/`

### User

- `GET /api/users/me/`
- `PATCH /api/users/me/`
- `GET /api/users/settings/`
- `PATCH /api/users/settings/`

### Diagnoses

- `GET /api/diagnoses/`
- `POST /api/diagnoses/`
- `GET /api/diagnoses/{id}/`
- `PATCH /api/diagnoses/{id}/`
- `DELETE /api/diagnoses/{id}/`

### Engagement

- `GET /api/engagement/plans/`
- `GET /api/engagement/subscriptions/`
- `POST /api/engagement/subscriptions/`
- `GET /api/engagement/conversations/`
- `POST /api/engagement/conversations/`
- `GET /api/engagement/messages/`
- `POST /api/engagement/messages/`
- `GET /api/engagement/expert-consultations/`
- `POST /api/engagement/expert-consultations/`

### Crop plans

- `GET /api/crop-plans/crops/`
- `GET /api/crop-plans/locations/`
- `POST /api/crop-plans/locations/`
- `POST /api/crop-plans/preview/`
- `GET /api/crop-plans/plans/`
- `POST /api/crop-plans/plans/`
- `GET /api/crop-plans/plans/{id}/`
- `PATCH /api/crop-plans/plans/{id}/`
- `POST /api/crop-plans/plans/{id}/regenerate/`
- `POST /api/crop-plans/steps/{id}/complete/`
- `POST /api/crop-plans/steps/{id}/delay/`
- `POST /api/crop-plans/steps/{id}/notes/`
- `GET /api/crop-plans/reminders/`
- `PATCH /api/crop-plans/reminders/{id}/read/`
- `POST /api/crop-plans/plans/{id}/weather-refresh/`

## Deploy

Repo đã có sẵn `render.yaml` cho Render.

### Frontend Render

- runtime: `node`
- build: `npm ci --include=dev && npm run build`
- start: `npx next start -H 0.0.0.0 -p $PORT`

### Backend Render

- runtime: `python`
- rootDir: `backend`
- build:

```bash
pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput
```

- start:

```bash
gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
```

### Biến môi trường cần có khi deploy

Frontend:

- `NEXT_PUBLIC_API_BASE_URL`

Backend:

- `PYTHON_VERSION`
- `DEBUG=False`
- `ALLOWED_HOSTS`
- `FRONTEND_ORIGIN`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`
- `SECRET_KEY`
- `SUPABASE_DB_URL`

## File quan trọng nên kiểm tra khi phát triển

- `src/app/login/page.tsx`
- `src/components/layout/dashboard-shell.tsx`
- `src/components/layout/dashboard-topbar.tsx`
- `src/lib/django-client.ts`
- `src/store/session-store.ts`
- `backend/core/settings.py`
- `backend/core/urls.py`

## Ghi chú kỹ thuật

- Frontend hiện vừa dùng mock data, vừa gọi backend thật cho auth và một số flow dữ liệu
- Dashboard và login đã được chỉnh để chạy ổn định hơn giữa local dev và production build
- Có file schema PostgreSQL tham chiếu tại `backend/sql/postgresql_schema.sql`
- Có thể cần dọn thêm text lỗi mã hóa ở một số màn chưa được chuẩn hóa hoàn toàn

## Tình trạng hiện tại

Project đã có thể:

- chạy local frontend
- chạy local backend
- đăng ký / đăng nhập
- mở dashboard
- lưu dữ liệu người dùng theo backend Django
- push source code lên GitHub
