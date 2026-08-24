"""Replay protection for the POSTs that cost money or quota.

Used by the leaf check, the symptom research run and the chat answer. Each one
spends something the grower cannot get back — an inference call, two Tavily
searches, a question off the daily cap — so a retry after a dropped connection
must return the first answer rather than buy a second one.

The client supplies the id. It is deliberately not derived from the request body:
two genuinely different leaf checks of the same leaf are two checks, and the app
already stores a UUID with the draft it is retrying.
"""

from __future__ import annotations

import re
from datetime import timedelta
from typing import Any

from django.conf import settings
from django.db import IntegrityError
from django.utils import timezone

from .models import ClientRequest

MAX_LENGTH = 64
# UUIDs, ULIDs and the like. Anything else is rejected rather than truncated, so
# a client that sends a whole sentence learns it is wrong instead of silently
# sharing one bucket with every other malformed id.
_ALLOWED = re.compile(r"^[A-Za-z0-9._:-]{8,64}$")


class InvalidRequestId(ValueError):
    pass


def normalize(raw: Any, *, required: bool = False) -> str:
    value = str(raw or "").strip()
    if not value:
        if required:
            raise InvalidRequestId("client_request_id là bắt buộc cho yêu cầu này.")
        return ""
    if not _ALLOWED.match(value):
        raise InvalidRequestId("client_request_id phải là chuỗi 8-64 ký tự chữ, số, '.', '_', ':' hoặc '-'.")
    return value


def _cutoff():
    hours = int(getattr(settings, "CLIENT_REQUEST_TTL_HOURS", 48))
    return timezone.now() - timedelta(hours=hours)


def recall(user, scope: str, request_id: str) -> dict[str, Any] | None:
    """The answer already given for this id, or None."""
    if not request_id:
        return None
    row = ClientRequest.objects.filter(
        user=user,
        scope=scope,
        client_request_id=request_id,
        created_at__gte=_cutoff(),
    ).first()
    return row.response if row else None


def remember(user, scope: str, request_id: str, response: dict[str, Any]) -> None:
    """Store the answer. A concurrent duplicate is not an error — it is the point."""
    if not request_id:
        return
    try:
        ClientRequest.objects.update_or_create(
            user=user,
            scope=scope,
            client_request_id=request_id,
            defaults={"response": response},
        )
    except IntegrityError:
        # Two copies of the same retry raced. Whichever landed first is the
        # answer; both callers return the same body either way.
        pass


def prune(now=None) -> int:
    """Delete expired rows. Called by ``core.housekeeping``."""
    hours = int(getattr(settings, "CLIENT_REQUEST_TTL_HOURS", 48))
    cutoff = (now or timezone.now()) - timedelta(hours=hours)
    deleted, _ = ClientRequest.objects.filter(created_at__lt=cutoff).delete()
    return deleted
