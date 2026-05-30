import django.db.models.deletion
import farmops.models
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("diagnoses", "0002_diagnosis_cnn_confidence_diagnosis_cnn_payload_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="AgriculturalInput",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("category", models.CharField(choices=[("pesticide", "Pesticide"), ("fertilizer", "Fertilizer"), ("nutrition", "Nutrition")], max_length=40)),
                ("name", models.CharField(max_length=160)),
                ("group", models.CharField(blank=True, default="", max_length=120)),
                ("active_ingredient", models.CharField(blank=True, default="", max_length=160)),
                ("usage", models.TextField(blank=True, default="")),
                ("suitable_crops", models.JSONField(blank=True, default=list)),
                ("related_diseases", models.JSONField(blank=True, default=list)),
                ("safety_notes", models.JSONField(blank=True, default=list)),
                ("withholding_period_days", models.PositiveIntegerField(blank=True, null=True)),
                ("warning", models.TextField(blank=True, default="")),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["category", "name"]},
        ),
        migrations.CreateModel(
            name="FarmLocation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=140)),
                ("province", models.CharField(blank=True, default="", max_length=120)),
                ("district", models.CharField(blank=True, default="", max_length=120)),
                ("ward", models.CharField(blank=True, default="", max_length=120)),
                ("address_text", models.CharField(blank=True, default="", max_length=255)),
                ("latitude", models.FloatField(blank=True, null=True)),
                ("longitude", models.FloatField(blank=True, null=True)),
                ("crop_type", models.CharField(blank=True, default="", max_length=120)),
                ("is_default", models.BooleanField(default=False)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="farm_locations", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-is_default", "-updated_at"]},
        ),
        migrations.CreateModel(
            name="NutritionSymptom",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nutrient", models.CharField(max_length=120)),
                ("symptom", models.TextField()),
                ("affected_crops", models.JSONField(blank=True, default=list)),
                ("recommendation", models.TextField(blank=True, default="")),
                ("safety_notes", models.JSONField(blank=True, default=list)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["nutrient"]},
        ),
        migrations.CreateModel(
            name="FarmPlot",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=140)),
                ("crop_type", models.CharField(max_length=120)),
                ("area_value", models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ("area_unit", models.CharField(default="m2", max_length=30)),
                ("address_text", models.CharField(blank=True, default="", max_length=255)),
                ("planting_start_date", models.DateField(blank=True, null=True)),
                ("growth_stage", models.CharField(blank=True, default="", max_length=120)),
                ("note", models.TextField(blank=True, default="")),
                ("public_settings", models.JSONField(blank=True, default=dict)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("location", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="plots", to="farmops.farmlocation")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="farm_plots", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-updated_at"]},
        ),
        migrations.CreateModel(
            name="CultivationLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("activity_type", models.CharField(choices=[("watering", "Watering"), ("fertilizing", "Fertilizing"), ("pesticide", "Pesticide"), ("disease_check", "Disease check"), ("pruning", "Pruning"), ("harvest", "Harvest"), ("note", "Note")], default="note", max_length=40)),
                ("activity_date", models.DateField()),
                ("title", models.CharField(max_length=160)),
                ("description", models.TextField(blank=True, default="")),
                ("image_url", models.URLField(blank=True, default="")),
                ("cost_amount", models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ("materials", models.JSONField(blank=True, default=list)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("diagnosis", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="cultivation_logs", to="diagnoses.diagnosis")),
                ("plot", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="logs", to="farmops.farmplot")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="cultivation_logs", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-activity_date", "-created_at"]},
        ),
        migrations.CreateModel(
            name="TraceabilityRecord",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_token", models.SlugField(default=farmops.models.build_public_token, max_length=80, unique=True)),
                ("product_name", models.CharField(max_length=160)),
                ("public_settings", models.JSONField(blank=True, default=dict)),
                ("is_public", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("plot", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="traceability_records", to="farmops.farmplot")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="traceability_records", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
