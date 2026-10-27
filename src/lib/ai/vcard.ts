export interface VCardFields {
  fullName?: string;
  org?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  url?: string;
  note?: string;
}

function escapeVCard(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** Build a minimal vCard 3.0 string from filled digital-card fields. */
export function buildVCard(fields: VCardFields): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0"];
  const name = fields.fullName?.trim() || fields.org?.trim();
  if (name) {
    lines.push(`FN:${escapeVCard(name)}`);
    lines.push(`N:${escapeVCard(name)};;;;`);
  }
  if (fields.org?.trim()) {
    lines.push(`ORG:${escapeVCard(fields.org.trim())}`);
  }
  const wa = fields.whatsapp?.trim();
  if (wa) {
    lines.push(`TEL;TYPE=CELL,VOICE,WhatsApp:${escapeVCard(wa)}`);
  }
  const phone = fields.phone?.trim();
  if (phone && phone !== wa) {
    lines.push(`TEL;TYPE=WORK,VOICE:${escapeVCard(phone)}`);
  }
  if (fields.email?.trim()) {
    lines.push(`EMAIL;TYPE=INTERNET:${escapeVCard(fields.email.trim())}`);
  }
  if (fields.url?.trim()) {
    const raw = fields.url.trim();
    const href = raw.startsWith("http") ? raw : `https://${raw}`;
    lines.push(`URL:${escapeVCard(href)}`);
  }
  if (fields.note?.trim()) {
    lines.push(`NOTE:${escapeVCard(fields.note.trim())}`);
  }
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export function downloadVCard(fields: VCardFields, fileName = "contact.vcf"): void {
  const body = buildVCard(fields);
  const blob = new Blob([body], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
