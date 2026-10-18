from rest_framework.throttling import SimpleRateThrottle

from core.client_address import client_ip


class PlanCatalogueRateThrottle(SimpleRateThrottle):
    scope = "plan_catalogue"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": client_ip(request)}
