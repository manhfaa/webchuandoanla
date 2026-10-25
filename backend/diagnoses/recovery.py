from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from farmops.models import FarmPlot

from .models import Diagnosis, RecoveryCase, RecoveryCheckIn


def diagnosis_summary(diagnosis):
    if diagnosis is None:
        return None
    return {
        "id": diagnosis.id,
        "plant_name": diagnosis.plant_name,
        "disease_name": diagnosis.disease_name,
        "thumbnail_url": diagnosis.thumbnail_url or diagnosis.image_url,
        "created_at": diagnosis.created_at,
    }


class RecoveryCheckInSerializer(serializers.ModelSerializer):
    diagnosis = serializers.SerializerMethodField()

    class Meta:
        model = RecoveryCheckIn
        fields = ("id", "diagnosis", "condition", "affected_leaves", "note", "action_taken", "created_at")

    def get_diagnosis(self, obj):
        return diagnosis_summary(obj.diagnosis)


class RecoveryCaseSerializer(serializers.ModelSerializer):
    baseline_diagnosis = serializers.SerializerMethodField()
    plot_name = serializers.CharField(source="plot.name", read_only=True, default="")
    check_in_count = serializers.IntegerField(read_only=True)
    check_ins = RecoveryCheckInSerializer(many=True, read_only=True)

    class Meta:
        model = RecoveryCase
        fields = (
            "id", "title", "plant_name", "baseline_diagnosis", "plot", "plot_name",
            "next_check_date", "is_closed", "check_in_count", "check_ins", "created_at", "updated_at",
        )

    def get_baseline_diagnosis(self, obj):
        return diagnosis_summary(obj.baseline_diagnosis)


class RecoveryCaseListSerializer(RecoveryCaseSerializer):
    class Meta(RecoveryCaseSerializer.Meta):
        fields = tuple(field for field in RecoveryCaseSerializer.Meta.fields if field != "check_ins")


class RecoveryCaseCreateSerializer(serializers.Serializer):
    baseline_diagnosis_id = serializers.IntegerField(min_value=1)
    plot_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    title = serializers.CharField(max_length=160, trim_whitespace=True, required=False)
    next_check_date = serializers.DateField(required=False)

    def validate(self, attrs):
        user = self.context["request"].user
        diagnosis = Diagnosis.objects.filter(pk=attrs["baseline_diagnosis_id"], user=user).first()
        if diagnosis is None or diagnosis.status != "completed" or not diagnosis.is_leaf:
            raise serializers.ValidationError({"baseline_diagnosis_id": "Cần một kết quả ảnh lá đã hoàn tất của bạn."})
        if RecoveryCase.objects.filter(baseline_diagnosis=diagnosis).exists() or RecoveryCheckIn.objects.filter(diagnosis=diagnosis).exists():
            raise serializers.ValidationError({"baseline_diagnosis_id": "Kết quả này đã thuộc một đợt theo dõi."})

        plot = None
        if attrs.get("plot_id") is not None:
            plot = FarmPlot.objects.filter(pk=attrs["plot_id"], user=user).first()
            if plot is None:
                raise serializers.ValidationError({"plot_id": "Không tìm thấy lô vườn của bạn."})

        days = (diagnosis.action_plan or {}).get("recheck_after_days", 5)
        days = days if isinstance(days, int) and not isinstance(days, bool) else 5
        proposed = attrs.get("next_check_date", timezone.localdate() + timedelta(days=min(max(days, 1), 14)))
        if not timezone.localdate() <= proposed <= timezone.localdate() + timedelta(days=90):
            raise serializers.ValidationError({"next_check_date": "Chọn ngày từ hôm nay đến 90 ngày tới."})
        attrs["diagnosis"] = diagnosis
        attrs["plot"] = plot
        attrs["next_check_date"] = proposed
        attrs["title"] = attrs.get("title") or f"Theo dõi {diagnosis.plant_name or 'cây trồng'}"
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        with transaction.atomic():
            get_user_model().objects.select_for_update().get(pk=user.pk)
            diagnosis = Diagnosis.objects.select_for_update().get(pk=validated_data["diagnosis"].pk)
            if RecoveryCase.objects.filter(baseline_diagnosis=diagnosis).exists() or RecoveryCheckIn.objects.filter(diagnosis=diagnosis).exists():
                raise serializers.ValidationError({"baseline_diagnosis_id": "Kết quả này đã thuộc một đợt theo dõi."})
            if RecoveryCase.objects.filter(user=user, is_closed=False).count() >= 20:
                raise serializers.ValidationError("Bạn đã có 20 đợt đang theo dõi. Hãy đóng một đợt trước khi tạo mới.")
            return RecoveryCase.objects.create(
                user=user,
                baseline_diagnosis=diagnosis,
                plot=validated_data["plot"], title=validated_data["title"],
                plant_name=diagnosis.plant_name,
                next_check_date=validated_data["next_check_date"],
            )


class RecoveryCaseUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecoveryCase
        fields = ("title", "next_check_date", "is_closed")

    def validate_next_check_date(self, value):
        if not timezone.localdate() <= value <= timezone.localdate() + timedelta(days=90):
            raise serializers.ValidationError("Chọn ngày từ hôm nay đến 90 ngày tới.")
        return value


