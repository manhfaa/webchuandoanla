import os
from datetime import timedelta
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("SECRET_KEY", "unsafe-dev-secret")
DEBUG = os.getenv("DEBUG", "True").lower() == "true"

ALLOWED_HOSTS = [host.strip() for host in os.getenv("ALLOWED_HOSTS", "127.0.0.1,localhost,testserver").split(",")]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "users",
    "diagnoses",
    "engagement",
    "payments",
    "crop_plans",
    "farmops",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"
ASGI_APPLICATION = "core.asgi.application"

supabase_db_url = os.getenv("SUPABASE_DB_URL", "").strip()
if supabase_db_url:
    DATABASES = {
        "default": dj_database_url.parse(
            supabase_db_url,
            conn_max_age=600,
            ssl_require=True,
        )
    }
else:
    if not DEBUG:
        raise RuntimeError("SUPABASE_DB_URL is required when DEBUG=False. Refusing to use temporary SQLite in production.")
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_USER_MODEL = "users.User"

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "vi"
TIME_ZONE = "Asia/Ho_Chi_Minh"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://127.0.0.1:3000")
frontend_origin = FRONTEND_ORIGIN

# Allow comma-separated origins for staging/prod
cors_origins_raw = os.getenv("CORS_ALLOWED_ORIGINS", "").strip()
if cors_origins_raw:
    CORS_ALLOWED_ORIGINS = [o.strip() for o in cors_origins_raw.split(",") if o.strip()]
else:
    CORS_ALLOWED_ORIGINS = [frontend_origin]

cors_origin_regexes_raw = os.getenv("CORS_ALLOWED_ORIGIN_REGEXES", "").strip()
if cors_origin_regexes_raw:
    CORS_ALLOWED_ORIGIN_REGEXES = [
        regex.strip() for regex in cors_origin_regexes_raw.split(",") if regex.strip()
    ]

csrf_trusted_raw = os.getenv("CSRF_TRUSTED_ORIGINS", "").strip()
if csrf_trusted_raw:
    CSRF_TRUSTED_ORIGINS = [o.strip() for o in csrf_trusted_raw.split(",") if o.strip()]

CORS_ALLOW_CREDENTIALS = False

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "users.authentication.ExpiringJWTAuthentication",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "payment_orders": "30/hour",
        "payment_status": "120/minute",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
}

# Render/Proxy friendly defaults
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True
SECURE_SSL_REDIRECT = not DEBUG
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "3600")) if not DEBUG else 0

CNN_MODEL_PATH = os.getenv("CNN_MODEL_PATH", "").strip()
CNN_API_URL = os.getenv("CNN_API_URL", "").strip()
CNN_API_TOKEN = os.getenv("CNN_API_TOKEN", "").strip()
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()

# SePay payment gateway
SEPAY_API_KEY = os.getenv("SEPAY_API_KEY", "").strip()
SEPAY_WEBHOOK_SECRET = os.getenv("SEPAY_WEBHOOK_SECRET", "").strip()
SEPAY_WEBHOOK_MAX_AGE_SECONDS = int(os.getenv("SEPAY_WEBHOOK_MAX_AGE_SECONDS", "300"))
SEPAY_BANK_CODE = os.getenv("SEPAY_BANK_CODE", "").strip()
SEPAY_BANK_NAME = os.getenv("SEPAY_BANK_NAME", "").strip()
SEPAY_ACCOUNT_NUMBER = os.getenv("SEPAY_ACCOUNT_NUMBER", "").strip()
SEPAY_ACCOUNT_NAME = os.getenv("SEPAY_ACCOUNT_NAME", "").strip()
SEPAY_PAYMENT_PREFIX = os.getenv("SEPAY_PAYMENT_PREFIX", "AGM").strip()
SEPAY_ORDER_TTL_MINUTES = int(os.getenv("SEPAY_ORDER_TTL_MINUTES", "30"))
SEPAY_SUBSCRIPTION_DAYS = int(os.getenv("SEPAY_SUBSCRIPTION_DAYS", "30"))
SEPAY_QR_BASE_URL = os.getenv("SEPAY_QR_BASE_URL", "https://vietqr.app/img").strip()
