"""Send mail over HTTPS instead of SMTP.

Render's instances cannot open outbound SMTP connections: every attempt to reach
smtp.gmail.com:587 from a deployed service hangs until EMAIL_TIMEOUT expires,
while the same host answers in under a second from a laptop. That rules out
every SMTP provider, not just Gmail.

Brevo also exposes a plain HTTPS endpoint, which reaches the same place the app
already reaches for weather and inference. Implementing it as a Django email
backend keeps settings.EMAIL_BACKEND the single authority, so users/emails.py
carries on calling EmailMessage.send() and never learns which transport ran.
"""

from email.utils import parseaddr

import requests
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email"


class BrevoAPIBackend(BaseEmailBackend):
    """Deliver through Brevo's transactional HTTP API."""

    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.api_key = (getattr(settings, "BREVO_API_KEY", "") or "").strip()
        # A stalled provider must not hold a worker: the free tier runs one.
        self.timeout = int(getattr(settings, "EMAIL_TIMEOUT", 10) or 10)

    def send_messages(self, email_messages):
        if not email_messages:
            return 0
        if not self.api_key:
            if self.fail_silently:
                return 0
            raise ValueError("BREVO_API_KEY is not configured.")

        sent = 0
        for message in email_messages:
            if self._send(message):
                sent += 1
        return sent

    def _payload(self, message):
        sender_name, sender_email = parseaddr(
            message.from_email or getattr(settings, "DEFAULT_FROM_EMAIL", "")
        )
        if not sender_email:
            raise ValueError("No sender address; set DEFAULT_FROM_EMAIL.")

        recipients = [
            {"email": address}
            for address in (parseaddr(entry)[1] for entry in message.to)
            if address
        ]
        payload = {
            "sender": {"email": sender_email},
            "to": recipients,
            "subject": message.subject,
            # The reset mail is plain text; Brevo wants at least one body field.
            "textContent": message.body,
        }
        if sender_name:
            payload["sender"]["name"] = sender_name
        if message.cc:
            payload["cc"] = [{"email": parseaddr(entry)[1]} for entry in message.cc]
        if message.bcc:
            payload["bcc"] = [{"email": parseaddr(entry)[1]} for entry in message.bcc]
        reply_to = getattr(message, "reply_to", None)
        if reply_to:
            payload["replyTo"] = {"email": parseaddr(reply_to[0])[1]}
        return payload

    def _send(self, message):
        try:
            payload = self._payload(message)
            if not payload["to"]:
                return False
            response = requests.post(
                BREVO_ENDPOINT,
                json=payload,
                headers={"api-key": self.api_key, "accept": "application/json"},
                timeout=self.timeout,
            )
            response.raise_for_status()
            return True
        except Exception:
            if not self.fail_silently:
                raise
            return False
