const LEGACY_DEFAULT_USER_NAME = "người dùng leafiq";
const DEFAULT_USER_NAME = "Người dùng AgromindAI";

/**
 * English twin of the stand-in name. The normalized name is persisted in the
 * session store, so the swap cannot happen here - it happens where the name is
 * shown, via `displayUserName`.
 */
export const DEFAULT_USER_NAME_EN = "Agromind AI user";

export function normalizeUserDisplayName(name?: string | null) {
  const normalizedName = name?.trim();

  if (!normalizedName || normalizedName.toLocaleLowerCase("vi-VN") === LEGACY_DEFAULT_USER_NAME) {
    return DEFAULT_USER_NAME;
  }

  return normalizedName;
}

/**
 * `normalizeUserDisplayName` for the screen: identical, except the stand-in
 * name follows the active language. A name the user actually set is never
 * touched, in either language.
 */
export function displayUserName(name: string | null | undefined, tr: (vi: string, en: string) => string) {
  const normalizedName = normalizeUserDisplayName(name);
  return normalizedName === DEFAULT_USER_NAME ? tr(DEFAULT_USER_NAME, DEFAULT_USER_NAME_EN) : normalizedName;
}