class RecoveryCheckInCreateSerializer(serializers.Serializer):
    diagnosis_id = serializers.IntegerField(min_value=1)
    same_subject_confirmed = serializers.BooleanField()
    condition = serializers.ChoiceField(choices=RecoveryCheckIn.Condition.choices)
    affected_leaves = serializers.IntegerField(min_value=0, max_value=9999, required=False, allow_null=True)
    note = serializers.CharField(max_length=500, allow_blank=True, required=False)
    action_taken = serializers.CharField(max_length=500, allow_blank=True, required=False)
    next_check_date = serializers.DateField(required=False)

    def validate(self, attrs):
        case = self.context["case"]
        user = self.context["request"].user
        if case.is_closed:
            raise serializers.ValidationError("Đợt theo dõi đã đóng.")
        if not attrs["same_subject_confirmed"]:
            raise serializers.ValidationError({"same_subject_confirmed": "Hãy xác nhận ảnh chụp cùng cây hoặc cùng khu vực."})
        diagnosis = Diagnosis.objects.filter(pk=attrs["diagnosis_id"], user=user).first()
        if diagnosis is None or diagnosis.status != "completed" or not diagnosis.is_leaf:
            raise serializers.ValidationError({"diagnosis_id": "Cần một kết quả ảnh lá đã hoàn tất của bạn."})
        if (diagnosis.plant_name or "").casefold() != (case.plant_name or "").casefold():
            raise serializers.ValidationError({"diagnosis_id": "Ảnh tái kiểm tra phải cùng loại cây với ảnh ban đầu."})
        if diagnosis.id == case.baseline_diagnosis_id or RecoveryCheckIn.objects.filter(diagnosis=diagnosis).exists() or RecoveryCase.objects.filter(baseline_diagnosis=diagnosis).exists():
            raise serializers.ValidationError({"diagnosis_id": "Kết quả này đã thuộc một đợt theo dõi."})
        if case.baseline_diagnosis and diagnosis.created_at < case.baseline_diagnosis.created_at:
            raise serializers.ValidationError({"diagnosis_id": "Ảnh tái kiểm tra phải mới hơn ảnh ban đầu."})
        proposed = attrs.get("next_check_date", timezone.localdate() + timedelta(days=5))
        if not timezone.localdate() <= proposed <= timezone.localdate() + timedelta(days=90):
            raise serializers.ValidationError({"next_check_date": "Chọn ngày từ hôm nay đến 90 ngày tới."})
        attrs["diagnosis"] = diagnosis
        attrs["next_check_date"] = proposed
        return attrs

    def create(self, validated_data):
        case = self.context["case"]
        with transaction.atomic():
            locked_case = RecoveryCase.objects.select_for_update().get(pk=case.pk)
            diagnosis = Diagnosis.objects.select_for_update().get(pk=validated_data["diagnosis"].pk)
            if RecoveryCheckIn.objects.filter(diagnosis=diagnosis).exists() or RecoveryCase.objects.filter(baseline_diagnosis=diagnosis).exists():
                raise serializers.ValidationError({"diagnosis_id": "Kết quả này đã thuộc một đợt theo dõi."})
            if locked_case.is_closed or locked_case.check_ins.count() >= 30:
                raise serializers.ValidationError("Đợt theo dõi đã đóng hoặc đạt giới hạn 30 lần tái kiểm tra.")
            check_in = RecoveryCheckIn.objects.create(
                case=locked_case, diagnosis=diagnosis,
                condition=validated_data["condition"],
                affected_leaves=validated_data.get("affected_leaves"),
                note=validated_data.get("note", ""),
                action_taken=validated_data.get("action_taken", ""),
            )
            locked_case.next_check_date = validated_data["next_check_date"]
            locked_case.save(update_fields=["next_check_date", "updated_at"])
            return check_in


@method_decorator(never_cache, name="dispatch")
class RecoveryCaseListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (RecoveryCase.objects.filter(user=self.request.user)
                .select_related("baseline_diagnosis", "plot")
                .annotate(check_in_count=Count("check_ins")))

    def get_serializer_class(self):
        return RecoveryCaseCreateSerializer if self.request.method == "POST" else RecoveryCaseListSerializer

    def list(self, request, *args, **kwargs):
        try:
            limit = min(max(int(request.query_params.get("limit", 20)), 1), 50)
            offset = max(int(request.query_params.get("offset", 0)), 0)
        except (TypeError, ValueError):
            return Response({"detail": "limit and offset must be whole numbers."}, status=400)
        qs = self.get_queryset()
        count = qs.count()
        return Response({"count": count, "results": RecoveryCaseListSerializer(qs[offset:offset + limit], many=True).data,
                         "next_offset": offset + limit if offset + limit < count else None})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        case = serializer.save()
        return Response(RecoveryCaseSerializer(case).data, status=status.HTTP_201_CREATED)


@method_decorator(never_cache, name="dispatch")
class RecoveryCaseDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (RecoveryCase.objects.filter(user=self.request.user)
                .select_related("baseline_diagnosis", "plot")
                .prefetch_related("check_ins__diagnosis")
                .annotate(check_in_count=Count("check_ins")))

    def get_serializer_class(self):
        return RecoveryCaseUpdateSerializer if self.request.method in ("PUT", "PATCH") else RecoveryCaseSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(RecoveryCaseSerializer(self.get_queryset().get(pk=instance.pk)).data)


@method_decorator(never_cache, name="dispatch")
class RecoveryCheckInCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        case = get_object_or_404(RecoveryCase.objects.filter(user=request.user).select_related("baseline_diagnosis"), pk=pk)
        serializer = RecoveryCheckInCreateSerializer(data=request.data, context={"request": request, "case": case})
        serializer.is_valid(raise_exception=True)
        check_in = serializer.save()
        return Response(RecoveryCheckInSerializer(check_in).data, status=status.HTTP_201_CREATED)
