"""Report accounts that share an email address.

The unique_user_email_ci constraint (users/models.py) is case-insensitive and
skips blank emails. Run this BEFORE deploying that migration: if any duplicates
exist the migration will fail and the deploy will roll back, so they have to be
resolved first.

    python manage.py check_duplicate_emails

Exit code 0 means the database is ready for the constraint; 1 means duplicates
were found and are listed below.
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db.models import Count
from django.db.models.functions import Lower


class Command(BaseCommand):
    help = "List accounts sharing an email address (case-insensitive), ignoring blank emails."

    def handle(self, *args, **options):
        user_model = get_user_model()

        duplicates = (
            user_model.objects.exclude(email="")
            .annotate(normalized_email=Lower("email"))
            .values("normalized_email")
            .annotate(total=Count("id"))
            .filter(total__gt=1)
            .order_by("-total")
        )

        total_users = user_model.objects.count()
        duplicate_groups = list(duplicates)

        if not duplicate_groups:
            self.stdout.write(
                self.style.SUCCESS(
                    f"OK: {total_users} accounts, no duplicate emails. "
                    "Safe to apply the unique_user_email_ci constraint."
                )
            )
            return

        self.stdout.write(
            self.style.ERROR(
                f"Found {len(duplicate_groups)} email(s) used by more than one account. "
                "Resolve these before deploying the constraint migration:"
            )
        )
        for group in duplicate_groups:
            accounts = (
                user_model.objects.annotate(normalized_email=Lower("email"))
                .filter(normalized_email=group["normalized_email"])
                .order_by("date_joined")
                .values_list("id", "username", "date_joined", "is_active")
            )
            self.stdout.write(f"\n  {group['normalized_email']} — {group['total']} accounts:")
            for account_id, username, joined, is_active in accounts:
                state = "active" if is_active else "inactive"
                self.stdout.write(f"    id={account_id} username={username} joined={joined:%Y-%m-%d} ({state})")

        raise SystemExit(1)
