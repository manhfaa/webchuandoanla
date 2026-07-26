"""Publish the crop-plan quota in the catalogue instead of leaving it in code.

The comparison table on the pricing page sells a per-plan crop-plan quota, but
``ServicePlan.metadata`` had no key for it, so ``payments.entitlements`` fell
back to ``DEFAULT_CROP_PLAN_LIMITS`` — the same numbers typed a second time in
Python. Two copies of a number drift; this puts the quota on the row that is
already the source of truth for every other cap, and the pricing page reads it
straight from ``GET /api/engagement/plans/``.

Elite is written as ``null`` on purpose. ``_crop_plan_cap`` reads ``0`` as
"literally zero allowed" (that is Seed, which sells no crop plans) and
``null``/``""`` as "unlimited" — the opposite of the ``0 == unlimited``
convention the daily/history caps use.
"""

from django.db import migrations

QUOTA_KEY = "crop_plans"

# Mirrors the published comparison table: Seed none, Grow 2, Bloom 10, Elite
# unlimited. After this runs the numbers live in the database, not in code.
CROP_PLAN_QUOTAS = {"seed": 0, "grow": 2, "bloom": 10, "elite": None}


def add_crop_plan_quota(apps, schema_editor):
    ServicePlan = apps.get_model("engagement", "ServicePlan")

    for slug, quota in CROP_PLAN_QUOTAS.items():
        plan = ServicePlan.objects.filter(slug=slug).first()
        if plan is None:
            # A deployment may not carry every plan (or may have renamed one).
            # Seeding rows is migration 0004's job; this one only annotates.
            continue
        # Merge into a copy so the daily/history/report keys already sold on the
        # pricing page survive; replacing the dict would silently drop them.
        metadata = dict(plan.metadata) if isinstance(plan.metadata, dict) else {}
        metadata[QUOTA_KEY] = quota
        plan.metadata = metadata
        plan.save(update_fields=["metadata", "updated_at"])


def remove_crop_plan_quota(apps, schema_editor):
    ServicePlan = apps.get_model("engagement", "ServicePlan")

    for slug in CROP_PLAN_QUOTAS:
        plan = ServicePlan.objects.filter(slug=slug).first()
        if plan is None or not isinstance(plan.metadata, dict) or QUOTA_KEY not in plan.metadata:
            continue
        # Remove only the key this migration added; anything an operator set on
        # the plan afterwards stays untouched.
        metadata = dict(plan.metadata)
        metadata.pop(QUOTA_KEY, None)
        plan.metadata = metadata
        plan.save(update_fields=["metadata", "updated_at"])


class Migration(migrations.Migration):
    dependencies = [
        ("engagement", "0004_sync_billing_plans"),
    ]

    operations = [
        migrations.RunPython(add_crop_plan_quota, remove_crop_plan_quota),
    ]
