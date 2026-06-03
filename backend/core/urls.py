from django.contrib import admin
from django.urls import include, path

from .views import health_check

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check, name="health-check"),
    path("api/auth/", include("users.urls")),
    path("api/users/", include("users.urls_profile")),
    path("api/diagnoses/", include("diagnoses.urls")),
    path("api/engagement/", include("engagement.urls")),
    path("api/payments/", include("payments.urls")),
    path("api/crop-plans/", include("crop_plans.urls")),
    path("api/", include("farmops.urls")),
]
