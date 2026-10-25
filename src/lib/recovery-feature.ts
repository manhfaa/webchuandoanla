// Keep the production UI hidden until the VPS migration and API are live.
export const recoveryFeatureEnabled =
  process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_RECOVERY_ENABLED === "1";
