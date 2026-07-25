"""Give each crop the planning data the schedule builder reads.

Before this, ``build_step_templates`` was one literal tomato schedule, so a
strawberry plan told the grower to stake the plants and explained that
"tomatoes need steady soil moisture". The offsets, cadences and crop-specific
prose now live on the Crop row, which is what growth_profile / care_rules were
always for.
"""

from django.db import migrations


# slug -> (growth_profile before, care_rules before, growth_profile after, care_rules after)
PROFILES = {
    "tomato": {
        "growth_before": {
            "germination_days": [5, 10],
            "seedling_days": [1, 20],
            "vegetative_days": [20, 40],
            "flowering_days": [35, 60],
            "harvest_days": [60, 90],
        },
        "care_before": {
            "watering": "1-2 lần/ngày tùy độ ẩm đất",
            "fertilizing": "Từ ngày 20 đến ngày 35, lặp mỗi 5 ngày",
            "sunlight": "6-8 giờ nắng/ngày",
        },
        "growth_after": {
            "germination_days": [5, 10],
            "seedling_days": [1, 20],
            "vegetative_days": [20, 40],
            "flowering_days": [35, 60],
            "harvest_days": [60, 90],
            "propagation": "seed",
            "needs_support": True,
            "spacing_cm": [50, 60],
            "pot_litres": [20, 30],
            "seed_soak_hours": [2, 4],
            "sowing_depth_cm": [0.5, 1],
            "support_height_cm": [25, 35],
        },
        "care_after": {
            "watering": "1-2 lần/ngày tùy độ ẩm đất",
            "fertilizing": "Từ ngày 20 đến ngày 35, lặp mỗi 5 ngày",
            "sunlight": "6-8 giờ nắng/ngày",
            "sunlight_en": "6-8 hours of sun a day",
            "watering_times_of_day": ["06:00", "17:00"],
            "watering_reason": "Cà chua cần độ ẩm ổn định để phát triển thân lá và nuôi quả.",
            "watering_reason_en": "Tomatoes need steady soil moisture to develop healthy foliage and to fill out their fruit.",
            "water_ml_per_pot": 600,
            "water_litres_per_plant": 1.2,
            "water_litres_per_plant_large": 1.5,
            "fertilizing_start_day": 20,
            "fertilizing_end_day": 35,
            "fertilizing_interval_days": 5,
            "fertilizer_grams_pot": 15,
            "fertilizer_grams_ground": 25,
            "scouting_interval_days": 2,
            "harvest_check_interval_days": 2,
            "harvest_signs": "quả lên màu đỏ đều, vỏ căng và kích cỡ ổn định",
            "harvest_signs_en": "the colour has turned evenly red, the skin is taut and the size has stopped changing",
            "support_note": "Cắm cọc giúp cây cà chua đứng thẳng, thông thoáng và dễ chăm sóc.",
            "support_note_en": "Staking keeps the tomato plant upright and airy and makes it easier to look after.",
        },
    },
    "bell-pepper": {
        "growth_before": {"harvest_days": [70, 100]},
        "care_before": {"watering": "giữ ẩm đều", "sunlight": "6-8 giờ nắng/ngày"},
        "growth_after": {
            "germination_days": [8, 14],
            "seedling_days": [1, 30],
            "vegetative_days": [30, 55],
            "flowering_days": [45, 70],
            "harvest_days": [70, 100],
            "propagation": "seed",
            "needs_support": True,
            "spacing_cm": [40, 50],
            "pot_litres": [15, 25],
            "seed_soak_hours": [4, 6],
            "sowing_depth_cm": [0.5, 1],
            "support_height_cm": [30, 40],
        },
        "care_after": {
            "watering": "giữ ẩm đều",
            "sunlight": "6-8 giờ nắng/ngày",
            "sunlight_en": "6-8 hours of sun a day",
            "fertilizing": "Từ ngày 25 đến ngày 45, lặp mỗi 7 ngày",
            "watering_times_of_day": ["06:00", "17:00"],
            "watering_reason": "Ớt chuông cần độ ẩm đều; thiếu nước lúc nuôi quả rất dễ gây thối đít quả.",
            "watering_reason_en": "Bell peppers need even moisture; letting them dry out while the fruit fills easily causes blossom-end rot.",
            "water_ml_per_pot": 700,
            "water_litres_per_plant": 1.3,
            "water_litres_per_plant_large": 1.6,
            "fertilizing_start_day": 25,
            "fertilizing_end_day": 45,
            "fertilizing_interval_days": 7,
            "fertilizer_grams_pot": 12,
            "fertilizer_grams_ground": 20,
            "scouting_interval_days": 2,
            "harvest_check_interval_days": 3,
            "harvest_signs": "quả căng bóng, vai quả chuyển màu và cuống vẫn còn xanh",
            "harvest_signs_en": "the fruit is glossy and firm, the shoulders have changed colour and the stalk is still green",
            "support_note": "Thân ớt chuông giòn, cắm cọc sớm giúp cây không gãy khi mang quả.",
            "support_note_en": "Bell pepper stems are brittle; staking early keeps them from snapping under a fruit load.",
        },
    },
    "strawberry": {
        "growth_before": {"harvest_days": [75, 110]},
        "care_before": {"watering": "tưới nhẹ, tránh đọng nước", "sunlight": "5-6 giờ nắng"},
        "growth_after": {
            "germination_days": [14, 21],
            "seedling_days": [1, 25],
            "vegetative_days": [25, 45],
            "flowering_days": [45, 70],
            "harvest_days": [75, 110],
            "propagation": "seedling",
            "needs_support": False,
            "spacing_cm": [30, 35],
            "pot_litres": [8, 12],
            "sowing_depth_cm": [0.5, 1],
        },
        "care_after": {
            "watering": "tưới nhẹ, tránh đọng nước",
            "sunlight": "5-6 giờ nắng",
            "sunlight_en": "5-6 hours of sun",
            "fertilizing": "Từ ngày 30 đến ngày 60, lặp mỗi 10 ngày",
            "watering_times_of_day": ["06:30"],
            "watering_reason": "Dâu tây ưa ẩm nhưng rất dễ thối gốc, nên tưới nhẹ và không để đọng nước quanh gốc.",
            "watering_reason_en": "Strawberries like moisture but rot at the crown very easily, so water lightly and never let water sit around the base.",
            "water_ml_per_pot": 400,
            "water_litres_per_plant": 0.8,
            "water_litres_per_plant_large": 1.0,
            "fertilizing_start_day": 30,
            "fertilizing_end_day": 60,
            "fertilizing_interval_days": 10,
            "fertilizer_grams_pot": 8,
            "fertilizer_grams_ground": 15,
            "scouting_interval_days": 2,
            "harvest_check_interval_days": 2,
            "harvest_signs": "quả đỏ đều tới cuống, dậy mùi thơm và hơi mềm khi chạm nhẹ",
            "harvest_signs_en": "the berry is red all the way to the stalk, smells fragrant and gives slightly when touched",
        },
    },
}


def _apply(apps, growth_key, care_key):
    Crop = apps.get_model("crop_plans", "Crop")
    for slug, payload in PROFILES.items():
        # Rows seeded by another route (or already removed) are left alone.
        Crop.objects.filter(slug=slug).update(
            growth_profile=payload[growth_key],
            care_rules=payload[care_key],
        )


def apply_planning_profiles(apps, schema_editor):
    _apply(apps, "growth_after", "care_after")


def revert_planning_profiles(apps, schema_editor):
    _apply(apps, "growth_before", "care_before")


class Migration(migrations.Migration):
    dependencies = [
        ("crop_plans", "0008_completionlog_step_number_completionlog_step_title_and_more"),
    ]

    operations = [
        migrations.RunPython(apply_planning_profiles, revert_planning_profiles),
    ]
