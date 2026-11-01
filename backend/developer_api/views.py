from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import connection, transaction
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from payments.services import PaymentConfigurationError, build_qr_url, ensure_payment_configuration
from .models import ApiTopUpOrder, ApiWallet, DeveloperAPIKey, DeveloperOrganization
from .topups import MAX_TOPUP_VND, MIN_TOPUP_VND, create_topup_order


class NameSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150, trim_whitespace=True, allow_blank=False)


class KeyCreateSerializer(NameSerializer):
    environment = serializers.ChoiceField(choices=DeveloperAPIKey.Environment.choices, default=DeveloperAPIKey.Environment.TEST)


def key_data(key):
    return {"id": key.pk, "name": key.name, "prefix": key.prefix, "environment": key.environment,
            "created_at": key.created_at, "expires_at": key.expires_at, "revoked_at": key.revoked_at}


class DeveloperView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        if not getattr(settings, "DEVELOPER_API_ENABLED", False):
            raise Http404
        return super().initial(request, *args, **kwargs)

    def organization(self, request, organization_id):
        return get_object_or_404(DeveloperOrganization, pk=organization_id, owner=request.user, active=True)


class OrganizationView(DeveloperView):
    def get(self, request):
        rows = DeveloperOrganization.objects.filter(owner=request.user, active=True).order_by("id")
        return Response([{"id": row.pk, "name": row.name} for row in rows])

    @transaction.atomic
    def post(self, request):
        serializer = NameSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        get_user_model().objects.select_for_update().get(pk=request.user.pk)
        if DeveloperOrganization.objects.filter(owner=request.user, active=True).count() >= 5:
            return Response({"detail": "Organization limit reached."}, status=status.HTTP_400_BAD_REQUEST)
        org = DeveloperOrganization.objects.create(owner=request.user, **serializer.validated_data)
        return Response({"id": org.pk, "name": org.name}, status=status.HTTP_201_CREATED)


