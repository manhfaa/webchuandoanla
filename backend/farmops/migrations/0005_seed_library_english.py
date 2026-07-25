"""Fill the English columns of the seeded agricultural input library.

Additive and defensive: every row is matched by a stable natural key and any
row that is not present is simply skipped, so the migration is safe on a
database whose library content differs from the seed migrations.
"""

from django.db import migrations


# (lookup names, english payload). Older databases may still carry the
# pre-0003 English row names, so both spellings are accepted as lookup keys.
INPUT_TRANSLATIONS = [
    (
        ["Thuốc nấm gốc đồng", "Copper-based fungicide"],
        {
            "name_en": "Copper-based fungicide",
            "group_en": "Fungicide",
            "active_ingredient_en": "Copper hydroxide / copper oxychloride",
            "usage_en": (
                "Reference option for leaf spot, anthracnose and downy mildew "
                "when recommended by local extension services."
            ),
            "suitable_crops_en": ["tomato", "potato", "maize", "orange", "coffee", "black pepper"],
            "related_diseases_en": ["leaf spot", "leaf blight", "anthracnose", "downy mildew"],
            "safety_notes_en": [
                "Read the product label carefully.",
                "Wear protective equipment when mixing and spraying.",
                "Do not spray near water sources.",
            ],
            "warning_en": (
                "Never increase the dose on your own. Follow the label and the "
                "advice of local extension staff."
            ),
        },
    ),
    (
        ["NPK cân đối", "Balanced NPK"],
        {
            "name_en": "Balanced NPK",
            "group_en": "Fertilizer",
            "active_ingredient_en": "N-P-K",
            "usage_en": "Supplies macronutrients in line with the crop growth stage.",
            "suitable_crops_en": [
                "rice",
                "tomato",
                "potato",
                "maize",
                "coffee",
                "black pepper",
                "durian",
                "orange",
            ],
            "related_diseases_en": [],
            "safety_notes_en": [
                "Apply according to crop demand and soil conditions.",
                "Do not apply close to the stem base when the soil is too dry.",
            ],
            "warning_en": (
                "This information is for reference only; check your soil and follow local guidance."
            ),
        },
    ),
    (
        ["Bổ sung canxi - magie", "Calcium - Magnesium supplement"],
        {
            "name_en": "Calcium - magnesium supplement",
            "group_en": "Crop nutrition",
            "active_ingredient_en": "Ca, Mg",
            "usage_en": (
                "Supports the crop when calcium or magnesium deficiency, leaf "
                "yellowing or growth disorders appear."
            ),
            "suitable_crops_en": ["tomato", "black pepper", "durian", "orange", "coffee"],
            "related_diseases_en": ["nutrient deficiency", "leaf yellowing", "leaf curl"],
            "safety_notes_en": [
                "Do not tank-mix with other products without checking compatibility.",
                "Test on a small area before applying it widely.",
            ],
            "warning_en": "Does not replace soil or leaf analysis results.",
        },
    ),
]

SYMPTOM_TRANSLATIONS = [
    (
        "Thiếu đạm",
        {
            "nutrient_en": "Nitrogen deficiency",
            "symptom_en": "Older leaves turn yellow gradually, growth slows down and stems stay thin.",
            "affected_crops_en": ["rice", "maize", "tomato", "coffee"],
            "recommendation_en": (
                "Review the fertilising schedule and soil moisture, and consider adding "
                "nitrogen following local recommendations."
            ),
            "safety_notes_en": [
                "Do not over-apply: excess nitrogen weakens the plant and increases pest and disease pressure.",
            ],
        },
    ),
    (
        "Thiếu kali",
        {
            "nutrient_en": "Potassium deficiency",
            "symptom_en": (
                "Leaf margins scorch yellow to brown and the plant copes poorly with drought and disease."
            ),
            "affected_crops_en": ["tomato", "potato", "black pepper", "durian"],
            "recommendation_en": (
                "Watch the leaf margins during fruit filling and consider a balanced potassium application."
            ),
            "safety_notes_en": ["Keep it balanced with calcium and magnesium."],
        },
    ),
    (
        "Thiếu magie",
        {
            "nutrient_en": "Magnesium deficiency",
            "symptom_en": (
                "Yellowing between the leaf veins while the veins stay green, usually on older leaves."
            ),
            "affected_crops_en": ["coffee", "orange", "black pepper", "durian"],
            "recommendation_en": "Check the soil pH and consider a suitable magnesium source.",
            "safety_notes_en": ["Do not conclude from a photo alone; confirm the symptom in the field."],
        },
    ),
]


def fill_english(apps, schema_editor):
    AgriculturalInput = apps.get_model("farmops", "AgriculturalInput")
    NutritionSymptom = apps.get_model("farmops", "NutritionSymptom")

    for lookup_names, payload in INPUT_TRANSLATIONS:
        # .update() on an empty queryset is a no-op, so unknown rows are skipped.
        AgriculturalInput.objects.filter(name__in=lookup_names).update(**payload)

    for nutrient, payload in SYMPTOM_TRANSLATIONS:
        NutritionSymptom.objects.filter(nutrient=nutrient).update(**payload)


def clear_english(apps, schema_editor):
    AgriculturalInput = apps.get_model("farmops", "AgriculturalInput")
    NutritionSymptom = apps.get_model("farmops", "NutritionSymptom")

    for lookup_names, payload in INPUT_TRANSLATIONS:
        blanks = {key: ([] if isinstance(value, list) else "") for key, value in payload.items()}
        AgriculturalInput.objects.filter(name__in=lookup_names).update(**blanks)

    for nutrient, payload in SYMPTOM_TRANSLATIONS:
        blanks = {key: ([] if isinstance(value, list) else "") for key, value in payload.items()}
        NutritionSymptom.objects.filter(nutrient=nutrient).update(**blanks)


class Migration(migrations.Migration):
    dependencies = [
        ("farmops", "0004_agriculturalinput_active_ingredient_en_and_more"),
    ]

    operations = [
        migrations.RunPython(fill_english, clear_english),
    ]
