import logging
from urllib.parse import quote

from django.conf import settings
from django.core.mail import EmailMessage, get_connection

logger = logging.getLogger(__name__)

RESET_SUBJECT = "Đặt lại mật khẩu Agromind AI"


def _has_smtp_provider() -> bool:
    """Django defaults EMAIL_HOST to 'localhost', where nothing is listening.

    Sending through that raises ConnectionRefusedError and would turn a reset
    request into a 500, so treat "no host configured" as "no provider".
    """
    host = (getattr(settings, "EMAIL_HOST", "") or "").strip()
    return bool(host) and host != "localhost"


def _connection():
    if _has_smtp_provider():
        return get_connection()
    # Nothing is configured yet: print the message to the server console so the
    # flow stays exercisable in development instead of failing silently.
    return get_connection("django.core.mail.backends.console.EmailBackend")


def build_password_reset_url(raw_token: str) -> str:
    base = (getattr(settings, "FRONTEND_ORIGIN", "") or "").rstrip("/")
    return f"{base}/reset-password?token={quote(raw_token, safe='')}"


def send_password_reset_email(user, raw_token: str) -> bool:
    """Best-effort delivery of the reset link.

    Never raises: the caller must answer identically whether or not the address
    exists, and a mail outage must not tell an attacker that it did.
    """
    reset_url = build_password_reset_url(raw_token)
    body = (
        f"Xin chào {user.full_name or user.username},\n\n"
        "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Agromind AI của bạn.\n"
        f"Nhấn vào liên kết sau để tạo mật khẩu mới (liên kết có hiệu lực trong 2 giờ):\n\n"
        f"{reset_url}\n\n"
        "Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này — mật khẩu hiện tại "
        "của bạn vẫn giữ nguyên.\n\n"
        "Agromind AI\n"
    )

    try:
        EmailMessage(
            subject=RESET_SUBJECT,
            body=body,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
            to=[user.email],
            connection=_connection(),
        ).send(fail_silently=False)
        return True
    except Exception:
        logger.exception("Không gửi được email đặt lại mật khẩu cho user_id=%s", user.pk)
        return False
