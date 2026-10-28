"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageCircle,
  Phone,
  RefreshCw,
} from "lucide-react";
import {
  buildGoogleCalendarTemplateUrl,
  downloadIcsFile,
} from "@/lib/calendar";
import { buildWaMeLink } from "@/lib/ai/whatsapp";
import { useToastStore } from "@/store/useToastStore";

type LeadStatus = "new" | "in_progress" | "closed";

interface Lead {
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

const STATUS_META: Record<
  LeadStatus,
  { label: string; className: string }
> = {
  new: {
    label: "פנייה חדשה",
    className: "bg-orange-100 text-orange-800 ring-orange-200",
  },
  in_progress: {
    label: "בטיפול",
    className: "bg-sky-100 text-sky-800 ring-sky-200",
  },
  closed: {
    label: "נסגר",
    className: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  },
};

const STATUS_ORDER: LeadStatus[] = ["new", "in_progress", "closed"];

const WEEKDAY_LABELS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

export default function LeadsPage() {
  const showToast = useToastStore((s) => s.showToast);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads");
      const data = (await res.json().catch(() => null)) as {
        leads?: Lead[];
        error?: string;
      } | null;
      if (!res.ok || !data?.leads) {
        throw new Error(data?.error || "טעינת לידים נכשלה");
      }
      setLeads(data.leads);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "שגיאה בטעינה");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  const scheduledVisits = useMemo(
    () => leads.filter((l) => l.status !== "closed"),
    [leads],
  );

  const visitsByDate = useMemo(() => {
    const map = new Map<string, Lead[]>();
    for (const lead of scheduledVisits) {
      const key = lead.source_date;
      const list = map.get(key) ?? [];
      list.push(lead);
      map.set(key, list);
    }
    return map;
  }, [scheduledVisits]);

  const selectedVisits = useMemo(() => {
    if (selectedDay) return visitsByDate.get(selectedDay) ?? [];
    return scheduledVisits;
  }, [selectedDay, visitsByDate, scheduledVisits]);

