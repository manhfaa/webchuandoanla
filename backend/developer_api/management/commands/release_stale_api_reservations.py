"""Recover abandoned developer API reservations after worker termination."""

from django.core.management.base import BaseCommand, CommandError
from django.db import connection

from developer_api.wallets import release_stale_reservations


class Command(BaseCommand):
    help = "Release API reservations older than ten minutes in bounded batches."

    def handle(self, *args, **options):
        if connection.vendor != "postgresql":
            raise CommandError("Reservation recovery requires PostgreSQL.")
        count = release_stale_reservations()
        self.stdout.write(f"Released {count} stale reservations.")
