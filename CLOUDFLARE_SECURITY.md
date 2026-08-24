# Cloudflare security setup

Use this checklist after the production domain is added to Cloudflare.

## DNS

- Add the production frontend hostname as a proxied `CNAME` to Vercel.
- Keep the cloud orange/proxied for the public website.
- Keep `api.agromind.farm` proxied only if the VPS origin, TLS mode and webhook traffic have been verified through Cloudflare.

## Lock the VPS origin first

Before enabling WAF rules, apply `deploy/nginx/cloudflare-origin.conf` and
`deploy/nginx/cloudflare-server-guard.inc` as described in
`deploy/nginx/README.md`. WAF and bot controls are bypassable while the VPS IP
answers requests directly.

Create a Cloudflare Access self-hosted application for
`api.agromind.farm/admin/*` and allow only the administrator identity.

## SSL/TLS

- Set SSL/TLS mode to `Full (strict)`.
- Enable `Always Use HTTPS`.
- Enable `Automatic HTTPS Rewrites`.
- Enable HSTS only after the site works correctly over HTTPS. Use a short max-age first, then increase later.

## WAF rules

Create these custom rules:

1. Block non-browser methods on the frontend.

```text
(http.request.method in {"TRACE" "TRACK"})
```

Action: Block

2. Challenge obvious abuse on API routes (only when Bot Management score is
available on the account plan).

```text
(http.request.uri.path contains "/api/" and cf.bot_management.score lt 10)
```

Action: Managed Challenge

3. Rate-limit sensitive routes.

```text
http.request.uri.path in {"/api/auth/login/" "/api/auth/register/" "/api/auth/google/" "/api/diagnoses/research-symptoms/" "/api/engagement/chat/respond/"}
```

Suggested action: Managed Challenge or rate limit.

## Bot and DDoS

- Enable Bot Fight Mode if available on the plan.
- Keep Cloudflare DDoS protection enabled.
- Set Security Level to `Medium` for normal operation.
- Use Under Attack Mode only during active attacks.

## Headers already handled by the app

The Next.js app sends these headers from `next.config.js`:

- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`

Do not duplicate conflicting CSP rules in Cloudflare Transform Rules unless you intentionally replace the app policy.

## Email authentication

Start DMARC reporting with this DNS record, then move to quarantine/reject only
after SPF and DKIM reports are clean:

```text
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@agromind.farm; adkim=s; aspf=s
```

## Environment values

If the final Cloudflare domain is not `agromind.farm`, update:

```env
NEXT_PUBLIC_SITE_URL=https://your-domain.com
FRONTEND_ORIGIN=https://your-domain.com
CORS_ALLOWED_ORIGINS=https://your-domain.com
CSRF_TRUSTED_ORIGINS=https://api.your-domain.com,https://your-domain.com
```

Set frontend URL values in Vercel and backend origin values in the VPS environment file loaded by `agromind-backend`, then restart the systemd service.