  async function patchLead(
    id: string,
    body: Record<string, unknown>,
  ): Promise<Lead | null> {
    setBusyId(id);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as {
        lead?: Lead;
        error?: string;
      } | null;
      if (!res.ok || !data?.lead) {
        throw new Error(data?.error || "עדכון נכשל");
      }
      setLeads((prev) =>
        prev.map((l) => (l.id === data.lead!.id ? data.lead! : l)),
      );
      return data.lead;
    } catch (err) {
      showToast(err instanceof Error ? err.message : "שגיאה בעדכון");
      return null;
    } finally {
      setBusyId(null);
    }
  }

  async function cycleStatus(lead: Lead) {
    const idx = STATUS_ORDER.indexOf(lead.status);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    const updated = await patchLead(lead.id, { status: next });
    if (updated) {
      showToast(`סטטוס: ${STATUS_META[updated.status].label}`);
    }
  }

  async function openWhatsApp(lead: Lead) {
    const link = buildWaMeLink(
      lead.customer_phone,
      `שלום ${lead.customer_name}, לגבי: ${lead.source_headline}`,
    );
    if (!link) {
      showToast("מספר טלפון לא תקין");
      return;
    }
    await patchLead(lead.id, { incrementWhatsappClicks: true });
    window.open(link, "_blank", "noopener,noreferrer");
  }

  function addToCalendar(lead: Lead) {
    const event = {
      title: `${lead.customer_name} — ${lead.source_headline}`,
      customerPhone: lead.customer_phone,
      serviceDetails: lead.service_details || lead.source_headline,
      start: parseLeadDate(lead.source_date),
    };
    const url = buildGoogleCalendarTemplateUrl(event);
    window.open(url, "_blank", "noopener,noreferrer");
    downloadIcsFile(event, `lead-${lead.customer_name}.ics`);
    showToast("נפתח Google Calendar + הורדת ‎.ics");
  }

  function shiftMonth(delta: number) {
    setCalendarMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1),
    );
    setSelectedDay(null);
  }

  function setMonthIndex(monthIndex: number) {
    setCalendarMonth(
      (prev) => new Date(prev.getFullYear(), monthIndex, 1),
    );
    setSelectedDay(null);
  }

  function setYear(year: number) {
    setCalendarMonth((prev) => new Date(year, prev.getMonth(), 1));
    setSelectedDay(null);
  }

  function syncGoogleCalendar() {
    const focus = selectedVisits[0] ?? scheduledVisits[0] ?? null;
    if (!focus) {
      window.open(
        "https://calendar.google.com/",
        "_blank",
        "noopener,noreferrer",
      );
      showToast("נפתח Google Calendar");
      return;
    }
    const event = {
      title: `${focus.customer_name} — ${focus.source_headline}`,
      customerPhone: focus.customer_phone,
      serviceDetails: focus.service_details || focus.source_headline,
      start: parseLeadDate(focus.source_date),
    };
    window.open(
      buildGoogleCalendarTemplateUrl(event),
      "_blank",
      "noopener,noreferrer",
    );
    downloadIcsFile(event, `lead-${focus.customer_name}.ics`);
    showToast("מסנכרן עם Google Calendar");
  }

  const monthCells = useMemo(
    () => buildMonthCells(calendarMonth),
    [calendarMonth],
  );

  const monthLabel = calendarMonth.toLocaleDateString("he-IL", {
    month: "long",
  });
  const yearValue = calendarMonth.getFullYear();
  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => y - 2 + i);
  }, []);
  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Date(2020, i, 1).toLocaleDateString("he-IL", { month: "long" }),
      ),
    [],
  );

  return (
    <div className="no-scrollbar h-[calc(100vh-54px)] overflow-hidden bg-gradient-to-b from-sky-light/40 via-studio-bg to-slate-100/80">
      <div className="mx-auto flex h-full w-full max-w-none flex-col px-3 py-2 sm:px-6 sm:py-3">
        <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-2 lg:gap-5">
          {/* Right (RTL first): hot leads */}
          <section className="no-scrollbar flex min-h-0 w-full flex-col overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-light text-sky-hover">
                <MessageCircle className="h-4 w-4" aria-hidden />
              </span>
              <h2 className="text-base font-bold text-slate-900">
                פניות ולידים חמים
              </h2>
            </div>

            {loading && leads.length === 0 ? (
              <div className="flex flex-1 items-center justify-center gap-2 py-16 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin text-sky-brand" />
                טוען לידים…
              </div>
            ) : leads.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-12 text-center text-slate-500">
                אין לידים עדיין.
              </p>
            ) : (
              <ul className="no-scrollbar max-h-[min(28rem,55vh)] space-y-3 overflow-y-auto">
                {leads.map((lead) => (
                  <li
                    key={lead.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition hover:border-sky-brand/25 hover:bg-sky-light/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900">
                          {lead.customer_name}
                        </p>
                        <p
                          className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"
                          dir="ltr"
                        >
                          <Phone className="h-3 w-3" aria-hidden />
                          {lead.customer_phone}
                        </p>
                      </div>
                      <StatusButton
                        status={lead.status}
                        disabled={busyId === lead.id}
                        onClick={() => void cycleStatus(lead)}
                      />
                    </div>

                    <p className="mt-3 text-sm font-medium text-slate-700">
                      {lead.source_headline}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatHebrewDate(lead.source_date)}
                      {lead.whatsapp_clicks > 0
                        ? ` · ${lead.whatsapp_clicks} קליקי וואטסאפ`
                        : ""}
                    </p>
                    {lead.service_details ? (
                      <p className="mt-2 text-xs leading-relaxed text-slate-500">
                        {lead.service_details}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busyId === lead.id}
                        onClick={() => void openWhatsApp(lead)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100 transition hover:bg-emerald-100 disabled:opacity-60"
                      >
                        <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                        וואטסאפ
                      </button>
                      <button
                        type="button"
                        onClick={() => addToCalendar(lead)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-sky-brand px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-hover"
                      >
                        <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
                        הוסף ליומן הטלפון
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Left: my calendar — full card width */}
          <section className="no-scrollbar flex min-h-0 w-full flex-col overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <CalendarDays className="h-4 w-4" aria-hidden />
                </span>
                <h2 className="text-base font-bold text-slate-900">היומן שלי</h2>
              </div>
              <button
                type="button"
                onClick={syncGoogleCalendar}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#4285F4]/30 bg-[#4285F4]/10 px-3 py-2 text-[11px] font-bold text-[#4285F4] transition hover:bg-[#4285F4]/15"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                סנכרן עם Google Calendar
              </button>
            </div>

            <div className="mb-4 w-full rounded-2xl border border-slate-100 bg-slate-50/80 p-3 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => shiftMonth(-1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-sky-brand/40 hover:text-sky-hover"
                    aria-label="חודש קודם"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <select
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-800"
                    value={calendarMonth.getMonth()}
                    onChange={(e) => setMonthIndex(Number(e.target.value))}
                    aria-label="בחירת חודש"
                  >
                    {monthOptions.map((label, i) => (
                      <option key={label} value={i}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-800"
                    value={yearValue}
                    onChange={(e) => setYear(Number(e.target.value))}
                    aria-label="בחירת שנה"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => shiftMonth(1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-sky-brand/40 hover:text-sky-hover"
                    aria-label="חודש הבא"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm font-bold text-slate-700">
                  {monthLabel} {yearValue}
                </p>
              </div>

              <div className="mb-1 grid w-full grid-cols-7 gap-1.5 text-center text-[10px] font-semibold text-slate-400 sm:gap-2">
                {WEEKDAY_LABELS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="grid w-full grid-cols-7 gap-1.5 sm:gap-2">
                {monthCells.map((cell, index) => {
                  if (!cell) {
                    return <span key={`pad-${index}`} />;
                  }
                  const iso = toIsoDate(cell);
                  const hasVisits = visitsByDate.has(iso);
                  const isSelected = selectedDay === iso;
                  const isToday = iso === todayIso();
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() =>
                        setSelectedDay((prev) => (prev === iso ? null : iso))
                      }
                      className={[
                        "relative flex aspect-square w-full items-center justify-center rounded-lg text-xs font-semibold transition sm:text-sm",
                        isSelected
                          ? "bg-sky-brand text-white shadow-sm"
                          : isToday
                            ? "bg-sky-light text-sky-hover ring-1 ring-sky-brand/30"
                            : "text-slate-700 hover:bg-white",
                        hasVisits && !isSelected
                          ? "after:absolute after:bottom-1 after:h-1 after:w-1 after:rounded-full after:bg-sky-brand"
                          : "",
                      ].join(" ")}
                    >
                      {cell.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-500">
                {selectedDay
                  ? `ביקורים ב־${formatHebrewDate(selectedDay)}`
                  : "כל הביקורים הפתוחים"}
              </p>
              {selectedDay ? (
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="text-[11px] font-medium text-sky-hover hover:underline"
                >
                  הצג הכל
                </button>
              ) : null}
            </div>

            {loading && scheduledVisits.length === 0 ? (
              <div className="flex flex-1 items-center justify-center gap-2 py-10 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin text-sky-brand" />
                טוען יומן…
              </div>
            ) : selectedVisits.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center text-sm text-slate-500">
                אין פגישות מתוזמנות לתאריך זה.
              </p>
            ) : (
              <ul className="space-y-3">
                {selectedVisits.map((lead) => (
                  <li
                    key={`cal-${lead.id}`}
                    className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900">
                          {lead.customer_name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatHebrewDate(lead.source_date)} ·{" "}
                          {lead.service_details || lead.source_headline}
                        </p>
                      </div>
                      <StatusButton
                        status={lead.status}
                        disabled={busyId === lead.id}
                        onClick={() => void cycleStatus(lead)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => addToCalendar(lead)}
                      className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-brand px-3 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-sky-hover"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
                      הוסף ליומן הטלפון
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function StatusButton({
  status,
  disabled,
  onClick,
}: {
  status: LeadStatus;
  disabled?: boolean;
  onClick: () => void;
}) {
  const meta = STATUS_META[status];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title="לחצו להחלפת סטטוס"
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 transition hover:opacity-90 disabled:opacity-60 ${meta.className}`}
    >
      {meta.label}
    </button>
  );
}

function formatHebrewDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function parseLeadDate(isoDate: string): Date {
  const d = new Date(`${isoDate}T10:00:00`);
  if (Number.isNaN(d.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 1);
    fallback.setHours(10, 0, 0, 0);
    return fallback;
  }
  return d;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayIso(): string {
  return toIsoDate(new Date());
}

/** Sunday-first month grid cells (null = padding). */
function buildMonthCells(monthStart: Date): (Date | null)[] {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startPad = first.getDay(); // 0 = Sunday
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
