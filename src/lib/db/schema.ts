import { db } from "./client";

let initPromise: Promise<void> | null = null;

/**
 * Ensures core tables exist. Safe to call repeatedly — runs once per process.
 */
export async function initDb(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await db.batch(
        [
          `CREATE TABLE IF NOT EXISTS businesses (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            industry TEXT NOT NULL DEFAULT '',
            logo_url TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )`,
          `CREATE TABLE IF NOT EXISTS posts (
            id TEXT PRIMARY KEY,
            business_id TEXT NOT NULL,
            headline TEXT NOT NULL DEFAULT '',
            ig_caption TEXT NOT NULL DEFAULT '',
            fb_caption TEXT NOT NULL DEFAULT '',
            image_url TEXT,
            status TEXT NOT NULL DEFAULT 'draft',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (business_id) REFERENCES businesses(id)
          )`,
          `CREATE INDEX IF NOT EXISTS idx_posts_business_id ON posts(business_id)`,
          `CREATE INDEX IF NOT EXISTS idx_businesses_name ON businesses(name)`,
        ],
        "write",
      );
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }

  await initPromise;
}
