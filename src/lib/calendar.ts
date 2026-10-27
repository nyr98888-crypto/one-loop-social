/**
 * Phone-calendar helpers — Google Calendar TEMPLATE + downloadable .ics
 * Safe for client components (no server secrets).
 */

export interface CalendarEventInput {
  title: string;
  customerPhone: string;
  serviceDetails: string;
  /** Start time; defaults to tomorrow 10:00 local. */
  start?: Date;
  /** Duration in minutes; default 60. */
  durationMinutes?: number;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** UTC stamp for ICS: YYYYMMDDTHHMMSSZ */
export function toIcsUtc(date: Date): string {
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

/** Compact local stamp for Google Calendar TEMPLATE dates= param. */
export function toGoogleCalendarStamp(date: Date): string {
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

function defaultStart(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d;
}

function resolveRange(input: CalendarEventInput): { start: Date; end: Date } {
  const start = input.start ?? defaultStart();
  const end = new Date(
    start.getTime() + (input.durationMinutes ?? 60) * 60_000,
  );
  return { start, end };
}

function buildDetails(input: CalendarEventInput): string {
  const lines = [
    input.serviceDetails.trim() || "פרטי שירות",
    `טלפון לקוח: ${input.customerPhone.trim()}`,
  ];
  return lines.join("\n");
}

/** Google Calendar “Add event” TEMPLATE deep link. */
export function buildGoogleCalendarTemplateUrl(
  input: CalendarEventInput,
): string {
  const { start, end } = resolveRange(input);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title.trim() || "פגישה עם לקוח",
    details: buildDetails(input),
    dates: `${toGoogleCalendarStamp(start)}/${toGoogleCalendarStamp(end)}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** RFC 5545 .ics body for download / native calendar apps. */
export function buildIcsContent(input: CalendarEventInput): string {
  const { start, end } = resolveRange(input);
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@oneloopsocial`;
  const summary = (input.title.trim() || "פגישה עם לקוח").replace(
    /[\n\r]/g,
    " ",
  );
  const description = buildDetails(input)
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//One Loop Social//HE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

/** Trigger a browser download of the .ics file. */
export function downloadIcsFile(
  input: CalendarEventInput,
  filename = "meeting.ics",
): void {
  const blob = new Blob([buildIcsContent(input)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
