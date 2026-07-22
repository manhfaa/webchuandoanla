from django.db import migrations


PLAN_CONFIGS = {
    "seed": {
        "name": "Seed",
        "description": "Kiểm tra ảnh lá và lưu lịch sử cơ bản.",
        "price_monthly": 0,
        "currency": "VND",
        "yolo_enabled": True,
        "cnn_enabled": True,
        "rag_enabled": False,
        "expert_chat_enabled": False,
        "max_diagnoses_per_month": 150,
        "metadata": {"daily_diagnoses": 5, "history_days": 7, "chat_daily": 3},
        "is_active": True,
    },
    "grow": {
        "name": "Grow",
        "description": "Tăng lượt kiểm tra, lịch sử và mở kế hoạch trồng cây.",
        "price_monthly": 9000,
        "currency": "VND",
        "yolo_enabled": True,
        "cnn_enabled": True,
        "rag_enabled": True,
        "expert_chat_enabled": False,
        "max_diagnoses_per_month": 900,
        "metadata": {"daily_diagnoses": 30, "history_days": 30, "chat_daily": 20},
        "is_active": True,
    },
    "bloom": {
        "name": "Bloom",
        "description": "Theo dõi đầy đủ, tư vấn nâng cao và lưu toàn bộ lịch sử.",
        "price_monthly": 39000,
        "currency": "VND",
        "yolo_enabled": True,
        "cnn_enabled": True,
        "rag_enabled": True,
        "expert_chat_enabled": True,
        "max_diagnoses_per_month": 0,
        "metadata": {"daily_diagnoses": 0, "history_days": 0, "chat_daily": 0},
        "is_active": True,
    },
    "elite": {
        "name": "Elite",
        "description": "Báo cáo và tích hợp dành cho nhu cầu chuyên sâu.",
        "price_monthly": 99000,
        "currency": "VND",
        "yolo_enabled": True,
        "cnn_enabled": True,
        "rag_enabled": True,
        "expert_chat_enabled": True,
        "max_diagnoses_per_month": 0,
        "metadata": {"daily_diagnoses": 0, "history_days": 0, "chat_daily": 0, "reports": True},
        "is_active": True,
    },
}


def sync_billing_plans(apps, schema_editor):
    ServicePlan = apps.get_model("engagement", "ServicePlan")
    UserSubscription = apps.get_model("engagement", "UserSubscription")
    legacy_map = {"free": "seed", "pro": "grow", "plus": "bloom"}

    for legacy_slug, target_slug in legacy_map.items():
        legacy = ServicePlan.objects.filter(slug=legacy_slug).first()
        target = ServicePlan.objects.filter(slug=target_slug).first()
        if not legacy:
            continue
        if target:
            UserSubscription.objects.filter(plan_id=legacy.id).update(plan_id=target.id)
            legacy.delete()
        else:
            legacy.slug = target_slug
            legacy.save(update_fields=["slug"])

    for slug, defaults in PLAN_CONFIGS.items():
        ServicePlan.objects.update_or_create(slug=slug, defaults=defaults)


class Migration(migrations.Migration):
    dependencies = [
        ("engagement", "0003_update_service_plans_vietnamese"),
    ]

    operations = [
        migrations.RunPython(sync_billing_plans, migrations.RunPython.noop),
    ]
