import "server-only";

import { createClient, type Client } from "@libsql/client";
import {
  SCHEMA_STATEMENTS,
  type PostDraftVariantRow,
} from "./schema";

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
  __oneLoopDbInit?: Promise<void>;
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

/**
 * Ensures core tables exist. Safe to call repeatedly — runs once per process.
 */
export async function initDb(): Promise<void> {
  if (!globalForDb.__oneLoopDbInit) {
    globalForDb.__oneLoopDbInit = (async () => {
      await db.batch([...SCHEMA_STATEMENTS], "write");
    })().catch((err) => {
      globalForDb.__oneLoopDbInit = undefined;
      throw err;
    });
  }

  await globalForDb.__oneLoopDbInit;
}

/** Remove draft variants older than 24 hours to avoid abandoned-session bloat. */
export async function cleanExpiredDrafts(): Promise<number> {
  await initDb();

  const result = await db.execute({
    sql: `DELETE FROM post_draft_variants WHERE created_at < datetime('now', '-24 hours')`,
  });

  return Number(result.rowsAffected ?? 0);
}

/** Fetch all active draft variants for a session, ordered by variant_index ASC. */
export async function getVariantsBySession(
  sessionId: string,
): Promise<PostDraftVariantRow[]> {
  await initDb();

  const result = await db.execute({
    sql: `
      SELECT
        id,
        session_id,
        variant_index,
        image_url,
        headline,
        ig_caption,
        fb_caption,
        created_at
      FROM post_draft_variants
      WHERE session_id = ?
      ORDER BY variant_index ASC
    `,
    args: [sessionId],
  });

  return result.rows.map((row) => ({
    id: String(row.id),
    session_id: String(row.session_id),
    variant_index: Number(row.variant_index),
    image_url: String(row.image_url),
    headline: row.headline == null ? null : String(row.headline),
    ig_caption: row.ig_caption == null ? null : String(row.ig_caption),
    fb_caption: row.fb_caption == null ? null : String(row.fb_caption),
    created_at: String(row.created_at),
  }));
}
