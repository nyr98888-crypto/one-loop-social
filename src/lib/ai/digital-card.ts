import { buildWaMeLink } from "@/lib/ai/whatsapp";

export interface DigitalCardFields {
  businessName?: string;
  slogan?: string;
  whatsappNumber?: string;
  directPhone?: string;
  email?: string;
  serviceArea?: string;
  openingHours?: string;
  website?: string;
  bio?: string;
}

/** Build shareable Hebrew card text from whichever fields are filled. */
export function buildDigitalCardShareText(fields: DigitalCardFields): string {
  const lines: string[] = [];
  const name = fields.businessName?.trim();
  const slogan = fields.slogan?.trim();
  const bio = fields.bio?.trim();
  const wa = fields.whatsappNumber?.trim();
  const phone = fields.directPhone?.trim();
  const email = fields.email?.trim();
  const area = fields.serviceArea?.trim();
  const hours = fields.openingHours?.trim();
  const web = fields.website?.trim();

  if (name) lines.push(`📇 ${name}`);
  if (slogan) lines.push(slogan);
  if (bio) {
    if (lines.length) lines.push("");
    lines.push(bio);
  }
  if (wa || phone || email || area || hours || web) {
    if (lines.length) lines.push("");
  }
  if (wa) lines.push(`💬 וואטסאפ: ${wa}`);
  if (phone) lines.push(`📞 טלפון: ${phone}`);
  if (email) lines.push(`✉️ ${email}`);
  if (area) lines.push(`📍 ${area}`);
  if (hours) lines.push(`🕐 ${hours}`);
  if (web) lines.push(`🌐 ${web}`);

  const waLink = wa ? buildWaMeLink(wa) : "";
  if (waLink) {
    lines.push("");
    lines.push(waLink);
  }

  return lines.join("\n").trim();
}

export function buildDigitalCardShareUrl(fields: DigitalCardFields): string {
  const text =
    buildDigitalCardShareText(fields) ||
    "שלום! הנה כרטיס הביקור הדיגיטלי שלי.";
  const wa = fields.whatsappNumber?.trim();
  if (wa) {
    const link = buildWaMeLink(wa, text);
    if (link) return link;
  }
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
