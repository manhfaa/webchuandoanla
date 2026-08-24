import hmac
import logging

from django.conf import settings
from django.db import connection
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .housekeeping import run_housekeeping

logger = logging.getLogger(__name__)


@csrf_exempt
def run_housekeeping_view(request):
    """Let a scheduler trigger the periodic chores over HTTPS.

    The schedule lives in GitHub Actions and reaches Django over HTTPS. That makes the shared
    secret the whole of the protection, so it fails closed: with no token
    configured the endpoint refuses everyone rather than running for anyone.
    """
    if request.method != "POST":
        return JsonResponse({"error": "Chỉ hỗ trợ POST."}, status=405)

    expected = (getattr(settings, "MAINTENANCE_TOKEN", "") or "").strip()
    if not expected:
        logger.warning("Housekeeping endpoint called but MAINTENANCE_TOKEN is not set.")
        return JsonResponse({"error": "Tác vụ định kỳ chưa được cấu hình."}, status=503)

    received = (request.headers.get("X-Maintenance-Token", "") or "").strip()
    if not received or not hmac.compare_digest(received, expected):
        return JsonResponse({"error": "Yêu cầu chưa được xác thực."}, status=401)

    report = run_housekeeping()
    logger.info("Housekeeping run over HTTP: %s", report)
    return JsonResponse({"status": "ok", "report": report})


def mobile_config(request):
    """What the Android app is allowed to know before anyone signs in.

    Three jobs, none of which the app can do for itself:

    * **Force-update floor.** A build older than `minimum_supported_version` is
      told to update instead of failing against a contract it no longer speaks.
    * **Maintenance switch.** A planned outage becomes a screen with a reason,
      not a wall of timeouts.
    * **Feature flags.** Google sign-in, symptom research and Play Billing each
      depend on server-side configuration that may not exist on a given
      deployment. The app reads the flag rather than discovering the gap by
      calling an endpoint that answers 503 — and a Play build that has no
      verified purchase path hides its purchase CTA instead of quietly opening a
      bank transfer, which Play policy does not allow.

    Public and deliberately dull: only booleans, version numbers and public URLs.
    No provider URL, no key, no database information. Cached briefly so a flag
    flip reaches phones in minutes without every cold start hitting the database.
    """
    flags = {
        "google_sign_in": bool(getattr(settings, "GOOGLE_CLIENT_ID", "").strip()),
        # Both providers are needed for a verification run; advertising the
        # feature with only one configured would send the grower into a 503.
        "symptom_research": bool(
            getattr(settings, "DEEPSEEK_API_KEY", "").strip()
            and getattr(settings, "TAVILY_API_KEY", "").strip()
        ),
        "expert_chat": bool(getattr(settings, "DEEPSEEK_API_KEY", "").strip()),
        "direct_payment": bool(getattr(settings, "SEPAY_ACCOUNT_NUMBER", "").strip()),
        "play_billing": bool(getattr(settings, "GOOGLE_PLAY_BILLING_ENABLED", False)),
        "password_reset_email": bool(getattr(settings, "EMAIL_HOST", "").strip())
        or bool(getattr(settings, "BREVO_API_KEY", "").strip()),
    }

    response = JsonResponse(
        {
            "minimum_supported_version": int(getattr(settings, "MOBILE_MIN_SUPPORTED_VERSION", 1)),
            "latest_version": int(getattr(settings, "MOBILE_LATEST_VERSION", 1)),
            "maintenance": bool(getattr(settings, "MOBILE_MAINTENANCE", False)),
            "maintenance_message": getattr(settings, "MOBILE_MAINTENANCE_MESSAGE", ""),
            "features": flags,
            "legal": {
                "terms_url": getattr(settings, "MOBILE_TERMS_URL", ""),
                "privacy_url": getattr(settings, "MOBILE_PRIVACY_URL", ""),
                "support_url": getattr(settings, "MOBILE_SUPPORT_URL", ""),
            },
        }
    )
    response["Cache-Control"] = f"public, max-age={int(getattr(settings, 'MOBILE_CONFIG_MAX_AGE', 300))}"
    return response


def health_check(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("select 1")
            cursor.fetchone()
    except Exception:
        return JsonResponse(
            {"status": "error", "database": "unavailable"},
            status=503,
        )

    return JsonResponse({"status": "ok", "database": "ok"})
