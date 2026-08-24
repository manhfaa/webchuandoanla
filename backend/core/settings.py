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
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "Agromind AI <no-reply@agromind.farm>")
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# Prefer the HTTPS mail provider when configured so delivery does not depend on
# outbound SMTP availability in the production network.
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
        "google_login": "20/minute",
        "register": "5/hour",
        # Inference runs on a single free CPU Space; cap it so one account
        # cannot exhaust it for everyone else.
        "cnn_inference": "60/hour",
        # One verification run is seven DeepSeek calls and two Tavily searches —
        # by far the most expensive thing an account can trigger. The plan quota
        # is the real limit; this only stops a loop from spending a month of
        # provider credit in an afternoon.
        "symptom_research": "20/hour",
        "chat_respond": "60/hour",
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

# Reverse-proxy friendly defaults
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True
SECURE_SSL_REDIRECT = not DEBUG
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = "Lax"
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"
SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000")) if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG

CNN_MODEL_PATH = os.getenv("CNN_MODEL_PATH", "").strip()
CNN_API_URL = os.getenv("CNN_API_URL", "").strip()
CNN_API_TOKEN = os.getenv("CNN_API_TOKEN", "").strip()
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()

# AI providers.
#
# These keys used to exist only as Vercel environment variables, read by
# `src/app/api/chat/route.ts` and `src/app/api/research-symptoms/route.ts`. A
# native Android client cannot hold them and must not treat the website as a
# secret-holding backend, so the orchestration moved into `aiproviders/` and the
# keys have to be set on the VPS. Unset means the corresponding endpoint answers
# 503 and `/api/mobile/config/` reports the feature as off — never a canned
# answer dressed up as a model answer.
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "").strip()
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-v4-flash").strip()
DEEPSEEK_API_URL = os.getenv("DEEPSEEK_API_URL", "https://api.deepseek.com/chat/completions").strip()
DEEPSEEK_TIMEOUT_SECONDS = int(os.getenv("DEEPSEEK_TIMEOUT_SECONDS", "25"))

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "").strip()
TAVILY_API_URL = os.getenv("TAVILY_API_URL", "https://api.tavily.com/search").strip()
TAVILY_TIMEOUT_SECONDS = int(os.getenv("TAVILY_TIMEOUT_SECONDS", "25"))

# How long a `client_request_id` keeps returning the answer it bought. Two days
# covers a phone that was out of signal overnight; past that the grower has long
# since retried by hand and a replay would be more confusing than a fresh run.
CLIENT_REQUEST_TTL_HOURS = int(os.getenv("CLIENT_REQUEST_TTL_HOURS", "48"))

# Ceiling for the multipart upload route. The app already downscales to a
# ~1600-2048px long edge, so anything near this is either an unprocessed original
# or not a photo at all.
DIAGNOSIS_IMAGE_MAX_BYTES = int(os.getenv("DIAGNOSIS_IMAGE_MAX_BYTES", str(8 * 1024 * 1024)))
DIAGNOSIS_IMAGE_MAX_PIXELS = int(os.getenv("DIAGNOSIS_IMAGE_MAX_PIXELS", "25000000"))
MAX_SYMPTOM_CHARS = int(os.getenv("MAX_SYMPTOM_CHARS", "2000"))
MAX_CHAT_QUERY_CHARS = int(os.getenv("MAX_CHAT_QUERY_CHARS", "4000"))
# JSON uploads include base64 overhead. This is still bounded before Django or
# the inference worker can hold an arbitrarily large request in memory.
DATA_UPLOAD_MAX_MEMORY_SIZE = int(os.getenv("DATA_UPLOAD_MAX_MEMORY_SIZE", str(12 * 1024 * 1024)))
FILE_UPLOAD_MAX_MEMORY_SIZE = DIAGNOSIS_IMAGE_MAX_BYTES

