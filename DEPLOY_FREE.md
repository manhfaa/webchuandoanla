# Free Deploy: Vercel + Render + Supabase

This project can run all current features on free tiers by splitting services:

- Frontend: Vercel Hobby Free, using the root Next.js app.
- Backend: Render Free Web Service, using `backend/`.
- Database: Supabase Free Postgres.

Do not deploy the frontend as a Render web service if the goal is to stay free. Two always-on Render web services can exceed the monthly free instance-hour budget.

## 1. Create Supabase database

1. Create a free Supabase project.
2. Open Project Settings > Database.
3. Copy the Postgres connection string.
4. Replace `[YOUR-PASSWORD]` with the actual database password.

Keep this value for Render:

```env
SUPABASE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

## 2. Deploy Django backend on Render

Use the existing `render.yaml`. It now creates only the backend service:

```yaml
name: webchuandoanla-backend
runtime: python
plan: free
rootDir: backend
```

Render build command:

```bash
pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput
```

Render start command:

```bash
gunicorn core.wsgi:application --bind 0.0.0.0:$PORT --workers 1 --threads 2 --timeout 60
```

Set these backend environment variables on Render:

```env
PYTHON_VERSION=3.13.2
DEBUG=False
ALLOWED_HOSTS=.onrender.com
FRONTEND_ORIGIN=https://your-vercel-project.vercel.app
CORS_ALLOWED_ORIGINS=https://your-vercel-project.vercel.app
CORS_ALLOWED_ORIGIN_REGEXES=^https://.*\.vercel\.app$
CSRF_TRUSTED_ORIGINS=https://webchuandoanla-backend.onrender.com,https://*.vercel.app
SECRET_KEY=<generate a strong secret>
SUPABASE_DB_URL=<your Supabase Postgres connection string>
```

After the backend deploys, verify:

```text
https://webchuandoanla-backend.onrender.com/admin/login/
```

## 3. Deploy Next.js frontend on Vercel

Import the same repository into Vercel.

Use these settings:

```text
Framework Preset: Next.js
Root Directory: .
Install Command: npm ci
Build Command: npm run build
Output Directory: leave empty
Node.js Version: 20.x
```

Set these frontend environment variables on Vercel:

```env
DJANGO_BASE_URL=https://webchuandoanla-backend.onrender.com
NEXT_PUBLIC_API_BASE_URL=https://webchuandoanla-backend.onrender.com
```

The Next.js API route `/api/django/...` uses `DJANGO_BASE_URL` to proxy browser requests to Django.

## 4. Update Render with final Vercel URL

After Vercel gives the real frontend URL, update these Render backend variables:

```env
FRONTEND_ORIGIN=https://your-real-project.vercel.app
CORS_ALLOWED_ORIGINS=https://your-real-project.vercel.app
CORS_ALLOWED_ORIGIN_REGEXES=^https://.*\.vercel\.app$
CSRF_TRUSTED_ORIGINS=https://webchuandoanla-backend.onrender.com,https://*.vercel.app
```

Redeploy or restart the Render backend.

## Free-tier constraints

- Render Free backend spins down after idle time, so the first request can be slow.
- Do not store uploads, SQLite, or user files on Render local disk. Use Supabase/Postgres or external object storage.
- The current backend is light enough for 512 MB because it does not load a Torch/TensorFlow/YOLO model.
- If heavy AI models are added later, move inference to a separate service or upgrade RAM.
