from django.db import migrations


def update_seeded_crops(apps, schema_editor):
    Crop = apps.get_model("crop_plans", "Crop")
    updates = {
        "tomato": {
            "name": "Cà chua",
            "description": "Loại cây phù hợp cho người mới bắt đầu, có thể trồng chậu hoặc trồng đất.",
            "care_rules": {
                "watering": "1-2 lần/ngày tùy độ ẩm đất",
                "fertilizing": "Từ ngày 20 đến ngày 35, lặp mỗi 5 ngày",
                "sunlight": "6-8 giờ nắng/ngày",
            },
        },
        "bell-pepper": {
            "name": "Ớt chuông",
            "description": "Cần nắng ổn định, hợp cho người đã có ít kinh nghiệm chăm cây ăn quả.",
            "care_rules": {"watering": "giữ ẩm đều", "sunlight": "6-8 giờ nắng/ngày"},
        },
        "strawberry": {
            "name": "Dâu tây",
            "description": "Cần nơi thoáng, độ ẩm dễ kiểm soát và ưu tiên khu vực mát hơn.",
            "care_rules": {"watering": "tưới nhẹ, tránh đọng nước", "sunlight": "5-6 giờ nắng"},
        },
    }

    for slug, payload in updates.items():
        Crop.objects.filter(slug=slug).update(**payload)


def reverse_seeded_crops(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("crop_plans", "0002_seed_crops"),
    ]

    operations = [
        migrations.RunPython(update_seeded_crops, reverse_seeded_crops),
    ]