# Mobile app configuration served by /api/mobile/config/.
MOBILE_MIN_SUPPORTED_VERSION = int(os.getenv("MOBILE_MIN_SUPPORTED_VERSION", "1"))
MOBILE_LATEST_VERSION = int(os.getenv("MOBILE_LATEST_VERSION", "1"))
MOBILE_MAINTENANCE = os.getenv("MOBILE_MAINTENANCE", "False").lower() == "true"
MOBILE_MAINTENANCE_MESSAGE = os.getenv("MOBILE_MAINTENANCE_MESSAGE", "").strip()
MOBILE_CONFIG_MAX_AGE = int(os.getenv("MOBILE_CONFIG_MAX_AGE", "300"))
MOBILE_TERMS_URL = os.getenv("MOBILE_TERMS_URL", f"{FRONTEND_ORIGIN}/terms").strip()
MOBILE_PRIVACY_URL = os.getenv("MOBILE_PRIVACY_URL", f"{FRONTEND_ORIGIN}/privacy").strip()
MOBILE_SUPPORT_URL = os.getenv("MOBILE_SUPPORT_URL", "").strip()
# Stays off until a Play service account is configured and
# /api/payments/google-play/verify/ exists. While it is off the Play build hides
# its purchase CTA rather than falling back to a bank transfer, which Play policy
# does not permit.
GOOGLE_PLAY_PACKAGE_NAME = os.getenv("GOOGLE_PLAY_PACKAGE_NAME", "vn.agromind.app").strip()
# Path to the service-account JSON on the VPS, never inside the repository and
# never inside the APK. Unset means Play verification answers 503 and the Play
# build hides its purchase CTA.
GOOGLE_PLAY_SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_PLAY_SERVICE_ACCOUNT_FILE", "").strip()
# Shared secret for the Pub/Sub push endpoint. This endpoint changes
# entitlements, so an unset value refuses everyone rather than accepting anyone.
GOOGLE_PLAY_RTDN_TOKEN = os.getenv("GOOGLE_PLAY_RTDN_TOKEN", "").strip()
# plan slug -> Play product. The ids are chosen in the Play Console and cannot be
# renamed once published, so they are configuration, not something to derive.
GOOGLE_PLAY_PRODUCTS = {
    "grow": {
        "product_id": os.getenv("GOOGLE_PLAY_PRODUCT_GROW", "").strip(),
        "base_plan_id": os.getenv("GOOGLE_PLAY_BASE_PLAN_GROW", "").strip(),
    },
    "bloom": {
        "product_id": os.getenv("GOOGLE_PLAY_PRODUCT_BLOOM", "").strip(),
        "base_plan_id": os.getenv("GOOGLE_PLAY_BASE_PLAN_BLOOM", "").strip(),
    },
    "elite": {
        "product_id": os.getenv("GOOGLE_PLAY_PRODUCT_ELITE", "").strip(),
        "base_plan_id": os.getenv("GOOGLE_PLAY_BASE_PLAN_ELITE", "").strip(),
    },
}
# Reported by /api/mobile/config/. True only when the server can actually verify
# a purchase — otherwise the Play build would show a CTA that leads nowhere.
GOOGLE_PLAY_BILLING_ENABLED = (
    os.getenv("GOOGLE_PLAY_BILLING_ENABLED", "False").lower() == "true"
    and bool(GOOGLE_PLAY_SERVICE_ACCOUNT_FILE)
)

# SePay payment gateway
# Shared secret for the scheduled-chores endpoint. Unset means the endpoint
# refuses every caller, so forgetting it fails closed rather than open.
MAINTENANCE_TOKEN = os.getenv("MAINTENANCE_TOKEN", "").strip()

SEPAY_API_KEY = os.getenv("SEPAY_API_KEY", "").strip()
SEPAY_WEBHOOK_SECRET = os.getenv("SEPAY_WEBHOOK_SECRET", "").strip()
# One hour, not five minutes: SePay gives up after 30s and queues a retry, while
# a sleeping free-tier instance takes ~35s just to wake, so the delivery that
# actually lands is often a retry sent well after the original. Rejecting those
# as stale loses a payment the customer already made. Replay is prevented by the
# transaction id — a resent webhook answers "duplicate" and re-activates nothing
# — so the window guards nothing that the dedup does not already guard.
SEPAY_WEBHOOK_MAX_AGE_SECONDS = int(os.getenv("SEPAY_WEBHOOK_MAX_AGE_SECONDS", "3600"))
# The number a payer transfers to, when the bank does not accept transfers
# straight to the master account. BIDV is one of these: SePay's own QR builder
# says "BIDV yêu cầu chọn VA để tạo QR" and puts the virtual account in the QR,
# and SePay only records transfers that arrive through it — money sent directly
# to the master account reaches the bank but never appears in SePay at all, so
# the webhook never fires and the plan never activates.
#
# Kept separate from SEPAY_ACCOUNT_NUMBER because the webhook still reports the
# master account in `accountNumber` (the virtual one arrives as `subAccount`),
# so one value cannot serve both the payer and the incoming validation.
# Leave empty for banks that take transfers on the master account directly.
SEPAY_VIRTUAL_ACCOUNT = os.getenv("SEPAY_VIRTUAL_ACCOUNT", "").strip()
SEPAY_BANK_CODE = os.getenv("SEPAY_BANK_CODE", "").strip()
SEPAY_BANK_NAME = os.getenv("SEPAY_BANK_NAME", "").strip()
SEPAY_ACCOUNT_NUMBER = os.getenv("SEPAY_ACCOUNT_NUMBER", "").strip()
SEPAY_ACCOUNT_NAME = os.getenv("SEPAY_ACCOUNT_NAME", "").strip()
SEPAY_PAYMENT_PREFIX = os.getenv("SEPAY_PAYMENT_PREFIX", "AGM").strip()
SEPAY_ORDER_TTL_MINUTES = int(os.getenv("SEPAY_ORDER_TTL_MINUTES", "30"))
SEPAY_SUBSCRIPTION_DAYS = int(os.getenv("SEPAY_SUBSCRIPTION_DAYS", "30"))
SEPAY_QR_BASE_URL = os.getenv("SEPAY_QR_BASE_URL", "https://vietqr.app/img").strip()
