from django.db import migrations


def update_service_plans_vietnamese(apps, schema_editor):
    ServicePlan = apps.get_model("engagement", "ServicePlan")

    descriptions = {
        "free": "Xác thực ảnh lá bằng YOLO và lưu lịch sử cơ bản.",
        "pro": "Mở rộng lưu trữ và sẵn sàng cho CNN khi được bật.",
        "plus": "Mở khóa Light RAG, chat chuyên gia và lưu trữ đầy đủ.",
    }

    for slug, description in descriptions.items():
        ServicePlan.objects.filter(slug=slug).update(description=description)


class Migration(migrations.Migration):
    dependencies = [
        ("engagement", "0002_seed_service_plans"),
    ]

    operations = [
        migrations.RunPython(update_service_plans_vietnamese, migrations.RunPython.noop),
    ]
