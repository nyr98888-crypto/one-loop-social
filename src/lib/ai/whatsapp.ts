/**
 * Normalize an Israeli (or international) phone into digits for wa.me/972...
 */
export function normalizeIsraeliWhatsAppDigits(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("972")) {
    digits = digits.slice(3);
  }
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  return digits ? `972${digits}` : "";
}

/** Build click-to-chat URL with optional pre-filled greeting. */
export function buildWaMeLink(phone: string, greeting?: string): string {
  const e164 = normalizeIsraeliWhatsAppDigits(phone);
  if (!e164) return "";

  const base = `https://wa.me/${e164}`;
  if (!greeting?.trim()) return base;
  return `${base}?text=${encodeURIComponent(greeting.trim())}`;
}
