# Cloudflare security setup

Use this checklist after the production domain is added to Cloudflare.

## DNS

- Add the production frontend hostname as a proxied `CNAME` to Vercel.
- Keep the cloud orange/proxied for the public website.
- Keep backend API domains proxied only if they are intended to be accessed through Cloudflare. Render's default domain can stay direct.

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

2. Challenge obvious abuse on API routes.

```text
(http.request.uri.path contains "/api/" and cf.bot_management.score lt 10)
```

Action: Managed Challenge

3. Rate-limit sensitive routes.

```text
http.request.uri.path in {"/login" "/register" "/api/chat" "/api/research-symptoms"}
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

## Environment values

If the final Cloudflare domain is not `agromindai.vercel.app`, update:

```env
NEXT_PUBLIC_SITE_URL=https://your-domain.com
FRONTEND_ORIGIN=https://your-domain.com
CORS_ALLOWED_ORIGINS=https://your-domain.com
CSRF_TRUSTED_ORIGINS=https://webchuandoanla-backend.onrender.com,https://your-domain.com
```

Set frontend values in Vercel and backend values in Render, then redeploy both services.
