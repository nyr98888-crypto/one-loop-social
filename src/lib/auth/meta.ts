/**
 * Meta (Facebook / Instagram) Graph API credentials.
 * When missing, the Connect Center uses stub connect/disconnect for UX.
 */
export function isMetaAuthConfigured(): boolean {
  const appId =
    process.env.META_APP_ID?.trim() ||
    process.env.FACEBOOK_CLIENT_ID?.trim() ||
    process.env.AUTH_FACEBOOK_ID?.trim();
  const appSecret =
    process.env.META_APP_SECRET?.trim() ||
    process.env.FACEBOOK_CLIENT_SECRET?.trim() ||
    process.env.AUTH_FACEBOOK_SECRET?.trim();

  return Boolean(
    appId &&
      appSecret &&
      !appId.includes("your-") &&
      !appSecret.includes("your-"),
  );
}