class KeyListCreateView(DeveloperView):
    def get(self, request, organization_id):
        org = self.organization(request, organization_id)
        return Response([key_data(key) for key in org.api_keys.order_by("-created_at")])

    @transaction.atomic
    def post(self, request, organization_id):
        serializer = KeyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        environment = serializer.validated_data["environment"]
        if environment == DeveloperAPIKey.Environment.LIVE and not getattr(settings, "DEVELOPER_LIVE_ENABLED", False):
            return Response({"detail": "Live API is not available."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        org = get_object_or_404(DeveloperOrganization.objects.select_for_update(), pk=organization_id, owner=request.user, active=True)
        if org.api_keys.filter(revoked_at__isnull=True).count() >= 10:
            return Response({"detail": "Active key limit reached."}, status=status.HTTP_400_BAD_REQUEST)
        key, token = DeveloperAPIKey.issue(organization=org, name=serializer.validated_data["name"], environment=environment)
        response = Response({**key_data(key), "secret": token}, status=status.HTTP_201_CREATED)
        response["Cache-Control"] = "no-store"
        return response


class KeyRevokeView(DeveloperView):
    def post(self, request, organization_id, key_id):
        org = self.organization(request, organization_id)
        key = get_object_or_404(DeveloperAPIKey, pk=key_id, organization=org)
        DeveloperAPIKey.objects.filter(pk=key.pk, revoked_at__isnull=True).update(revoked_at=timezone.now())
        key.refresh_from_db()
        return Response(key_data(key))


class WalletView(DeveloperView):
    def get(self, request, organization_id, environment):
        org = self.organization(request, organization_id)
        if environment not in DeveloperAPIKey.Environment.values:
            raise Http404
        wallet = ApiWallet.objects.filter(organization=org, environment=environment).first()
        response = Response({
            "environment": environment,
            "available_vnd": wallet.available_vnd if wallet else 0,
            "reserved_vnd": wallet.reserved_vnd if wallet else 0,
        })
        response["Cache-Control"] = "no-store"
        return response


class WalletLedgerView(DeveloperView):
    def get(self, request, organization_id, environment):
        org = self.organization(request, organization_id)
        if environment not in DeveloperAPIKey.Environment.values:
            raise Http404
        cursor = request.query_params.get("before")
        if cursor is not None and (not cursor.isascii() or not cursor.isdecimal() or len(cursor) > 19 or not 1 <= int(cursor) <= 2**63 - 1):
            return Response({"detail": "Invalid cursor."}, status=status.HTTP_400_BAD_REQUEST)
        wallet = ApiWallet.objects.filter(organization=org, environment=environment).first()
        entries = wallet.entries.order_by("-id") if wallet else None
        if entries is not None and cursor is not None:
            entries = entries.filter(id__lt=int(cursor))
        rows = list(entries[:51]) if entries is not None else []
        page = rows[:50]
        response = Response({
            "results": [{"id": entry.pk, "kind": entry.kind, "amount_vnd": entry.amount_vnd,
                         "created_at": entry.created_at} for entry in page],
            "next_before": page[-1].pk if len(rows) > 50 else None,
        })
        response["Cache-Control"] = "no-store"
        return response


class TopUpAmountSerializer(serializers.Serializer):
    amount_vnd = serializers.IntegerField(min_value=MIN_TOPUP_VND, max_value=MAX_TOPUP_VND)


def topup_data(order):
    return {"id": order.pk, "payment_code": order.payment_code, "amount_vnd": order.amount_expected_vnd,
            "received_vnd": order.amount_received_vnd, "status": order.status, "expires_at": order.expires_at}


class TopUpView(DeveloperView):
    throttle_classes = [ScopedRateThrottle]

    def initial(self, request, *args, **kwargs):
        if not getattr(settings, "DEVELOPER_TOPUP_ENABLED", False):
            raise Http404
        return super().initial(request, *args, **kwargs)


class TopUpCreateView(TopUpView):
    throttle_scope = "payment_orders"

    def get(self, request, organization_id):
        org = self.organization(request, organization_id)
        orders = ApiTopUpOrder.objects.filter(wallet__organization=org).order_by("-created_at")[:20]
        result = []
        for order in orders:
            data = topup_data(order)
            if order.status == ApiTopUpOrder.Status.PENDING and order.expires_at > timezone.now():
                try:
                    data["qr_url"] = build_qr_url(order)
                except PaymentConfigurationError:
                    pass
            result.append(data)
        response = Response(result)
        response["Cache-Control"] = "no-store"
        return response

    @transaction.atomic
    def post(self, request, organization_id):
        serializer = TopUpAmountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not (getattr(settings, "DEVELOPER_LIVE_ENABLED", False) and getattr(settings, "DEVELOPER_INFERENCE_ENABLED", False)):
            return Response({"detail": "Live API is not available."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        if connection.vendor != "postgresql":
            return Response({"detail": "Top-ups require PostgreSQL."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        try:
            ensure_payment_configuration()
        except PaymentConfigurationError:
            return Response({"detail": "Payment is not configured."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        if not (getattr(settings, "SEPAY_WEBHOOK_SECRET", "").strip() or getattr(settings, "SEPAY_API_KEY", "").strip()):
            return Response({"detail": "Payment is not configured."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        org = get_object_or_404(DeveloperOrganization.objects.select_for_update(), pk=organization_id, owner=request.user, active=True)
        wallet, _ = ApiWallet.objects.get_or_create(organization=org, environment=DeveloperAPIKey.Environment.LIVE)
        if wallet.topup_orders.filter(status=ApiTopUpOrder.Status.PENDING, expires_at__gt=timezone.now()).count() >= 5:
            return Response({"detail": "Too many pending top-ups."}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        order = create_topup_order(wallet.pk, serializer.validated_data["amount_vnd"])
        response = Response({**topup_data(order), "qr_url": build_qr_url(order)}, status=status.HTTP_201_CREATED)
        response["Cache-Control"] = "no-store"
        return response


class TopUpDetailView(TopUpView):
    throttle_scope = "payment_status"

    def get(self, request, organization_id, order_id):
        org = self.organization(request, organization_id)
        order = get_object_or_404(ApiTopUpOrder, pk=order_id, wallet__organization=org)
        response = Response(topup_data(order))
        response["Cache-Control"] = "no-store"
        return response
