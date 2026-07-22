from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from engagement.models import UserSubscription

User = get_user_model()


class Command(BaseCommand):
    help = "Expire paid plans whose end time has passed."

    @transaction.atomic
    def handle(self, *args, **options):
        now = timezone.now()
        due_user_ids = list(
            User.objects.filter(plan_expires_at__lte=now)
            .exclude(current_plan="seed")
            .values_list("id", flat=True)
        )
        if not due_user_ids:
            self.stdout.write(self.style.SUCCESS("No expired subscriptions found."))
            return

        UserSubscription.objects.filter(
            user_id__in=due_user_ids,
            status__in=("active", "trial"),
        ).update(status="expired", ends_at=now, updated_at=now)
        updated = User.objects.filter(id__in=due_user_ids).update(
            current_plan="seed",
            plan_expires_at=None,
            updated_at=now,
        )
        self.stdout.write(self.style.SUCCESS(f"Expired {updated} user subscription(s)."))
