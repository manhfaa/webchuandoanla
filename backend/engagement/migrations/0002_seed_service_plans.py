from django.db import migrations


def seed_service_plans(apps, schema_editor):
    ServicePlan = apps.get_model("engagement", "ServicePlan")

    plans = [
        {
            "slug": "free",
            "name": "Free",
            "description": "Xác thực ảnh lá bằng YOLO và lưu lịch sử cơ bản.",
            "price_monthly": 0,
            "currency": "VND",
            "yolo_enabled": True,
            "cnn_enabled": False,
            "rag_enabled": False,
            "expert_chat_enabled": False,
            "max_diagnoses_per_month": 30,
            "metadata": {"badge": "Starter"},
        },
        {
            "slug": "pro",
            "name": "Pro",
            "description": "Mở rộng lưu trữ và sẵn sàng cho CNN khi được bật.",
            "price_monthly": 199000,
            "currency": "VND",
            "yolo_enabled": True,
            "cnn_enabled": True,
            "rag_enabled": False,
            "expert_chat_enabled": False,
            "max_diagnoses_per_month": 500,
            "metadata": {"badge": "Operational"},
        },
        {
            "slug": "plus",
            "name": "Plus",
            "description": "Mở khóa Light RAG, chat chuyên gia và lưu trữ đầy đủ.",
            "price_monthly": 399000,
            "currency": "VND",
            "yolo_enabled": True,
            "cnn_enabled": True,
            "rag_enabled": True,
            "expert_chat_enabled": True,
            "max_diagnoses_per_month": 5000,
            "metadata": {"badge": "Premium"},
        },
    ]

    for item in plans:
        ServicePlan.objects.update_or_create(slug=item["slug"], defaults=item)


class Migration(migrations.Migration):
    dependencies = [
        ("engagement", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_service_plans, migrations.RunPython.noop),
    ]
