# Agromind API origin lock

An origin that answers direct requests when the Host header is
`api.agromind.farm` bypasses Cloudflare. Apply these snippets on the VPS before
relying on WAF, Access or Cloudflare rate limits. Never commit the origin IP.
Removing the IP from current files does not erase old Git history; rotate the
origin address or use an outbound-only tunnel if the address must stay private.

```bash
sudo cp deploy/nginx/cloudflare-origin.conf /etc/nginx/conf.d/cloudflare-origin.conf
sudo cp deploy/nginx/cloudflare-server-guard.inc /etc/nginx/snippets/cloudflare-server-guard.inc
```

Add this inside both the port 80 and port 443 `server` blocks for
`api.agromind.farm`:

```nginx
include /etc/nginx/snippets/cloudflare-server-guard.inc;
```

Validate before reload. Keep the existing SSH session open until the edge test
passes so a bad Nginx edit can be rolled back.

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -k -I --resolve api.agromind.farm:443:ORIGIN_IP https://api.agromind.farm/api/health/
curl -I https://api.agromind.farm/api/health/
```

The direct request must close with status `444`; the Cloudflare URL must remain
`200`. The IP list comes from `https://www.cloudflare.com/ips/` and should be
reviewed periodically.

Protect `/admin/*` with a Cloudflare Access self-hosted application before
administrators use it. Allow only the administrator email/identity. Do not rely
on the Django login screen alone.

## Public plan catalogue

The plan list stays anonymous so web and Android can show prices before login.
Its Django response is cached for 30 seconds per worker, and the web BFF permits
60 seconds of Vercel CDN caching for only this exact GET URL. Changes made in
one worker invalidate that worker immediately; other workers and the CDN may
continue showing the previous price for up to their TTL. Checkout always uses
the current server-side plan price.

Gunicorn uses a Unix socket, where `REMOTE_ADDR` is empty. Nginx must overwrite
`X-Real-IP` with its restored Cloudflare visitor IP, and the Gunicorn socket
must be restricted to Nginx's user/group; Django uses this header only when the
peer address is empty. The VPS systemd service uses Gunicorn `--umask 0o117`
to create a `660` socket owned by `www-data:www-data`. Do not expose the socket
to other local users.

To cap uncached direct requests, install `plan-catalogue-limit.conf` in Nginx's
`http` context and include `plan-catalogue-server.inc` in the
`api.agromind.farm` server block. Ensure the server's API location inherits
`limit_req` and that Cloudflare's verified real-IP setup is active first;
otherwise shared Cloudflare addresses may be limited together. Run `nginx -t`,
reload, then check a normal Android/web read and a controlled burst for 429.
The configured 10 requests/second with burst 30 is a starting threshold; adjust
against production traffic. Django also caps a restored client IP at 120 reads
per minute as a fallback; that in-process counter is not DDoS protection. Do
not put a managed challenge on this JSON API.
