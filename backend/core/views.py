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

    Render's free tier has no cron jobs, so the schedule lives in GitHub Actions
    and reaches Django the only way it can — an HTTP call. That makes the shared
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
