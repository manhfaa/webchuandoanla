import logging
import os
import secrets
from datetime import timedelta
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# Fail safe: an unset or misspelled DEBUG env var must not turn debug on in
# production. Local development sets DEBUG=True explicitly in backend/.env.
DEBUG = os.getenv("DEBUG", "False").lower() == "true"
SECRET_KEY = os.getenv("SECRET_KEY", "").strip()
if not SECRET_KEY:
    if not DEBUG:
        raise RuntimeError("SECRET_KEY is required when DEBUG=False.")
    SECRET_KEY = secrets.token_urlsafe(50)

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
    "rest_framework_simplejwt.token_blacklist",
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

# --- Outgoing mail (password reset) ---------------------------------------
# Django's default EMAIL_HOST is "localhost", where nothing is listening, so an
# unconfigured deployment would attempt a real SMTP connection and fail. Treat
# "no EMAIL_HOST" as "no provider" and print to the console instead: the reset
# flow stays exercisable in development, and production surfaces the gap in the
# startup log rather than silently swallowing every message.
EMAIL_HOST = os.getenv("EMAIL_HOST", "").strip()
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "").strip()
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")

# 465 is implicit TLS, 587 is STARTTLS. Django rejects both flags at once, so
# derive them from the port unless the provider needs something unusual.
_email_use_ssl_raw = os.getenv("EMAIL_USE_SSL", "").strip().lower()
_email_use_tls_raw = os.getenv("EMAIL_USE_TLS", "").strip().lower()
if _email_use_ssl_raw or _email_use_tls_raw:
    EMAIL_USE_SSL = _email_use_ssl_raw == "true"
    EMAIL_USE_TLS = _email_use_tls_raw == "true"
else:
    EMAIL_USE_SSL = EMAIL_PORT == 465
    EMAIL_USE_TLS = EMAIL_PORT != 465
if EMAIL_USE_SSL and EMAIL_USE_TLS:
    raise RuntimeError("EMAIL_USE_SSL and EMAIL_USE_TLS cannot both be true.")

# Without a timeout a stalled provider holds the request until the gunicorn
# worker is killed, which on a single-worker free tier stalls the whole API.
EMAIL_TIMEOUT = int(os.getenv("EMAIL_TIMEOUT", "10"))
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "Agromind AI <no-reply@agromindai.vercel.app>")
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# Render blocks outbound SMTP — a connection to smtp.gmail.com:587 from a
# deployed service hangs until EMAIL_TIMEOUT every time — so the HTTPS provider
# wins when both are configured.
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "").strip()

if BREVO_API_KEY:
    EMAIL_BACKEND = "core.mail.BrevoAPIBackend"
elif EMAIL_HOST:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    if not DEBUG:
        logging.getLogger(__name__).warning(
            "Đang dùng SMTP: nếu máy chủ chặn cổng SMTP thì email sẽ không gửi được. "
            "Đặt BREVO_API_KEY để gửi qua HTTPS."
        )
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
    if not DEBUG:
        logging.getLogger(__name__).warning(
            "Chưa cấu hình gửi email: liên kết đặt lại mật khẩu chỉ hiện trong log "
            "máy chủ, người dùng sẽ không nhận được email."
        )

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
        "login": "10/minute",
        "register": "5/hour",
        # Inference runs on a single free CPU Space; cap it so one account
        # cannot exhaust it for everyone else.
        "cnn_inference": "60/hour",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    # Sessions previously died hard after 30 minutes because no refresh endpoint
    # existed. With /api/auth/refresh/ in place, rotate on every refresh and
    # blacklist the used token so a stolen refresh token can be invalidated.
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

# Render/Proxy friendly defaults
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True
SECURE_SSL_REDIRECT = not DEBUG
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000")) if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG

CNN_MODEL_PATH = os.getenv("CNN_MODEL_PATH", "").strip()
CNN_API_URL = os.getenv("CNN_API_URL", "").strip()
CNN_API_TOKEN = os.getenv("CNN_API_TOKEN", "").strip()
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()

# SePay payment gateway
SEPAY_API_KEY = os.getenv("SEPAY_API_KEY", "").strip()
SEPAY_WEBHOOK_SECRET = os.getenv("SEPAY_WEBHOOK_SECRET", "").strip()
# One hour, not five minutes: SePay gives up after 30s and queues a retry, while
# a sleeping free-tier instance takes ~35s just to wake, so the delivery that
# actually lands is often a retry sent well after the original. Rejecting those
# as stale loses a payment the customer already made. Replay is prevented by the
# transaction id — a resent webhook answers "duplicate" and re-activates nothing
# — so the window guards nothing that the dedup does not already guard.
SEPAY_WEBHOOK_MAX_AGE_SECONDS = int(os.getenv("SEPAY_WEBHOOK_MAX_AGE_SECONDS", "3600"))
SEPAY_BANK_CODE = os.getenv("SEPAY_BANK_CODE", "").strip()
SEPAY_BANK_NAME = os.getenv("SEPAY_BANK_NAME", "").strip()
SEPAY_ACCOUNT_NUMBER = os.getenv("SEPAY_ACCOUNT_NUMBER", "").strip()
SEPAY_ACCOUNT_NAME = os.getenv("SEPAY_ACCOUNT_NAME", "").strip()
SEPAY_PAYMENT_PREFIX = os.getenv("SEPAY_PAYMENT_PREFIX", "AGM").strip()
SEPAY_ORDER_TTL_MINUTES = int(os.getenv("SEPAY_ORDER_TTL_MINUTES", "30"))
SEPAY_SUBSCRIPTION_DAYS = int(os.getenv("SEPAY_SUBSCRIPTION_DAYS", "30"))
SEPAY_QR_BASE_URL = os.getenv("SEPAY_QR_BASE_URL", "https://vietqr.app/img").strip()
