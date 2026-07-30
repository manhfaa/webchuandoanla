import { NextResponse } from "next/server";

import { resolveDjangoBaseUrl } from "@/lib/backend-url";

const DJANGO_BASE_URL = resolveDjangoBaseUrl(process.env.DJANGO_BASE_URL);
const BASE = DJANGO_BASE_URL.endsWith("/") ? DJANGO_BASE_URL : `${DJANGO_BASE_URL}/`;
const ALLOWED_ORIGIN = new URL(BASE).origin;

function buildTargetUrl(req: Request, pathSegments: string[]) {
  const incoming = new URL(req.url);
  const target = new URL(pathSegments.join("/"), BASE);
  // SSRF guard: `new URL(userPath, base)` silently ignores the base when the
  // path resolves to an absolute or protocol-relative URL (e.g. "http://evil"
  // or "//evil"). Refuse anything that escapes the Django origin.
  if (target.origin !== ALLOWED_ORIGIN) return null;
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
  if (candidate.name === "TimeoutError" || candidate.name === "HeadersTimeoutError") return true;
  if (typeof candidate.code === "string" && TIMEOUT_CODES.has(candidate.code)) return true;
  const cause = candidate.cause as { name?: unknown; code?: unknown } | undefined;
  if (cause && typeof cause === "object") {
    if (cause.name === "TimeoutError") return true;
    if (typeof cause.code === "string" && TIMEOUT_CODES.has(cause.code)) return true;
  }
  return false;
}

async function proxy(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const targetUrl = buildTargetUrl(req, path);
  if (!targetUrl) {
    return NextResponse.json({ error: "Đường dẫn không hợp lệ." }, { status: 400 });
  }

  const headers = new Headers();
  const incomingHeaders = new Headers(req.headers);
  const contentType = incomingHeaders.get("content-type");
  const authorization = incomingHeaders.get("authorization");

  if (contentType) headers.set("content-type", contentType);
  if (authorization) headers.set("authorization", authorization);

  const method = req.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);

  let res: Response;
  try {
    res = await fetch(targetUrl, {
      method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      redirect: "manual",
      cache: "no-store",
    });
  } catch (error) {
    // The upstream Django service can be asleep (Render free tier) or simply
    // unreachable. Answer with a clear message instead of an opaque 500.
    const timedOut = isTimeoutError(error);
    return NextResponse.json(
      {
        error: timedOut
          ? "Máy chủ phản hồi quá lâu. Vui lòng thử lại sau ít phút."
          : "Chưa kết nối được máy chủ. Vui lòng thử lại sau ít phút.",
      },
      { status: timedOut ? 504 : 502 },
    );
  }

  const resHeaders = new Headers(res.headers);
  resHeaders.delete("set-cookie"); // keep auth purely token-based in frontend
  resHeaders.delete("content-encoding");
  resHeaders.delete("content-length");
  resHeaders.delete("transfer-encoding");

  return new NextResponse(res.body, {
    status: res.status,
    headers: resHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
