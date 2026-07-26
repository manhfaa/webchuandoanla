import logging
from urllib.parse import quote

from django.conf import settings
from django.core.mail import EmailMessage

logger = logging.getLogger(__name__)

RESET_SUBJECT = "Đặt lại mật khẩu Agromind AI"


CONSOLE_BACKEND = "django.core.mail.backends.console.EmailBackend"


def delivery_is_configured() -> bool:
    """Whether a reset link can actually reach a user's inbox.

    With no provider configured the message goes to the server log, which is
    invisible to the person who asked for it. Telling the caller lets the UI say
    so instead of promising an email that will never arrive. This is global
    configuration, identical for every address, so it reveals nothing about
    whether any particular account exists.
    """
    return getattr(settings, "EMAIL_BACKEND", CONSOLE_BACKEND) != CONSOLE_BACKEND


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
        # settings.EMAIL_BACKEND is the single authority: SMTP when EMAIL_HOST is
        # configured, console otherwise.
        EmailMessage(
            subject=RESET_SUBJECT,
            body=body,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
            to=[user.email],
        ).send(fail_silently=False)
        return True
    except Exception:
        logger.exception("Không gửi được email đặt lại mật khẩu cho user_id=%s", user.pk)
        return False
