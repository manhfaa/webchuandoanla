import { NextResponse } from "next/server";

const DJANGO_BASE_URL = process.env.DJANGO_BASE_URL ?? "http://127.0.0.1:8000";

function buildTargetUrl(req: Request, pathSegments: string[]) {
  const incoming = new URL(req.url);
  const base = DJANGO_BASE_URL.endsWith("/") ? DJANGO_BASE_URL : `${DJANGO_BASE_URL}/`;
  const target = new URL(pathSegments.join("/"), base);
  // Most Django REST endpoints use trailing slashes; hitting without slash causes redirects.
  if (!target.pathname.endsWith("/")) target.pathname += "/";
  target.search = incoming.search;
  return target;
}

async function proxy(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const targetUrl = buildTargetUrl(req, path);

  const headers = new Headers();
  const incomingHeaders = new Headers(req.headers);
  const contentType = incomingHeaders.get("content-type");
  const authorization = incomingHeaders.get("authorization");

  if (contentType) headers.set("content-type", contentType);
  if (authorization) headers.set("authorization", authorization);

  const method = req.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);

  const res = await fetch(targetUrl, {
    method,
    headers,
    body: hasBody ? await req.arrayBuffer() : undefined,
    redirect: "manual",
    cache: "no-store",
  });

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
