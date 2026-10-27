import { createClient, type Client } from "@libsql/client";

const PLACEHOLDER_URL = "libsql://your-database-name.turso.io";

export function resolveDatabaseUrl(): string {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (!url || url === PLACEHOLDER_URL || url.includes("your-database-name")) {
    return "file:local.db";
  }
  return url;
}

export function resolveAuthToken(): string | undefined {
  const token = process.env.TURSO_AUTH_TOKEN?.trim();
  if (
    !token ||
    token === "your-turso-auth-token" ||
    token.includes("your-turso")
  ) {
    return undefined;
  }
  return token;
}

export function getDatabaseMode(): "local" | "turso" {
  return resolveDatabaseUrl().startsWith("file:") ? "local" : "turso";
}

const globalForDb = globalThis as unknown as {
  __oneLoopDb?: Client;
};

function createDbClient(): Client {
  const url = resolveDatabaseUrl();
  const authToken = resolveAuthToken();

  return createClient({
    url,
    ...(authToken ? { authToken } : {}),
  });
}

/** Singleton libSQL client — Turso cloud or local `file:local.db` fallback. */
export const db: Client = globalForDb.__oneLoopDb ?? createDbClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__oneLoopDb = db;
}

export function isLocalDatabase(): boolean {
  return resolveDatabaseUrl().startsWith("file:");
}
