import "server-only";

import { db, getVariantsBySession, initDb } from "./client";
import type { PostDraftVariantRow } from "./schema";

export interface InsertDraftVariantInput {
  sessionId: string;
  variantIndex: number;
  imageUrl: string;
  headline?: string | null;
  igCaption?: string | null;
  fbCaption?: string | null;
}

export async function insertDraftVariant(
  input: InsertDraftVariantInput,
): Promise<PostDraftVariantRow> {
  await initDb();

  const id = crypto.randomUUID();

  await db.execute({
    sql: `
      INSERT INTO post_draft_variants (
        id, session_id, variant_index, image_url, headline, ig_caption, fb_caption
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      id,
      input.sessionId,
      input.variantIndex,
      input.imageUrl,
      input.headline ?? null,
      input.igCaption ?? null,
      input.fbCaption ?? null,
    ],
  });

  const variants = await getVariantsBySession(input.sessionId);
  const created = variants.find((v) => v.id === id);
  if (!created) {
    throw new Error("Failed to read inserted draft variant");
  }
  return created;
}

/** Delete all draft variants for a session (start over). */
export async function purgeDraftVariantsBySession(
  sessionId: string,
): Promise<number> {
  await initDb();

  const result = await db.execute({
    sql: `DELETE FROM post_draft_variants WHERE session_id = ?`,
    args: [sessionId],
  });

  return Number(result.rowsAffected ?? 0);
}

export async function getDraftVariantById(
  variantId: string,
): Promise<PostDraftVariantRow | null> {
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
      WHERE id = ?
      LIMIT 1
    `,
    args: [variantId],
  });

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: String(row.id),
    session_id: String(row.session_id),
    variant_index: Number(row.variant_index),
    image_url: String(row.image_url),
    headline: row.headline == null ? null : String(row.headline),
    ig_caption: row.ig_caption == null ? null : String(row.ig_caption),
    fb_caption: row.fb_caption == null ? null : String(row.fb_caption),
    created_at: String(row.created_at),
  };
}

export interface CommitDraftVariantInput {
  sessionId: string;
  selectedVariantId: string;
  businessId?: string | null;
}

/**
 * Promote a winning draft variant into permanent `posts`, then purge the session.
 * Insert + delete run in a single write batch for atomicity.
 */
export async function commitDraftVariant(
  input: CommitDraftVariantInput,
): Promise<{ savedPostId: string }> {
  await initDb();

  const variant = await getDraftVariantById(input.selectedVariantId);
  if (!variant) {
    throw new Error("Selected variant not found");
  }
  if (variant.session_id !== input.sessionId) {
    throw new Error("Variant does not belong to this session");
  }
  if (!variant.image_url.trim()) {
    throw new Error("Variant is missing selected_image_url");
  }

  const savedPostId = crypto.randomUUID();
  const businessId = input.businessId?.trim() || null;

  await db.batch(
    [
      {
        sql: `
          INSERT INTO posts (
            id, business_id, headline, ig_caption, fb_caption, selected_image_url
          ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        args: [
          savedPostId,
          businessId,
          variant.headline,
          variant.ig_caption,
          variant.fb_caption,
          variant.image_url,
        ],
      },
      {
        sql: `DELETE FROM post_draft_variants WHERE session_id = ?`,
        args: [input.sessionId],
      },
    ],
    "write",
  );

  return { savedPostId };
}
