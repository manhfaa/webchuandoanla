from django.contrib import admin
from django.urls import include, path

from .views import health_check, mobile_config, run_housekeeping_view

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check, name="health-check"),
    # Read by the Android app before the first screen, so it stays public and
    # returns nothing an anonymous caller should not see.
    path("api/mobile/config/", mobile_config, name="mobile-config"),
    # Triggered by the GitHub Actions scheduler, not by a browser.
    path("api/maintenance/housekeeping/", run_housekeeping_view, name="run-housekeeping"),
    path("api/auth/", include("users.urls")),
    path("api/users/", include("users.urls_profile")),
    path("api/diagnoses/", include("diagnoses.urls")),
    path("api/engagement/", include("engagement.urls")),
    path("api/payments/", include("payments.urls")),
    path("api/crop-plans/", include("crop_plans.urls")),
    path("api/", include("farmops.urls")),
]
