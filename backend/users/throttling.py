import hashlib

from rest_framework.throttling import SimpleRateThrottle


class LoginEmailRateThrottle(SimpleRateThrottle):
    """Rate-limit sign-in attempts per target account, not per IP address.

    Keying on the IP meant one grower on a shared 4G/village connection could
    burn the whole allowance and lock everybody behind that NAT out of their own
    accounts. The brute-force protection that actually matters — many guesses
    against one account — is preserved by keying on the submitted address.
    """

    scope = "login"

    def get_cache_key(self, request, view):
        email = ""
        if isinstance(request.data, dict):
            email = str(request.data.get("email") or "").strip().lower()
        if not email:
            # Nothing to attribute the attempt to; the IP throttle still applies.
            return None
        digest = hashlib.sha256(email.encode("utf-8")).hexdigest()
        return self.cache_format % {"scope": self.scope, "ident": digest}


class LoginIPRateThrottle(SimpleRateThrottle):
    """Coarse per-IP ceiling so email-keyed throttling cannot be sidestepped by
    walking through a list of addresses. Deliberately far looser than the
    per-account limit, since several people may legitimately share one IP."""

    scope = "login_ip"
    rate = "60/min"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class PasswordResetRateThrottle(SimpleRateThrottle):
    """Reset requests send mail to a third party, so cap them per IP."""

    scope = "password_reset"
    rate = "8/hour"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}
