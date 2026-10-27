/**
 * Turso / libSQL schema for permanent posts and temporary draft variants.
 * Table creation is executed by `initDb()` in `./client`.
 */

export const BUSINESSES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`.trim();

/** Permanent chosen posts. */
export const POSTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  business_id TEXT,
  headline TEXT,
  ig_caption TEXT,
  fb_caption TEXT,
  selected_image_url TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`.trim();

/** Temporary drafts — max 4 variants per session. */
export const POST_DRAFT_VARIANTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS post_draft_variants (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  variant_index INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  headline TEXT,
  ig_caption TEXT,
  fb_caption TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`.trim();

export const POST_DRAFT_VARIANTS_SESSION_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_post_draft_variants_session_id
ON post_draft_variants(session_id)
`.trim();

export const BUSINESSES_NAME_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_businesses_name ON businesses(name)
`.trim();

/** Simple lead CRM — inquiries from social posts. */
export const LEADS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  source_headline TEXT NOT NULL,
  source_date TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  service_details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  whatsapp_clicks INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`.trim();

export const LEADS_STATUS_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)
`.trim();

export const SCHEMA_STATEMENTS = [
  BUSINESSES_TABLE_SQL,
  POSTS_TABLE_SQL,
  POST_DRAFT_VARIANTS_TABLE_SQL,
  POST_DRAFT_VARIANTS_SESSION_INDEX_SQL,
  BUSINESSES_NAME_INDEX_SQL,
  LEADS_TABLE_SQL,
  LEADS_STATUS_INDEX_SQL,
] as const;

export type LeadStatus = "new" | "in_progress" | "closed";

export interface LeadRow {
  id: string;
  source_headline: string;
  source_date: string;
  customer_name: string;
  customer_phone: string;
  service_details: string;
  status: LeadStatus;
  whatsapp_clicks: number;
  created_at: string;
  updated_at: string;
}

export interface PostRow {
  id: string;
  business_id: string | null;
  headline: string | null;
  ig_caption: string | null;
  fb_caption: string | null;
  selected_image_url: string;
  created_at: string;
}

export interface PostDraftVariantRow {
  id: string;
  session_id: string;
  variant_index: number;
  image_url: string;
  headline: string | null;
  ig_caption: string | null;
  fb_caption: string | null;
  created_at: string;
}
