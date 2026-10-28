"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Eye,
  MessageCircle,
  Sparkles,
  Star,
} from "lucide-react";
import { usePostStore } from "@/store/usePostStore";

const WEEKLY_INSIGHT =
  "תמונת מצב שבועית: הפוסטים השבוע הניבו 18 פניות ישירות בוואטסאפ. פוסטים בימי חמישי בצהריים עבדו פי 2.4 טוב יותר. בוא נכין פוסט דומה לחמישי הקרוב.";

const METRICS = [
  {
    key: "wa",
    icon: MessageCircle,
    display: "💬 18",
    label: "פניות בוואטסאפ",
    hint: "מעקב קליקים מ־wa.me?ref=post_id",
    tint: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  {
    key: "cal",
    icon: CalendarDays,
    display: "📅 6",
    label: "תיאומים ביומן",
    hint: "פגישות שנרשמו השבוע",
    tint: "bg-sky-50 text-sky-700 border-sky-100",
  },
  {
    key: "reach",
    icon: Eye,
    display: "👁️ 1,420",
    label: "חשיפה בסושיאל",
    hint: "אינטראקציות מצטברות",
    tint: "bg-violet-50 text-violet-700 border-violet-100",
  },
  {
    key: "rating",
    icon: Star,
    display: "⭐ 4.9",
    label: "דירוג ביקורות",
    hint: "Google / איזי · 100% נענו",
    tint: "bg-amber-50 text-amber-700 border-amber-100",
  },
] as const;

const RECENT_POSTS = [
  {
    id: "post_thu_lunch",
    title: "מארזי שישי חמים",
    platform: "אינסטגרם + וואטסאפ",
    inquiries: 7,
    when: "חמישי 12:40",
  },
  {
    id: "post_story_flash",
    title: "מבצע שעה אחרונה",
    platform: "סטורי / פייסבוק",
    inquiries: 5,
    when: "רביעי 18:15",
  },
  {
    id: "post_wa_broadcast",
    title: "שידור קהילה לשבת",
    platform: "וואטסאפ Broadcast",
    inquiries: 4,
    when: "חמישי 16:05",
  },
  {
    id: "post_reels_hook",
    title: "רילס — ריח מהתנור",
    platform: "אינסטגרם",
    inquiries: 2,
    when: "שני 11:20",
  },
] as const;

const PERF_SEED_PROMPT =
  "פוסט מבוסס ביצועים לחמישי בצהריים: מבצע דומה למה שעבד פי 2.4 השבוע — הצעה חמה עם CTA ברור לוואטסאפ, דחיפות קלה, וזווית ויזואלית מגרה בלי אנשים ברקע.";

export default function PerformanceDashboard() {
  const router = useRouter();
  const setPostGoal = usePostStore((s) => s.setPostGoal);
  const setIsGenerated = usePostStore((s) => s.setIsGenerated);

  function createPerformancePost() {
    setIsGenerated(false);
    setPostGoal(PERF_SEED_PROMPT);
    router.push("/");
  }

  return (
    <div dir="rtl" className="mx-auto max-w-5xl space-y-6 px-3 py-6 sm:px-5">
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          ביצועים ואפקטיביות
        </h1>
        <p className="text-sm text-slate-500">
          תובנות הסוכן השיווקי · מעקב פניות מ־wa.me עם{" "}
          <code className="rounded bg-slate-100 px-1 text-[11px]">?ref=post_id</code>
        </p>
      </header>

      {/* Weekly Agent Insight Banner */}
      <section className="overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-l from-sky-50 via-white to-cyan-50 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-sky-700">
              <Sparkles className="h-3.5 w-3.5" />
              תובנת סוכן שבועית
            </p>
            <p className="text-sm leading-relaxed text-slate-800 sm:text-[15px]">
              {WEEKLY_INSIGHT}
            </p>
          </div>
          <button
            type="button"
            onClick={createPerformancePost}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-sky-500/25 transition hover:brightness-105"
          >
            ✨ צור פוסט מבוסס ביצועים
          </button>
        </div>
      </section>

      {/* 4 value metrics */}
      <section
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        aria-label="מדדי ערך"
      >
        {METRICS.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.key}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div
                className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border ${m.tint}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold tabular-nums text-slate-900">
                {m.display}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {m.label}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">{m.hint}</p>
            </div>
          );
        })}
      </section>

      {/* Breakdown table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">
            פירוט פוסטים אחרונים
          </h2>
          <Link
            href="/leads"
            className="text-[11px] font-semibold text-sky-700 hover:text-sky-900"
          >
            לכל הלידים ←
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-right text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">פוסט</th>
                <th className="px-4 py-2.5">פלטפורמה</th>
                <th className="px-4 py-2.5">מתי</th>
                <th className="px-4 py-2.5">פניות WA</th>
                <th className="px-4 py-2.5">ref</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_POSTS.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-slate-100 text-slate-800"
                >
                  <td className="px-4 py-3 font-medium">{row.title}</td>
                  <td className="px-4 py-3 text-slate-600">{row.platform}</td>
                  <td className="px-4 py-3 text-slate-500">{row.when}</td>
                  <td className="px-4 py-3 font-bold tabular-nums text-emerald-700">
                    {row.inquiries}
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                      ?ref={row.id}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
