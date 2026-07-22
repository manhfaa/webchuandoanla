from rest_framework import serializers

from .models import PaymentOrder


class PaymentOrderCreateSerializer(serializers.Serializer):
    plan = serializers.ChoiceField(choices=("grow", "bloom", "elite"))


class PaymentOrderSerializer(serializers.ModelSerializer):
    plan = serializers.CharField(source="plan.slug", read_only=True)
    plan_name = serializers.CharField(source="plan.name", read_only=True)
    remaining_amount = serializers.SerializerMethodField()

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
            "expires_at",
            "paid_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_remaining_amount(self, obj):
        return max(0, obj.amount_expected - obj.amount_received)
