from ipaddress import ip_address


def client_ip(request) -> str:
    """Read the peer IP, or Nginx's verified IP on the Unix-socket deployment."""
    remote = str(request.META.get("REMOTE_ADDR") or "").strip()
    candidate = remote or str(request.META.get("HTTP_X_REAL_IP") or "").strip()
    try:
        return str(ip_address(candidate))
    except ValueError:
        return "unknown"
