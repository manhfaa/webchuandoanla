from django.db import migrations

# Keyed by slug so the seed is stable even if the Vietnamese name is edited later.
CROP_ENGLISH = {
    "tomato": {
        "name_en": "Tomato",
        "description_en": (
            "A beginner-friendly crop that grows well in pots or straight in the ground."
        ),
    },
    "strawberry": {
        "name_en": "Strawberry",
        "description_en": (
            "Needs an airy spot with humidity that is easy to control, and prefers cooler areas."
        ),
    },
    "bell-pepper": {
        "name_en": "Bell pepper",
        "description_en": (
            "Needs steady sunlight; best for growers with some experience caring for fruiting plants."
        ),
    },
}


def seed_english(apps, schema_editor):
    Crop = apps.get_model("crop_plans", "Crop")
    for slug, values in CROP_ENGLISH.items():
        # Only fill blanks: never overwrite text an operator has already curated,
        # and skip slugs that do not exist in this database.
        crop = Crop.objects.filter(slug=slug).first()
        if crop is None:
            continue
        updated = []
        for field, text in values.items():
            if not (getattr(crop, field, "") or "").strip():
                setattr(crop, field, text)
                updated.append(field)
        if updated:
            crop.save(update_fields=updated)


def unseed_english(apps, schema_editor):
    Crop = apps.get_model("crop_plans", "Crop")
    for slug, values in CROP_ENGLISH.items():
        crop = Crop.objects.filter(slug=slug).first()
        if crop is None:
            continue
        cleared = []
        for field, text in values.items():
            if (getattr(crop, field, "") or "").strip() == text:
                setattr(crop, field, "")
                cleared.append(field)
        if cleared:
            crop.save(update_fields=cleared)


class Migration(migrations.Migration):
    dependencies = [
        ("crop_plans", "0005_crop_description_en_crop_name_en"),
    ]

    operations = [
        migrations.RunPython(seed_english, unseed_english),
    ]
