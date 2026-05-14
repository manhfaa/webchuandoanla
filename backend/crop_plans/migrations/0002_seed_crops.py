from django.db import migrations


def seed_crops(apps, schema_editor):
    Crop = apps.get_model("crop_plans", "Crop")

    crops = [
        {
            "slug": "tomato",
            "name": "Ca chua",
            "category": "vegetable",
            "description": "Loai cay phu hop cho nguoi moi bat dau, co the trong chau hoac trong dat.",
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
                "watering": "1-2 lan/ngay tuy do am dat",
                "fertilizing": "Tu ngay 20 den ngay 35, lap moi 5 ngay",
                "sunlight": "6-8 gio nang/ngay",
            },
            "is_beginner_friendly": True,
        },
        {
            "slug": "bell-pepper",
            "name": "Ot chuong",
            "category": "vegetable",
            "description": "Can nang on dinh, hop cho nguoi da co it kinh nghiem cham cay an qua.",
            "default_planting_modes": ["pot", "ground"],
            "climate_profile": {
                "optimal_temp_c": [21, 29],
                "optimal_humidity_pct": [55, 78],
                "rain_14d_high_mm": 75,
                "sunlight_hours_min": 6,
            },
            "growth_profile": {"harvest_days": [70, 100]},
            "care_rules": {"watering": "giu am deu", "sunlight": "6-8 gio nang/ngay"},
            "is_beginner_friendly": True,
        },
        {
            "slug": "strawberry",
            "name": "Dau tay",
            "category": "fruit",
            "description": "Can noi thoang, do am de kiem soat va uu tien khu vuc mat hon.",
            "default_planting_modes": ["pot", "ground"],
            "climate_profile": {
                "optimal_temp_c": [16, 26],
                "optimal_humidity_pct": [50, 75],
                "rain_14d_high_mm": 65,
                "sunlight_hours_min": 5,
            },
            "growth_profile": {"harvest_days": [75, 110]},
            "care_rules": {"watering": "tuoi nhe, tranh dong nuoc", "sunlight": "5-6 gio nang"},
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

