"""Google Play purchase verification.

The rule this module exists to enforce: **an entitlement is granted from what
Google says was bought, never from what the app said it bought.** The client
sends only a purchase token; the plan, the product and the expiry all come back
from the Play Developer API. A client that could name its own plan could name
"elite".

Implemented directly against the Play Developer REST API with `google-auth`,
which is already a dependency (the Google sign-in path uses it). That avoids
pulling in `google-api-python-client` for two endpoints.

Not configured means not available: with no service-account file, every call
raises `PlayNotConfigured` (503) and `/api/mobile/config/` reports
`play_billing: false`, so the Play build hides its purchase CTA rather than
offering a bank transfer Play policy does not permit.
"""

from __future__ import annotations

import logging
from typing import Any

from django.conf import settings

logger = logging.getLogger(__name__)

SCOPE = "https://www.googleapis.com/auth/androidpublisher"
BASE = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications"

# Google's own vocabulary, kept verbatim so a reader can match it against the
# Play documentation instead of against our paraphrase.
PURCHASE_STATE_PURCHASED = 0
PURCHASE_STATE_CANCELLED = 1
PURCHASE_STATE_PENDING = 2


class PlayNotConfigured(RuntimeError):
    """No service account on this deployment. Maps to 503."""


class PlayVerificationFailed(RuntimeError):
    """Google was reached and did not confirm the purchase. Maps to 402/400."""


def is_configured() -> bool:
    return bool(
        getattr(settings, "GOOGLE_PLAY_SERVICE_ACCOUNT_FILE", "").strip()
        and getattr(settings, "GOOGLE_PLAY_PACKAGE_NAME", "").strip()
    )


def product_catalogue() -> list[dict[str, str]]:
    """Plan slug → Play product, from settings.

    Deliberately a mapping the operator configures rather than something derived
    from the plan slug: the Play console product ids are chosen there and cannot
    be renamed once published, so guessing them would break silently.
    """
    raw = getattr(settings, "GOOGLE_PLAY_PRODUCTS", {}) or {}
    return [
        {"plan": plan, "product_id": str(value.get("product_id", "")), "base_plan_id": str(value.get("base_plan_id", ""))}
        for plan, value in raw.items()
        if isinstance(value, dict)
    ]


def plan_for_product(product_id: str) -> str:
    for entry in product_catalogue():
        if entry["product_id"] == product_id:
            return entry["plan"]
    return ""


def _session():
    try:
        from google.auth.transport.requests import AuthorizedSession
        from google.oauth2 import service_account
    except ImportError as exc:  # pragma: no cover - google-auth is pinned
        raise PlayNotConfigured("Thiếu thư viện xác minh Google Play.") from exc

    path = getattr(settings, "GOOGLE_PLAY_SERVICE_ACCOUNT_FILE", "").strip()
    if not path:
        raise PlayNotConfigured("Google Play chưa được cấu hình trên máy chủ.")

    credentials = service_account.Credentials.from_service_account_file(path, scopes=[SCOPE])
    return AuthorizedSession(credentials)


def fetch_purchase(*, product_id: str, purchase_token: str) -> dict[str, Any]:
    """Ask Google what this token actually bought.

    Subscriptions and one-time products live on different endpoints. The
    subscription one is tried first because that is what the plans are sold as;
    a 404 there means the token belongs to a one-time product.
    """
    if not is_configured():
        raise PlayNotConfigured("Google Play chưa được cấu hình trên máy chủ.")

    package = getattr(settings, "GOOGLE_PLAY_PACKAGE_NAME", "").strip()
    session = _session()

    subscription_url = f"{BASE}/{package}/purchases/subscriptions/{product_id}/tokens/{purchase_token}"
    response = session.get(subscription_url, timeout=20)
    if response.status_code == 404:
        product_url = f"{BASE}/{package}/purchases/products/{product_id}/tokens/{purchase_token}"
        response = session.get(product_url, timeout=20)

    if response.status_code == 404:
        raise PlayVerificationFailed("Google không tìm thấy giao dịch này.")
    if not response.ok:
        # Google's body can echo the token; only the status is safe to log.
        logger.error("Play verification failed with status %s", response.status_code)
        raise PlayVerificationFailed("Chưa xác minh được giao dịch với Google Play.")

    try:
        return response.json()
    except ValueError as exc:
        raise PlayVerificationFailed("Google Play trả về dữ liệu không đọc được.") from exc


def is_purchased(payload: dict[str, Any]) -> bool:
    """True only for a purchase Google considers complete and paid.

    A `pending` purchase (deferred payment, cash at a convenience store) is
    explicitly not enough: the money has not arrived, and granting on it would
    hand out plans for transactions that may never settle.
    """
    if "purchaseState" in payload:
        return int(payload.get("purchaseState", -1)) == PURCHASE_STATE_PURCHASED
    # Subscription v2-style payload.
    state = str(payload.get("subscriptionState", ""))
    return state in ("SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD")


def expiry_millis(payload: dict[str, Any]) -> int | None:
    raw = payload.get("expiryTimeMillis") or payload.get("expiryTime")
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


def acknowledge(*, product_id: str, purchase_token: str, subscription: bool) -> bool:
    """Tell Google the entitlement was delivered.

    Done **from the server**, after the plan is actually granted. Acknowledging
    from the app would mean a purchase could be acknowledged without the
    entitlement ever being written — and Google refunds anything unacknowledged
    after three days, so that gap is a real refund the grower did not ask for.
    """
    if not is_configured():
        return False

    package = getattr(settings, "GOOGLE_PLAY_PACKAGE_NAME", "").strip()
    kind = "subscriptions" if subscription else "products"
    url = f"{BASE}/{package}/purchases/{kind}/{product_id}/tokens/{purchase_token}:acknowledge"

    response = _session().post(url, json={}, timeout=20)
    # 400 with "already acknowledged" is a success from where we stand.
    return response.ok or response.status_code == 400
