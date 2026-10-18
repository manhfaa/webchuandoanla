import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";

import { resolveDjangoBaseUrl } from "@/lib/backend-url";
import { backendAuthorization, isSameOriginMutation, refreshCookie, sessionCookies } from "@/lib/server-session";

const DJANGO_BASE_URL = resolveDjangoBaseUrl(process.env.DJANGO_BASE_URL);
const BASE = DJANGO_BASE_URL.endsWith("/") ? DJANGO_BASE_URL : `${DJANGO_BASE_URL}/`;
const ALLOWED_ORIGIN = new URL(BASE).origin;
const MAX_PROXY_BODY_BYTES = 12 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 45_000;
const TOKEN_PAIR_PATHS = new Set([
  "api/auth/login/",
  "api/auth/google/",
  "api/auth/refresh/",
  "api/auth/password-reset/confirm/",
  "api/users/change-password/",
]);
const WEB_SESSION_PREFIX = "api/auth/web-session/";

function isLegacyJwt(value: string): boolean {
  return value.split(".").length === 3;
}

function setSessionCookie(response: NextResponse, name: string, value: string, maxAge: number, path: string) {
  response.cookies.set(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path,
    maxAge,
  });
}

function clearSessionCookies(response: NextResponse) {
  setSessionCookie(response, sessionCookies.access, "", 0, "/");
  setSessionCookie(response, sessionCookies.refresh, "", 0, "/");
}

function buildTargetUrl(req: Request, pathSegments: string[]) {
  const incoming = new URL(req.url);
  const target = new URL(pathSegments.join("/"), BASE);
  // SSRF guard: `new URL(userPath, base)` silently ignores the base when the
  // path resolves to an absolute or protocol-relative URL (e.g. "http://evil"
  // or "//evil"). Refuse anything that escapes the Django origin.
  if (target.origin !== ALLOWED_ORIGIN || !target.pathname.startsWith("/api/")) return null;
  if (target.pathname.startsWith("/api/payments/webhooks/")) return null;
  // Most Django REST endpoints use trailing slashes; hitting without slash causes redirects.
  if (!target.pathname.endsWith("/")) target.pathname += "/";
  target.search = incoming.search;
  return target;
}

const TIMEOUT_CODES = new Set([
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
]);

function isTimeoutError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { name?: unknown; code?: unknown; cause?: unknown };
  if (["AbortError", "TimeoutError", "HeadersTimeoutError"].includes(String(candidate.name))) return true;
  if (typeof candidate.code === "string" && TIMEOUT_CODES.has(candidate.code)) return true;
  const cause = candidate.cause as { name?: unknown; code?: unknown } | undefined;
  if (cause && typeof cause === "object") {
    if (cause.name === "TimeoutError") return true;
    if (typeof cause.code === "string" && TIMEOUT_CODES.has(cause.code)) return true;
  }
  return false;
}

