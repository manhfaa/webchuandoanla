from rest_framework.throttling import SimpleRateThrottle


class PlanCatalogueRateThrottle(SimpleRateThrottle):
    scope = "plan_catalogue"

    def get_cache_key(self, request, view):
        # Nginx restores REMOTE_ADDR only from trusted Cloudflare peers. Never
        # let a caller reset this counter with a forged forwarded header.
        return self.cache_format % {"scope": self.scope, "ident": request.META.get("REMOTE_ADDR", "unknown")}
