const LEGACY_DEFAULT_USER_NAME = "người dùng leafiq";
const DEFAULT_USER_NAME = "Người dùng AgromindAI";

export function normalizeUserDisplayName(name?: string | null) {
  const normalizedName = name?.trim();

  if (!normalizedName || normalizedName.toLocaleLowerCase("vi-VN") === LEGACY_DEFAULT_USER_NAME) {
    return DEFAULT_USER_NAME;
  }

  return normalizedName;
}
