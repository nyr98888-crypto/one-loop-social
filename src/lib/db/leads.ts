import { db, initDb } from "./client";
import type { LeadRow, LeadStatus } from "./schema";

export type { LeadRow, LeadStatus };

export interface CreateLeadInput {
  sourceHeadline: string;
  sourceDate: string;
  customerName: string;
  customerPhone: string;
  serviceDetails?: string;
  status?: LeadStatus;
}

export interface UpdateLeadInput {
  status?: LeadStatus;
  serviceDetails?: string;
  incrementWhatsappClicks?: boolean;
}

const VALID_STATUSES = new Set<LeadStatus>(["new", "in_progress", "closed"]);

function newId(): string {
  return crypto.randomUUID();
}

function mapLeadRow(row: Record<string, unknown>): LeadRow {
  const statusRaw = String(row.status ?? "new");
  const status: LeadStatus = VALID_STATUSES.has(statusRaw as LeadStatus)
    ? (statusRaw as LeadStatus)
    : "new";

  return {
    id: String(row.id),
    source_headline: String(row.source_headline ?? ""),
    source_date: String(row.source_date ?? ""),
    customer_name: String(row.customer_name ?? ""),
    customer_phone: String(row.customer_phone ?? ""),
    service_details: String(row.service_details ?? ""),
    status,
    whatsapp_clicks: Number(row.whatsapp_clicks ?? 0),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

const SEED_LEADS: CreateLeadInput[] = [
  {
    sourceHeadline: "טיפול פנים זוהר במחיר מבצע",
    sourceDate: "2026-10-20",
    customerName: "נועה כהן",
    customerPhone: "0523456789",
    serviceDetails: "טיפול פנים + ייעוץ שגרת טיפוח",
    status: "new",
  },
  {
    sourceHeadline: "בדיקת רכב לפני חורף — הנחה ללקוחות חדשים",
    sourceDate: "2026-10-18",
    customerName: "יוסי לוי",
    customerPhone: "0509876543",
    serviceDetails: "בדיקת חורף מלאה לרכב פרטי",
    status: "in_progress",
  },
  {
    sourceHeadline: "חבילת ניקוי דירה לפני כניסה",
    sourceDate: "2026-10-12",
    customerName: "מיכל אברהם",
    customerPhone: "0541122334",
    serviceDetails: "ניקוי דירת 3 חדרים לפני כניסה",
    status: "closed",
  },
];

/** List leads newest-first. Seeds demo rows when the table is empty. */
export async function listLeads(): Promise<LeadRow[]> {
  await initDb();

  const existing = await db.execute({
    sql: `SELECT COUNT(*) AS c FROM leads`,
  });
  const count = Number(existing.rows[0]?.c ?? 0);
  if (count === 0) {
    for (const seed of SEED_LEADS) {
      await createLead(seed);
    }
  }

  const result = await db.execute({
    sql: `
      SELECT
        id, source_headline, source_date, customer_name, customer_phone,
        service_details, status, whatsapp_clicks, created_at, updated_at
      FROM leads
      ORDER BY datetime(created_at) DESC
    `,
  });

  return result.rows.map((row) =>
    mapLeadRow(row as unknown as Record<string, unknown>),
  );
}

export async function createLead(input: CreateLeadInput): Promise<LeadRow> {
  await initDb();

  const id = newId();
  const status: LeadStatus =
    input.status && VALID_STATUSES.has(input.status) ? input.status : "new";

  await db.execute({
    sql: `
      INSERT INTO leads (
        id, source_headline, source_date, customer_name, customer_phone,
        service_details, status, whatsapp_clicks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `,
    args: [
      id,
      input.sourceHeadline.trim(),
      input.sourceDate.trim(),
      input.customerName.trim(),
      input.customerPhone.trim(),
      (input.serviceDetails ?? "").trim(),
      status,
    ],
  });

  const lead = await getLeadById(id);
  if (!lead) throw new Error("Failed to create lead");
  return lead;
}

export async function getLeadById(id: string): Promise<LeadRow | null> {
  await initDb();

  const result = await db.execute({
    sql: `
      SELECT
        id, source_headline, source_date, customer_name, customer_phone,
        service_details, status, whatsapp_clicks, created_at, updated_at
      FROM leads WHERE id = ? LIMIT 1
    `,
    args: [id],
  });

  const row = result.rows[0];
  if (!row) return null;
  return mapLeadRow(row as unknown as Record<string, unknown>);
}

export async function updateLead(
  id: string,
  input: UpdateLeadInput,
): Promise<LeadRow | null> {
  await initDb();

  const current = await getLeadById(id);
  if (!current) return null;

  const nextStatus =
    input.status && VALID_STATUSES.has(input.status)
      ? input.status
      : current.status;
  const nextService =
    typeof input.serviceDetails === "string"
      ? input.serviceDetails.trim()
      : current.service_details;
  const nextClicks = input.incrementWhatsappClicks
    ? current.whatsapp_clicks + 1
    : current.whatsapp_clicks;

  await db.execute({
    sql: `
      UPDATE leads
      SET status = ?, service_details = ?, whatsapp_clicks = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    args: [nextStatus, nextService, nextClicks, id],
  });

  return getLeadById(id);
}

export function isValidLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && VALID_STATUSES.has(value as LeadStatus);
}
