import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import {
  isGoogleAuthConfigured,
  resolveGoogleCredentials,
} from "@/lib/auth/config";

const googleCreds = resolveGoogleCredentials();

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: googleCreds
    ? [
        Google({
          clientId: googleCreds.clientId,
          clientSecret: googleCreds.clientSecret,
        }),
      ]
    : [],
  // Keep the app bootable before AUTH_SECRET is configured locally.
  secret:
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "one-loop-dev-only-secret-replace-in-production",
  pages: {
    signIn: "/",
    error: "/",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  // AUTH_TRUST_HOST=true in .env is also honored by Auth.js
  trustHost: true,
  debug: process.env.NODE_ENV === "development" && isGoogleAuthConfigured(),
});
