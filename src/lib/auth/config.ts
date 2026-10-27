/**
 * Google OAuth is ready when NextAuth secrets + Google client credentials exist.
 * Supports Auth.js v5 names and legacy NEXTAUTH_* / GOOGLE_CLIENT_* aliases.
 */
function resolveAuthSecret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    ""
  );
}

export function isGoogleAuthConfigured(): boolean {
  const googleId =
    process.env.AUTH_GOOGLE_ID?.trim() ||
    process.env.GOOGLE_CLIENT_ID?.trim();
  const googleSecret =
    process.env.AUTH_GOOGLE_SECRET?.trim() ||
    process.env.GOOGLE_CLIENT_SECRET?.trim();
  const authSecret = resolveAuthSecret();

  return Boolean(
    googleId &&
      googleSecret &&
      authSecret &&
      !googleId.includes("your-") &&
      !googleSecret.includes("your-") &&
      !authSecret.includes("your-"),
  );
}

export function resolveGoogleCredentials(): {
  clientId: string;
  clientSecret: string;
} | null {
  if (!isGoogleAuthConfigured()) return null;
  return {
    clientId: (process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID)!,
    clientSecret: (process.env.AUTH_GOOGLE_SECRET ||
      process.env.GOOGLE_CLIENT_SECRET)!,
  };
}
