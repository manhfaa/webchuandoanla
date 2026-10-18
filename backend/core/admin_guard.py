"""Database-backed throttling for Django admin login attempts."""

from __future__ import annotations

import logging
from datetime import timedelta

from django.db import DatabaseError, connection, transaction
from django.http import HttpResponse
from django.utils import timezone
from django.utils.deprecation import MiddlewareMixin

from users.models import AdminLoginAttempt
from users.registration_security import _digest

logger = logging.getLogger("agromind.security.admin")

IP_LIMIT = 10
ACCOUNT_LIMIT = 30
WINDOW_SECONDS = 15 * 60


def client_ip(request) -> str:
    """Nginx sets REMOTE_ADDR from trusted Cloudflare peers for the admin host."""
    return str(request.META.get("REMOTE_ADDR", "unknown"))


def _reserve_attempt(request) -> tuple[AdminLoginAttempt | None, str | None]:
    ip_hash = _digest(client_ip(request))
    username = request.POST.get("username", "")
    if not isinstance(username, str):
        username = ""
    account_hash = _digest(username.strip().casefold()[:150])
    now = timezone.now()

    with transaction.atomic():
        if connection.vendor == "postgresql":
            # Serialize checks across Gunicorn workers without a Redis dependency.
            lock_ids = sorted({
                int.from_bytes(bytes.fromhex(value[:16]), "big", signed=True)
                for value in (ip_hash, account_hash)
            })
            with connection.cursor() as cursor:
                for lock_id in lock_ids:
                    cursor.execute("SELECT pg_advisory_xact_lock(%s)", [lock_id])

        recent = AdminLoginAttempt.objects.filter(created_at__gte=now - timedelta(seconds=WINDOW_SECONDS))
        if recent.filter(ip_hash=ip_hash).count() >= IP_LIMIT:
            return None, "ip"
        if recent.filter(account_hash=account_hash).count() >= ACCOUNT_LIMIT:
            return None, "account"
        return AdminLoginAttempt.objects.create(ip_hash=ip_hash, account_hash=account_hash), None


class AdminLoginRateLimitMiddleware(MiddlewareMixin):
    """Reject excess admin POSTs after CSRF validation, before password check."""

    def process_view(self, request, view_func, view_args, view_kwargs):
        from django.conf import settings

        admin_prefix = f"/{settings.DJANGO_ADMIN_PATH.strip('/')}/"
        if request.method != "POST" or request.path != f"{admin_prefix}login/":
            return None

        try:
            attempt, blocked_by = _reserve_attempt(request)
        except DatabaseError:
            logger.exception("Admin login throttle database unavailable")
            return HttpResponse("Đăng nhập quản trị tạm thời không khả dụng.", status=503)

        if blocked_by:
            logger.warning("Admin login blocked dimension=%s ip_hash=%s", blocked_by, _digest(client_ip(request))[:12])
            response = HttpResponse("Quá nhiều lần đăng nhập. Vui lòng thử lại sau ít phút.", status=429)
            response["Retry-After"] = str(WINDOW_SECONDS)
            return response

        request.admin_login_attempt_id = attempt.pk
        return None

    def process_response(self, request, response):
        attempt_id = getattr(request, "admin_login_attempt_id", None)
        if attempt_id and getattr(request.user, "is_authenticated", False) and request.user.is_staff:
            AdminLoginAttempt.objects.filter(pk=attempt_id).delete()
        return response
