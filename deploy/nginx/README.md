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
