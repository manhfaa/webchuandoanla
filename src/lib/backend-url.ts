export const DEFAULT_DJANGO_BASE_URL = "https://api.agromind.farm";

const LEGACY_RENDER_BASE_URL = "https://webchuandoanla-backend.onrender.com";

export function resolveDjangoBaseUrl(configured?: string) {
  const value = configured?.trim().replace(/\/+$/, "");
  if (!value || value === LEGACY_RENDER_BASE_URL) return DEFAULT_DJANGO_BASE_URL;
  return value;
}
