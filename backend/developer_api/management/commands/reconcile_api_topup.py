"""Manually settle a top-up already recorded by the authenticated webhook."""

from uuid import UUID

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from developer_api.models import ApiTopUpOrder
from developer_api.topups import reconcile_topup


class Command(BaseCommand):
    help = "Credit a reviewed API top-up after checking its bank transfers."

    def add_arguments(self, parser):
        parser.add_argument("--order", required=True, help="Top-up order UUID")
        parser.add_argument("--confirm-order", required=True, help="Repeat the order UUID to confirm")
        parser.add_argument("--actor-id", required=True, type=int, help="Active superuser ID for the audit record")
        parser.add_argument("--amount-vnd", required=True, type=int, help="Exact total received, in VND")
        parser.add_argument("--note", required=True, help="Reason for reconciliation; do not include secrets")

    def handle(self, *args, **options):
        try:
            order_id = UUID(options["order"])
            confirmation = UUID(options["confirm_order"])
        except ValueError as exc:
            raise CommandError("Invalid order UUID.") from exc
        if order_id != confirmation:
            raise CommandError("Confirmation does not match the order.")
        actor = get_user_model().objects.filter(pk=options["actor_id"]).first()
        try:
            order = reconcile_topup(order_id=order_id, actor=actor, amount_vnd=options["amount_vnd"], note=options["note"])
        except (ApiTopUpOrder.DoesNotExist, ValueError, PermissionError) as exc:
            raise CommandError("Reconciliation rejected: " + str(exc)) from exc
        self.stdout.write(self.style.SUCCESS(f"Order {order.pk}: verified received total {options['amount_vnd']} VND; credited the previously uncredited amount."))
