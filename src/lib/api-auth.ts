const DJANGO_BASE_URL = process.env.DJANGO_BASE_URL ?? "http://127.0.0.1:8000";

/**
 * Verify the caller is a signed-in user by validating their JWT against Django
 * (`/api/users/me/`). The AI routes call paid providers (DeepSeek/Tavily), so
 * gating them prevents anonymous abuse / cost exhaustion. Returns true only for
 * a valid Bearer token.
 */
export async function isAuthenticatedRequest(request: Request): Promise<boolean> {
  const authorization = request.headers.get("authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) return false;

  try {
    const base = DJANGO_BASE_URL.endsWith("/") ? DJANGO_BASE_URL : `${DJANGO_BASE_URL}/`;
    const res = await fetch(new URL("api/users/me/", base), {
      method: "GET",
      headers: { authorization },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}
