"""Limit the optional preview without granting Django administrator rights."""

from django.conf import settings


def can_access_preview(user):
    if not user.is_authenticated or not user.is_active:
        return False
    permitted_ids = {value.strip() for value in getattr(settings, "DEVELOPER_PREVIEW_USER_IDS", "").split(",") if value.strip().isdigit()}
    return bool(user.is_staff or str(user.pk) in permitted_ids)
