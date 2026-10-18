import logging
from urllib.parse import quote

from django.conf import settings
from django.core.mail import EmailMessage

logger = logging.getLogger(__name__)

RESET_SUBJECT = "Đặt lại mật khẩu Agromind AI"
VERIFY_SUBJECT = "Xác minh email Agromind AI"


CONSOLE_BACKEND = "django.core.mail.backends.console.EmailBackend"
DUMMY_BACKEND = "django.core.mail.backends.dummy.EmailBackend"


def delivery_is_configured() -> bool:
    """Whether a reset link can actually reach a user's inbox.

    Console mail is only for local development; production discards mail if no
    provider is configured. This is global configuration, so it reveals nothing
    about whether any particular account exists.
    """
    return getattr(settings, "EMAIL_BACKEND", CONSOLE_BACKEND) not in {CONSOLE_BACKEND, DUMMY_BACKEND}


def build_password_reset_url(raw_token: str) -> str:
    base = (getattr(settings, "FRONTEND_ORIGIN", "") or "").rstrip("/")
    return f"{base}/reset-password?token={quote(raw_token, safe='')}"


def send_verification_email(user, raw_token: str) -> bool:
    base = (getattr(settings, "FRONTEND_ORIGIN", "") or "").rstrip("/")
    url = f"{base}/verify-email?token={quote(raw_token, safe='')}"
    body = (
        f"Xin chào {user.full_name or user.username},\n\n"
        "Vui lòng xác minh email để kích hoạt tài khoản Agromind AI. "
        "Liên kết có hiệu lực trong 24 giờ:\n\n"
        f"{url}\n\n"
        "Nếu bạn không đăng ký, hãy bỏ qua email này.\n\nAgromind AI\n"
    )
    try:
        EmailMessage(
            subject=VERIFY_SUBJECT,
            body=body,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
            to=[user.email],
        ).send(fail_silently=False)
        return True
    except Exception:
        logger.exception("Không gửi được email xác minh cho user_id=%s", user.pk)
        return False


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
