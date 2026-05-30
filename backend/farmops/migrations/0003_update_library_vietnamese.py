from django.db import migrations


def update_library(apps, schema_editor):
    AgriculturalInput = apps.get_model("farmops", "AgriculturalInput")
    NutritionSymptom = apps.get_model("farmops", "NutritionSymptom")

    input_updates = [
        (
            "Copper-based fungicide",
            {
                "name": "Thuốc nấm gốc đồng",
                "group": "Thuốc trừ nấm",
                "active_ingredient": "Đồng hydroxide / đồng oxychloride",
                "suitable_crops": ["cà chua", "khoai tây", "bắp", "cam", "cà phê", "tiêu"],
                "related_diseases": ["đốm lá", "cháy lá", "thán thư", "sương mai"],
            },
        ),
        (
            "NPK cân đối",
            {
                "group": "Phân bón",
                "suitable_crops": ["lúa", "cà chua", "khoai tây", "bắp", "cà phê", "tiêu", "sầu riêng", "cam"],
            },
        ),
        (
            "Calcium - Magnesium supplement",
            {
                "name": "Bổ sung canxi - magie",
                "group": "Dinh dưỡng cây trồng",
                "suitable_crops": ["cà chua", "tiêu", "sầu riêng", "cam", "cà phê"],
                "related_diseases": ["thiếu dinh dưỡng", "vàng lá", "xoăn lá"],
            },
        ),
    ]

    for lookup_name, payload in input_updates:
        AgriculturalInput.objects.filter(name=lookup_name).update(**payload)

    NutritionSymptom.objects.filter(nutrient="Thiếu đạm").update(
        affected_crops=["lúa", "bắp", "cà chua", "cà phê"]
    )
    NutritionSymptom.objects.filter(nutrient="Thiếu kali").update(
        affected_crops=["cà chua", "khoai tây", "tiêu", "sầu riêng"]
    )
    NutritionSymptom.objects.filter(nutrient="Thiếu magie").update(
        affected_crops=["cà phê", "cam", "tiêu", "sầu riêng"]
    )


def reverse_library(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("farmops", "0002_seed_library"),
    ]

    operations = [
        migrations.RunPython(update_library, reverse_library),
    ]
