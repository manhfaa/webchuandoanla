"""Thin wrapper so the scheduled chores can also be run by hand.

The work itself lives in core.housekeeping because a view calls it too, and a
management command is not importable from one.
"""

from django.core.management.base import BaseCommand

from core.housekeeping import run_housekeeping


class Command(BaseCommand):
    help = "Expire lapsed plans and stale orders, then prune dead tokens and sessions."

    def handle(self, *args, **options):
        run_housekeeping(stdout=self.stdout)
        self.stdout.write(self.style.SUCCESS("Housekeeping finished."))
