"""Everything that has to happen on a clock rather than on a request.

Several pieces of state in this project only ever get corrected lazily, when
some user action happens to touch them:

* a lapsed paid plan keeps saying "bloom" in the database until that user loads
  their profile — so an admin looking at the table sees the wrong plan, and any
  report built off it is wrong;
* a payment order past its TTL stays "pending" until someone opens it, so the
  pending count grows forever;
* password-reset tokens, blacklisted refresh tokens and expired sessions are
  never removed at all.

None of that breaks a request, which is exactly why it goes unnoticed. This runs
the whole set in one pass, is safe to run repeatedly, and reports what it did so
a scheduled run leaves evidence rather than silence.
"""

from django.core.management import call_command
from django.utils import timezone


def run_housekeeping(*, stdout=None) -> dict[str, int]:
    """Run every scheduled chore and return a count per chore.

    Imports live inside the function so the module stays importable from a view
    without pulling app models in at settings-load time.
    """
    from django.contrib.auth import get_user_model
    from engagement.models import UserSubscription
    from payments.models import PaymentOrder
    from payments.services import OPEN_ORDER_STATUSES
    from users.models import PasswordResetToken

    now = timezone.now()
    User = get_user_model()
    report: dict[str, int] = {}

    # 1. Lapsed plans. expire_user_plan() already does this per user on read;
    #    this is the same rule applied to everyone who is due.
    due_ids = list(
        User.objects.filter(plan_expires_at__lte=now)
        .exclude(current_plan="seed")
        .values_list("id", flat=True)
    )
    if due_ids:
        UserSubscription.objects.filter(
            user_id__in=due_ids, status__in=("active", "trial")
        ).update(status="expired", ends_at=now, updated_at=now)
        User.objects.filter(id__in=due_ids).update(
            current_plan="seed", plan_expires_at=None, updated_at=now
        )
    report["plans_expired"] = len(due_ids)

    # 2. Payment orders past their TTL. Only ever open ones: an order that
    #    received money is somebody's problem to reconcile, not ours to close.
    report["orders_expired"] = PaymentOrder.objects.filter(
        status__in=OPEN_ORDER_STATUSES, expires_at__lte=now
    ).update(status=PaymentOrder.Status.EXPIRED, updated_at=now)

    # 3. Reset tokens that can no longer be used. Only the hash is stored, but a
    #    dead row is still a row, and the table only grows.
    report["reset_tokens_pruned"] = PasswordResetToken.objects.filter(
        expires_at__lte=now
    ).delete()[0]

    # 4. Rotation blacklists every refresh token it replaces, so this table grows
    #    with every login. The command only removes already-expired entries.
    try:
        call_command("flushexpiredtokens", verbosity=0)
        report["jwt_blacklist_flushed"] = 1
    except Exception:
        # Only present when token_blacklist is installed; never worth failing over.
        report["jwt_blacklist_flushed"] = 0

    call_command("clearsessions", verbosity=0)
    report["sessions_cleared"] = 1

    if stdout is not None:
        for key, value in report.items():
            stdout.write(f"{key}: {value}")
    return report
