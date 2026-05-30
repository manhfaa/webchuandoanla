from __future__ import annotations

import secrets

from django.conf import settings
from django.db import models


def build_public_token() -> str:
    return secrets.token_urlsafe(18)


class FarmLocation(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="farm_locations")
    name = models.CharField(max_length=140)
    province = models.CharField(max_length=120, blank=True, default="")
    district = models.CharField(max_length=120, blank=True, default="")
    ward = models.CharField(max_length=120, blank=True, default="")
    address_text = models.CharField(max_length=255, blank=True, default="")
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    crop_type = models.CharField(max_length=120, blank=True, default="")
    is_default = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_default", "-updated_at"]

    def __str__(self) -> str:
        return self.name


class FarmPlot(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="farm_plots")
    location = models.ForeignKey(FarmLocation, null=True, blank=True, on_delete=models.SET_NULL, related_name="plots")
    name = models.CharField(max_length=140)
    crop_type = models.CharField(max_length=120)
    area_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    area_unit = models.CharField(max_length=30, default="m2")
    address_text = models.CharField(max_length=255, blank=True, default="")
    planting_start_date = models.DateField(null=True, blank=True)
    growth_stage = models.CharField(max_length=120, blank=True, default="")
    note = models.TextField(blank=True, default="")
    public_settings = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return self.name


class CultivationLog(models.Model):
    class ActivityType(models.TextChoices):
        WATERING = "watering", "Watering"
        FERTILIZING = "fertilizing", "Fertilizing"
        PESTICIDE = "pesticide", "Pesticide"
        DISEASE_CHECK = "disease_check", "Disease check"
        PRUNING = "pruning", "Pruning"
        HARVEST = "harvest", "Harvest"
        NOTE = "note", "Note"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cultivation_logs")
    plot = models.ForeignKey(FarmPlot, on_delete=models.CASCADE, related_name="logs")
    diagnosis = models.ForeignKey(
        "diagnoses.Diagnosis",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="cultivation_logs",
    )
    activity_type = models.CharField(max_length=40, choices=ActivityType.choices, default=ActivityType.NOTE)
    activity_date = models.DateField()
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True, default="")
    image_url = models.URLField(blank=True, default="")
    cost_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    materials = models.JSONField(default=list, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-activity_date", "-created_at"]

    def __str__(self) -> str:
        return f"{self.plot_id}::{self.activity_type}::{self.activity_date}"


class TraceabilityRecord(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="traceability_records")
    plot = models.ForeignKey(FarmPlot, on_delete=models.CASCADE, related_name="traceability_records")
    public_token = models.SlugField(max_length=80, unique=True, default=build_public_token)
    product_name = models.CharField(max_length=160)
    public_settings = models.JSONField(default=dict, blank=True)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.public_token


class AgriculturalInput(models.Model):
    class Category(models.TextChoices):
        PESTICIDE = "pesticide", "Pesticide"
        FERTILIZER = "fertilizer", "Fertilizer"
        NUTRITION = "nutrition", "Nutrition"

    category = models.CharField(max_length=40, choices=Category.choices)
    name = models.CharField(max_length=160)
    group = models.CharField(max_length=120, blank=True, default="")
    active_ingredient = models.CharField(max_length=160, blank=True, default="")
    usage = models.TextField(blank=True, default="")
    suitable_crops = models.JSONField(default=list, blank=True)
    related_diseases = models.JSONField(default=list, blank=True)
    safety_notes = models.JSONField(default=list, blank=True)
    withholding_period_days = models.PositiveIntegerField(null=True, blank=True)
    warning = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category", "name"]

    def __str__(self) -> str:
        return self.name


class NutritionSymptom(models.Model):
    nutrient = models.CharField(max_length=120)
    symptom = models.TextField()
    affected_crops = models.JSONField(default=list, blank=True)
    recommendation = models.TextField(blank=True, default="")
    safety_notes = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["nutrient"]

    def __str__(self) -> str:
        return self.nutrient
