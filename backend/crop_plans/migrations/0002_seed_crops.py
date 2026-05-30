from django.db import migrations


def seed_crops(apps, schema_editor):
    Crop = apps.get_model("crop_plans", "Crop")

    crops = [
        {
            "slug": "tomato",
            "name": "Cà chua",
            "category": "vegetable",
            "description": "Loại cây phù hợp cho người mới bắt đầu, có thể trồng chậu hoặc trồng đất.",
            "default_planting_modes": ["pot", "ground"],
            "climate_profile": {
                "optimal_temp_c": [22, 30],
                "optimal_humidity_pct": [55, 80],
                "rain_14d_high_mm": 80,
                "sunlight_hours_min": 6,
            },
            "growth_profile": {
                "germination_days": [5, 10],
                "seedling_days": [1, 20],
                "vegetative_days": [20, 40],
                "flowering_days": [35, 60],
                "harvest_days": [60, 90],
            },
            "care_rules": {
                "watering": "1-2 lần/ngày tùy độ ẩm đất",
                "fertilizing": "Từ ngày 20 đến ngày 35, lặp mỗi 5 ngày",
                "sunlight": "6-8 giờ nắng/ngày",
            },
            "is_beginner_friendly": True,
        },
        {
            "slug": "bell-pepper",
            "name": "Ớt chuông",
            "category": "vegetable",
            "description": "Cần nắng ổn định, hợp cho người đã có ít kinh nghiệm chăm cây ăn quả.",
            "default_planting_modes": ["pot", "ground"],
            "climate_profile": {
                "optimal_temp_c": [21, 29],
                "optimal_humidity_pct": [55, 78],
                "rain_14d_high_mm": 75,
                "sunlight_hours_min": 6,
            },
            "growth_profile": {"harvest_days": [70, 100]},
            "care_rules": {"watering": "giữ ẩm đều", "sunlight": "6-8 giờ nắng/ngày"},
            "is_beginner_friendly": True,
        },
        {
            "slug": "strawberry",
            "name": "Dâu tây",
            "category": "fruit",
            "description": "Cần nơi thoáng, độ ẩm dễ kiểm soát và ưu tiên khu vực mát hơn.",
            "default_planting_modes": ["pot", "ground"],
            "climate_profile": {
                "optimal_temp_c": [16, 26],
                "optimal_humidity_pct": [50, 75],
                "rain_14d_high_mm": 65,
                "sunlight_hours_min": 5,
            },
            "growth_profile": {"harvest_days": [75, 110]},
            "care_rules": {"watering": "tưới nhẹ, tránh đọng nước", "sunlight": "5-6 giờ nắng"},
            "is_beginner_friendly": False,
        },
    ]

    for payload in crops:
        Crop.objects.update_or_create(slug=payload["slug"], defaults=payload)


def reverse_seed_crops(apps, schema_editor):
    Crop = apps.get_model("crop_plans", "Crop")
    Crop.objects.filter(slug__in=["tomato", "bell-pepper", "strawberry"]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("crop_plans", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_crops, reverse_seed_crops),
    ]
