# Include inside every public `server {}` block for api.agromind.farm.
# `$realip_remote_addr` retains the proxy address after real_ip_header rewrites
# `$remote_addr`, so legitimate visitors are not accidentally denied.
if ($agromind_from_cloudflare = 0) {
    return 444;
}
