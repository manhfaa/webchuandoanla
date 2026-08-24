"""Granting and revoking entitlements bought through Google Play.

Kept apart from `services.py`, which is entirely about SePay bank transfers. The
two providers answer the same question — "is this plan paid for?" — but nothing
about *how* they answer it is shared, and merging them would mean every change
to one has to be reasoned about against the other.

What is shared is the outcome: both end with `user.current_plan` and
`plan_expires_at` set, and one active `UserSubscription`. That part is written
once, here, in the same shape `_activate_locked_order` uses.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone as dt_timezone

from django.conf import settings
from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils import timezone

from engagement.models import ServicePlan, UserSubscription

from . import google_play
from .models import PlayPurchase

logger = logging.getLogger(__name__)
User = get_user_model()


class PlayGrantError(RuntimeError):
    pass


def _expiry(payload: dict) -> datetime | None:
    millis = google_play.expiry_millis(payload)
    if millis is None:
        return None
    return datetime.fromtimestamp(millis / 1000, tz=dt_timezone.utc)


def verify_and_grant(*, user, product_id: str, purchase_token: str, package_name: str, client_request_id: str):
    """Ask Google, then grant. Returns the `PlayPurchase` row.

    Deliberately **not** one big transaction:

    * The call to Google can take twenty seconds. Holding a row lock across it
      would serialise every other purchase behind one slow network round trip.
    * A pending purchase has to leave a record behind. Raising from inside a
      transaction would roll that record back, and the next redelivery would
      have no idea it had ever been seen.

    So the network call happens outside any transaction, and only the grant — the
    part that must be all-or-nothing — is atomic. The state is re-read under the
    lock inside it, so two redeliveries racing still grant once.

    Ordering that is not negotiable: Google is asked **before** anything is
    written, and the acknowledgement is sent **after** the plan is granted. A
    purchase acknowledged without an entitlement is money taken for nothing, and
    Google refunds anything unacknowledged after three days — so the gap has to
    close in that direction, never the other.
    """
    existing = PlayPurchase.objects.filter(purchase_token=purchase_token).first()
    if existing and existing.state == PlayPurchase.State.GRANTED:
        # Play redelivers on every app launch until acknowledged. This is that
        # redelivery, not a second purchase.
        return existing

    payload = google_play.fetch_purchase(product_id=product_id, purchase_token=purchase_token)

    if not google_play.is_purchased(payload):
        # Recorded, then refused. A deferred payment (cash at a convenience
        # store) legitimately lands here and may settle hours later; the row is
        # what lets that later notification find its way home.
        _upsert(
            existing,
            user=user,
            product_id=product_id,
            purchase_token=purchase_token,
            package_name=package_name,
            client_request_id=client_request_id,
            plan="",
            state=PlayPurchase.State.PENDING,
            payload=payload,
        )
        raise PlayGrantError("Google chưa xác nhận giao dịch này đã thanh toán xong.")

    plan_slug = google_play.plan_for_product(product_id)
    plan = ServicePlan.objects.filter(slug=plan_slug, is_active=True).first() if plan_slug else None
    if plan is None:
        # The token is real but this deployment has no plan mapped to it. Failing
        # loudly beats granting a guess.
        logger.error("Play product %s is not mapped to an active plan", product_id)
        raise PlayGrantError("Gói tương ứng với giao dịch này chưa được cấu hình.")

    expires_at = _expiry(payload) or (
        timezone.now() + timezone.timedelta(days=max(1, int(getattr(settings, "SEPAY_SUBSCRIPTION_DAYS", 30))))
    )

    with transaction.atomic():
        locked = PlayPurchase.objects.select_for_update().filter(purchase_token=purchase_token).first()
        if locked and locked.state == PlayPurchase.State.GRANTED:
            # Another redelivery won the race while we were talking to Google.
            return locked

        _activate(user=user, plan=plan, expires_at=expires_at, reference=purchase_token[:120])
        record = _upsert(
            locked,
            user=user,
            product_id=product_id,
            purchase_token=purchase_token,
            package_name=package_name,
            client_request_id=client_request_id,
            plan=plan.slug,
            state=PlayPurchase.State.GRANTED,
            payload=payload,
            expires_at=expires_at,
        )

    acknowledged = google_play.acknowledge(
        product_id=product_id,
        purchase_token=purchase_token,
        subscription="expiryTimeMillis" in payload or "subscriptionState" in payload,
    )
    if acknowledged != record.acknowledged:
        record.acknowledged = acknowledged
        record.save(update_fields=["acknowledged", "updated_at"])

    return record


def _upsert(existing, *, user, product_id, purchase_token, package_name, client_request_id, plan, state, payload, expires_at=None):
    fields = {
        "user": user,
        "product_id": product_id,
        "package_name": package_name,
        "client_request_id": client_request_id,
        "plan": plan,
        "state": state,
        "raw_state": payload,
        "expires_at": expires_at,
    }
    if existing:
        for key, value in fields.items():
            setattr(existing, key, value)
        existing.save()
        return existing
    return PlayPurchase.objects.create(purchase_token=purchase_token, **fields)


def _activate(*, user, plan, expires_at, reference):
    """Same end state as a settled SePay order, reached from a Play purchase."""
    now = timezone.now()
    locked_user = User.objects.select_for_update().get(pk=user.pk)

    UserSubscription.objects.select_for_update().filter(
        user=locked_user, status__in=("active", "trial")
    ).update(status="cancelled", ends_at=now, updated_at=now)

    UserSubscription.objects.create(
        user=locked_user,
        plan=plan,
        status="active",
        starts_at=now,
        ends_at=expires_at,
        # Play renews on its own and tells us through RTDN; the app must not
        # try to renew anything itself.
        auto_renew=True,
        payment_provider="google_play",
        provider_subscription_id=reference,
    )

    locked_user.current_plan = plan.slug
    locked_user.plan_expires_at = expires_at
    locked_user.save(update_fields=["current_plan", "plan_expires_at", "updated_at"])


@transaction.atomic
def apply_rtdn(notification: dict) -> str:
    """Handle one real-time developer notification.

    Only lifecycle changes to a purchase we already know about are acted on. A
    notification for an unknown token is ignored rather than used to create an
    entitlement: RTDN is a push channel and the only trustworthy source of what
    a token bought is still the Play Developer API.
    """
    subscription = notification.get("subscriptionNotification") or {}
    token = subscription.get("purchaseToken") or ""
    if not token:
        return "ignored"

    record = PlayPurchase.objects.select_for_update().filter(purchase_token=token).first()
    if record is None:
        return "unknown"

    notification_type = int(subscription.get("notificationType", 0))
    # 3 CANCELED, 12 REVOKED, 13 EXPIRED — the three that end an entitlement.
    if notification_type in (3, 12, 13):
        record.state = (
            PlayPurchase.State.REFUNDED if notification_type == 12 else PlayPurchase.State.EXPIRED
        )
        record.save(update_fields=["state", "updated_at"])

        if record.user_id:
            now = timezone.now()
            UserSubscription.objects.filter(
                user_id=record.user_id, provider_subscription_id=token[:120], status__in=("active", "trial")
            ).update(status="expired", ends_at=now, updated_at=now)
            User.objects.filter(pk=record.user_id).update(
                current_plan="seed", plan_expires_at=None, updated_at=now
            )
        return "revoked"

    # 2 RENEWED, 4 PURCHASED, 7 RESTARTED — re-verify rather than trust the push.
    if notification_type in (2, 4, 7) and record.user_id:
        try:
            payload = google_play.fetch_purchase(
                product_id=record.product_id, purchase_token=token
            )
        except (google_play.PlayNotConfigured, google_play.PlayVerificationFailed):
            return "deferred"

        if google_play.is_purchased(payload):
            expires_at = _expiry(payload)
            plan = ServicePlan.objects.filter(slug=record.plan, is_active=True).first()
            if plan and expires_at:
                _activate(
                    user=User.objects.get(pk=record.user_id),
                    plan=plan,
                    expires_at=expires_at,
                    reference=token[:120],
                )
                record.expires_at = expires_at
                record.state = PlayPurchase.State.GRANTED
                record.raw_state = payload
                record.save(update_fields=["expires_at", "state", "raw_state", "updated_at"])
                return "renewed"
    return "noop"
