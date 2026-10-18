from django.conf import settings
from django.core.cache import cache
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import ServicePlan


def invalidate_public_plans():
    days = max(1, int(getattr(settings, "SEPAY_SUBSCRIPTION_DAYS", 30)))
    cache.delete(f"public-service-plans-v1-{days}")


@receiver(post_save, sender=ServicePlan)
@receiver(post_delete, sender=ServicePlan)
def plan_changed(**_kwargs):
    invalidate_public_plans()
