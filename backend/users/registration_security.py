import hashlib
import hmac
import ipaddress
import logging
import re
from datetime import timedelta
from urllib.parse import urlparse

import requests
from django.conf import settings
from django.core.mail import send_mail
from django.db import connection, transaction
from django.utils import timezone
from rest_framework.exceptions import APIException, Throttled, ValidationError

from .models import RegistrationAttempt

logger = logging.getLogger("agromind.security.registration")
SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


class RegistrationUnavailable(APIException):
    status_code = 503
    default_detail = "Đăng ký tạm thời chưa khả dụng. Vui lòng thử lại sau."


def verify_turnstile(token: str) -> None:
    secret = getattr(settings, "TURNSTILE_SECRET_KEY", "")
    if not secret:
        logger.error("Turnstile secret is not configured; registration denied")
        raise RegistrationUnavailable()
    if not isinstance(token, str) or not token or len(token) > 2048:
        raise ValidationError({"turnstile_token": "Vui lòng hoàn tất bước xác minh an toàn."})
    try:
        response = requests.post(
            SITEVERIFY_URL,
            data={"secret": secret, "response": token},
            timeout=5,
        )
        response.raise_for_status()
        result = response.json()
    except (requests.RequestException, ValueError):
        logger.exception("Turnstile Siteverify unavailable")
        raise RegistrationUnavailable() from None
    expected_host = urlparse(getattr(settings, "FRONTEND_ORIGIN", "")).hostname
    if not isinstance(result, dict) or not (
        result.get("success") is True
        and result.get("action") == "register"
        and result.get("hostname") == expected_host
    ):
        codes = result.get("error-codes", []) if isinstance(result, dict) else []
        logger.warning("Turnstile registration rejected: codes=%s", codes)
        raise ValidationError({"turnstile_token": "Xác minh không hợp lệ hoặc đã hết hạn. Vui lòng thử lại."})


def _digest(value: str) -> str:
    return hmac.new(settings.SECRET_KEY.encode(), value.encode(), hashlib.sha256).hexdigest()


def _client_ip(request) -> str:
    # Never trust a caller-supplied X-Forwarded-For. Next.js can sign the IP
    # Vercel observed, but behind Cloudflare that may be a shared proxy IP.
    forwarded = request.META.get("HTTP_X_AGROMIND_CLIENT_IP", "")
    signature = request.META.get("HTTP_X_AGROMIND_IP_SIGNATURE", "")
    proxy_secret = getattr(settings, "REGISTRATION_PROXY_SECRET", "")
    if proxy_secret and forwarded and signature:
        expected = hmac.new(proxy_secret.encode(), forwarded.encode(), hashlib.sha256).hexdigest()
        if hmac.compare_digest(signature, expected):
            try:
                return str(ipaddress.ip_address(forwarded))
            except ValueError:
                pass
    return str(request.META.get("REMOTE_ADDR", "unknown"))


def _email_pattern(email: str) -> str:
    local, _, domain = email.lower().partition("@")
    local = local.split("+", 1)[0]
    # Random numeric suffixes (for example bot_123456@gmail.com) collapse to
    # one pattern without persisting the raw email address.
    local = re.sub(r"\d+", "#", local)
    return f"{local}@{domain}"


def registration_fingerprints(request, email: str) -> dict[str, str]:
    agent = request.META.get("HTTP_USER_AGENT", "")[:512]
    return {
        "ip_hash": _digest(_client_ip(request)),
        "agent_hash": _digest(agent),
        "email_pattern_hash": _digest(_email_pattern(email)),
    }


def reserve_registration(request, email: str) -> RegistrationAttempt:
    fingerprint = registration_fingerprints(request, email)
    blocked = None
    with transaction.atomic():
        if connection.vendor == "postgresql":
            # Serialize reservations for the same fingerprints across Gunicorn
            # workers. The locks are short-lived and ordered to avoid deadlocks.
            lock_ids = sorted(
                int.from_bytes(bytes.fromhex(value[:16]), "big", signed=True)
                for value in fingerprint.values()
            )
            with connection.cursor() as cursor:
                for lock_id in lock_ids:
                    cursor.execute("SELECT pg_advisory_xact_lock(%s)", [lock_id])

        recent = RegistrationAttempt.objects.filter(created_at__gte=timezone.now() - timedelta(hours=1))
        # A shared IP or browser user-agent alone is weak evidence. Failed
        # challenges count against IP, not against another user's email pattern.
        limits = (("email_pattern_hash", 5), ("ip_hash", settings.REGISTRATION_IP_HOURLY_LIMIT), ("agent_hash", 60))
        for field, limit in limits:
            if limit <= 0:
                continue
            subset = recent.filter(**{field: fingerprint[field]})
            if field != "ip_hash":
                subset = subset.filter(outcome__in=("reserved", "pending", "resend", "google"))
            count = subset.count()
            if count >= limit:
                first_block = not recent.filter(**{field: fingerprint[field]}, outcome="blocked").exists()
                RegistrationAttempt.objects.create(**fingerprint, outcome="blocked")
                blocked = (field, count, fingerprint[field][:12], first_block)
                break
        if blocked is None:
            return RegistrationAttempt.objects.create(**fingerprint, outcome="reserved")

    field, count, fingerprint_prefix, first_block = blocked
    logger.warning("Registration abuse blocked dimension=%s count=%s fingerprint=%s", field, count, fingerprint_prefix)
    alert_email = getattr(settings, "REGISTRATION_ALERT_EMAIL", "")
    if first_block and alert_email:
        try:
            send_mail(
                "Agromind AI: phát hiện đăng ký bất thường",
                f"Đã chặn đăng ký theo {field}; {count} lượt trong 1 giờ. Mã dấu hiệu: {fingerprint_prefix}. Xem log máy chủ để điều tra.",
                settings.DEFAULT_FROM_EMAIL,
                [alert_email],
                fail_silently=False,
            )
        except Exception:
            logger.exception("Could not deliver registration abuse alert")
    raise Throttled(detail="Quá nhiều lượt đăng ký tương tự. Vui lòng thử lại sau.")


def finish_registration(attempt: RegistrationAttempt, outcome: str) -> None:
    RegistrationAttempt.objects.filter(pk=attempt.pk).update(outcome=outcome)
