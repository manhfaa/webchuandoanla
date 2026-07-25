from rest_framework import serializers

from .models import PaymentOrder
from .services import order_needs_reconciliation


class PaymentOrderCreateSerializer(serializers.Serializer):
    plan = serializers.ChoiceField(choices=("grow", "bloom", "elite"))


class ReconciliationRequestSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, max_length=500)


class PaymentOrderSerializer(serializers.ModelSerializer):
    plan = serializers.CharField(source="plan.slug", read_only=True)
    plan_name = serializers.CharField(source="plan.name", read_only=True)
    remaining_amount = serializers.SerializerMethodField()
    needs_reconciliation = serializers.SerializerMethodField()
    reconciliation = serializers.SerializerMethodField()

    class Meta:
        model = PaymentOrder
        fields = (
            "id",
            "payment_code",
            "plan",
            "plan_name",
            "amount_expected",
            "amount_received",
            "remaining_amount",
            "currency",
            "status",
            "needs_reconciliation",
            "reconciliation",
            "expires_at",
            "paid_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_remaining_amount(self, obj):
        return max(0, obj.amount_expected - obj.amount_received)

    def get_needs_reconciliation(self, obj):
        return order_needs_reconciliation(obj)

    def get_reconciliation(self, obj):
        """Only the timeline of the review — never who handled it internally."""
        record = (obj.metadata or {}).get("reconciliation")
        if not isinstance(record, dict):
            return None
        return {
            "requested_at": record.get("requested_at"),
            "resolved_at": record.get("resolved_at"),
            "action": record.get("action"),
        }
