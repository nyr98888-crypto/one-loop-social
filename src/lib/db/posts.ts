import { db } from "./client";
import { initDb } from "./schema";

export interface SaveGeneratedPostInput {
  businessName: string;
  industry: string;
  headline: string;
  igCaption: string;
  fbCaption: string;
  imageUrl?: string | null;
  status?: "draft" | "generated" | "published";
}

export interface SavedPostRecord {
  id: string;
  businessId: string;
  headline: string;
  igCaption: string;
  fbCaption: string;
  imageUrl: string | null;
  status: string;
  createdAt: string;
}

function newId(): string {
  return crypto.randomUUID();
}

/** Find business by name or create a new one. */
export async function upsertBusiness(input: {
  name: string;
  industry: string;
}): Promise<string> {
  await initDb();

  const existing = await db.execute({
    sql: `SELECT id FROM businesses WHERE name = ? LIMIT 1`,
    args: [input.name],
  });

  const row = existing.rows[0];
  if (row && typeof row.id === "string") {
    await db.execute({
      sql: `UPDATE businesses SET industry = ? WHERE id = ?`,
      args: [input.industry, row.id],
    });
    return row.id;
  }

  const id = newId();
  await db.execute({
    sql: `INSERT INTO businesses (id, name, industry) VALUES (?, ?, ?)`,
    args: [id, input.name, input.industry],
  });
  return id;
}

/** Persist a generated marketing post (creates/updates the business first). */
export async function saveGeneratedPost(
  input: SaveGeneratedPostInput,
): Promise<SavedPostRecord> {
  await initDb();

  const businessId = await upsertBusiness({
    name: input.businessName,
    industry: input.industry,
  });

  const id = newId();
  const status = input.status ?? "generated";
  const imageUrl = input.imageUrl ?? null;

  await db.execute({
    sql: `INSERT INTO posts (
      id, business_id, headline, ig_caption, fb_caption, image_url, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      businessId,
      input.headline,
      input.igCaption,
      input.fbCaption,
      imageUrl,
      status,
    ],
  });

  const result = await db.execute({
    sql: `SELECT id, business_id, headline, ig_caption, fb_caption, image_url, status, created_at
          FROM posts WHERE id = ?`,
    args: [id],
  });

  const saved = result.rows[0];
  return {
    id: String(saved?.id ?? id),
    businessId: String(saved?.business_id ?? businessId),
    headline: String(saved?.headline ?? input.headline),
    igCaption: String(saved?.ig_caption ?? input.igCaption),
    fbCaption: String(saved?.fb_caption ?? input.fbCaption),
    imageUrl:
      saved?.image_url == null ? imageUrl : String(saved.image_url),
    status: String(saved?.status ?? status),
    createdAt: String(saved?.created_at ?? new Date().toISOString()),
  };
}
