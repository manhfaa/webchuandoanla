"""Server-side clients for the AI providers Agromind pays for.

These used to live in `src/app/api/*/route.ts` on Vercel, which meant the
DeepSeek and Tavily keys were only reachable from Next.js. A native Android
client cannot call a provider directly and must not treat the website as a
secret-holding backend, so the keys — and the orchestration that spends them —
belong here, behind the same JWT, ownership and quota checks as everything else.

Nothing in this package writes a request body, an API key or a raw provider
response to the log. Failures are raised as `ProviderNotConfigured` (503) or
`ProviderFailed` (502) naming the step that broke, so the app can tell "chưa bật
dịch vụ" apart from "nhà cung cấp lỗi" without parsing prose.
"""

from .base import ProviderFailed, ProviderNotConfigured

__all__ = ["ProviderFailed", "ProviderNotConfigured"]
