const ACCESS_COOKIE = "__Host-agromind_access";
const REFRESH_COOKIE = "__Host-agromind_refresh";

function readCookie(request: Request, name: string): string | null {
  const entry = request.headers.get("cookie")?.split(";").find((part) => part.trim().startsWith(`${name}=`));
  return entry ? entry.trim().slice(name.length + 1) : null;
}

export function accessCookie(request: Request): string | null {
  return readCookie(request, ACCESS_COOKIE);
}

export function refreshCookie(request: Request): string | null {
  return readCookie(request, REFRESH_COOKIE);
}

export function backendAuthorization(request: Request): string | null {
  const access = accessCookie(request);
  if (!access) return null;
  // Existing JWT cookies migrate on refresh; new browser cookies are opaque.
  return access.split(".").length === 3 ? `Bearer ${access}` : `Session ${access}`;
}

export function isSameOriginMutation(request: Request): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) return true;
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}

export const sessionCookies = { access: ACCESS_COOKIE, refresh: REFRESH_COOKIE } as const;