async function proxy(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  if (!isSameOriginMutation(req)) {
    return NextResponse.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  }
  const { path } = await ctx.params;
  const endpoint = path.join("/").replace(/\/+$/, "") + "/";
  if (endpoint.startsWith(WEB_SESSION_PREFIX)) {
    return NextResponse.json({ error: "Đường dẫn không hợp lệ." }, { status: 404 });
  }
  const targetUrl = buildTargetUrl(req, path);
  if (!targetUrl) {
    return NextResponse.json({ error: "Đường dẫn không hợp lệ." }, { status: 400 });
  }

  const headers = new Headers();
  const incomingHeaders = new Headers(req.headers);
  const contentType = incomingHeaders.get("content-type");
  const authorization = backendAuthorization(req);

  if (contentType) headers.set("content-type", contentType);
  // Public auth actions must work even when a previous cookie has expired.
  // Django may authenticate headers before evaluating AllowAny permissions.
  if (authorization && !endpoint.startsWith("api/auth/")) headers.set("authorization", authorization);
  const userAgent = incomingHeaders.get("user-agent");
  if (userAgent) headers.set("user-agent", userAgent.slice(0, 512));

  // This signs Vercel's observed IP only. Behind Cloudflare it may be a
  // shared proxy IP, so production registration limits live at Cloudflare.
  const proxySecret = process.env.REGISTRATION_PROXY_SECRET;
  const visitorIp = process.env.VERCEL ? incomingHeaders.get("x-vercel-forwarded-for") : null;
  if (proxySecret && visitorIp && isIP(visitorIp)) {
    headers.set("x-agromind-client-ip", visitorIp);
    headers.set("x-agromind-ip-signature", createHmac("sha256", proxySecret).update(visitorIp).digest("hex"));
  }

  const method = req.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);
  const declaredLength = Number(incomingHeaders.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PROXY_BODY_BYTES) {
    return NextResponse.json({ error: "Dữ liệu gửi lên quá lớn." }, { status: 413 });
  }

  let body: ArrayBuffer | undefined;
  if (hasBody) {
    const reader = req.body?.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_PROXY_BODY_BYTES) {
          await reader.cancel();
          return NextResponse.json({ error: "Dữ liệu gửi lên quá lớn." }, { status: 413 });
        }
        chunks.push(value);
      }
    }
    const buffer = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }
    body = buffer.buffer;
    if (body.byteLength > MAX_PROXY_BODY_BYTES) {
      return NextResponse.json({ error: "Dữ liệu gửi lên quá lớn." }, { status: 413 });
    }
  }

  const sessionOperation = method === "POST" && (endpoint === "api/auth/refresh/" || endpoint === "api/auth/logout/");
  const storedRefresh = sessionOperation ? refreshCookie(req) : null;
  const opaqueSessionOperation = Boolean(storedRefresh && !isLegacyJwt(storedRefresh));
  if (sessionOperation && storedRefresh) {
    // Never trust a caller-supplied refresh body over the HttpOnly cookie.
    body = new TextEncoder().encode(JSON.stringify({ refresh: storedRefresh })).buffer;
    headers.set("content-type", "application/json");
  }
  const upstreamUrl = opaqueSessionOperation
    ? new URL(`api/auth/web-session/${endpoint === "api/auth/refresh/" ? "refresh" : "logout"}/`, BASE)
    : targetUrl;

  let res: Response;
  try {
    res = await fetch(upstreamUrl, {
      method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    // The upstream Django service can be unavailable during a VPS restart or
    // network incident. Answer with a clear message instead of an opaque 500.
    const timedOut = isTimeoutError(error);
    const failure = NextResponse.json(
      {
        error: timedOut
          ? "Máy chủ phản hồi quá lâu. Vui lòng thử lại sau ít phút."
          : "Chưa kết nối được máy chủ. Vui lòng thử lại sau ít phút.",
      },
      { status: timedOut ? 504 : 502 },
    );
    if (method === "POST" && endpoint === "api/auth/logout/") clearSessionCookies(failure);
    return failure;
  }

  const resHeaders = new Headers(res.headers);
  resHeaders.delete("set-cookie");
  resHeaders.delete("content-encoding");
  resHeaders.delete("content-length");
  resHeaders.delete("transfer-encoding");
  resHeaders.set("cache-control", "no-store");

  if (method === "POST" && endpoint === "api/auth/logout/") {
    const response = new NextResponse(res.body, { status: res.status, headers: resHeaders });
    clearSessionCookies(response);
    return response;
  }

  if (method === "POST" && res.ok && TOKEN_PAIR_PATHS.has(endpoint)) {
    const payload = (await res.json()) as Record<string, unknown>;
    if (typeof payload.access !== "string" || typeof payload.refresh !== "string") {
      return NextResponse.json({ error: "Phiên đăng nhập không hợp lệ." }, { status: 502 });
    }
    let pair = { access: payload.access, refresh: payload.refresh };
    if (!opaqueSessionOperation) {
      try {
        const exchanged = await fetch(new URL("api/auth/web-session/exchange/", BASE), {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${payload.access}` },
          body: JSON.stringify({ refresh: payload.refresh }),
          cache: "no-store",
          signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        });
        if (!exchanged.ok) throw new Error(`Session exchange failed: ${exchanged.status}`);
        pair = (await exchanged.json()) as typeof pair;
        if (typeof pair.access !== "string" || typeof pair.refresh !== "string" ||
            isLegacyJwt(pair.access) || isLegacyJwt(pair.refresh)) {
          throw new Error("Invalid opaque session response");
        }
      } catch {
        return NextResponse.json({ error: "Chưa tạo được phiên đăng nhập an toàn. Vui lòng thử lại." }, { status: 502 });
      }
    }
    const response = NextResponse.json(
      { ...payload, access: "session", refresh: "" },
      { status: res.status, headers: resHeaders },
    );
    setSessionCookie(response, sessionCookies.access, pair.access, 30 * 60, "/");
    setSessionCookie(response, sessionCookies.refresh, pair.refresh, 7 * 24 * 60 * 60, "/");
    return response;
  }

  const response = new NextResponse(res.body, {
    status: res.status,
    headers: resHeaders,
  });
  if (method === "POST" && endpoint === "api/auth/refresh/" && !res.ok) clearSessionCookies(response);
  return response;
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
