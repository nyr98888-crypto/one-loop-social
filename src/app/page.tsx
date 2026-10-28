"use client";

import { useState } from "react";
import CreationForm from "@/components/studio/CreationForm";
import SessionLockBanner from "@/components/studio/SessionLockBanner";
import SocialAssetsColumn from "@/components/studio/SocialAssetsColumn";
import WhatsAppPreview from "@/components/studio/WhatsAppPreview";

const PILLARS = [
  {
    icon: "🚀",
    title: "פוסט מותאם לסושיאל שלך",
    body: "Meta, LinkedIn, Google, Easy בלחיצה אחת",
    tint: "bg-sky-50 text-sky-600",
  },
  {
    icon: "📲",
    title: "סנכרון פגישות ויומן בוואטסאפ",
    body: "קישור ישיר ליומן הנייד Google/Apple",
    tint: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: "📊",
    title: "מעקב פניות ומעורבות",
    body: "דוח קליקים ופניות מלקוחות",
    tint: "bg-violet-50 text-violet-600",
  },
  {
    icon: "⭐",
    title: "ניהול מוניטין ומענה לביקורות",
    body: "מענה מהיר ל-Google ואיזי לשמירה על 5 כוכבים",
    tint: "bg-amber-50 text-amber-600",
  },
] as const;

type MobileTab = "social" | "whatsapp";

export default function HomePage() {
  const [mobileTab, setMobileTab] = useState<MobileTab>("social");

  return (
    <div
      dir="rtl"
      className="relative flex h-[calc(100vh-54px)] max-h-[calc(100vh-54px)] flex-col overflow-hidden bg-slate-50/60 text-slate-900"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
        <div className="pointer-events-auto">
          <SessionLockBanner />
        </div>
      </div>

      <div className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col overflow-hidden px-3 sm:px-5">
        <h1 className="my-1 hidden shrink-0 text-center text-balance text-lg font-bold tracking-tight text-slate-900 xl:text-xl lg:block">
          כל השיווק, הלידים והיומן של העסק שלך –{" "}
          <span className="text-sky-600">במקום אחד ובדקה ביום</span>
        </h1>

        <h1 className="mb-2 mt-2 shrink-0 text-center text-balance text-[1.15rem] font-bold leading-snug tracking-tight text-slate-900 sm:text-xl lg:hidden">
          פוסט מקצועי בדקה – ששולח לקוחות ישר לוואטסאפ שלך
        </h1>

        {/* Smile Grid — RTL: col1 RIGHT = IG/FB, center = form, col3 LEFT = WA.
            Desktop: locked to viewport (no page scroll), breathable gap-8. */}
        <div className="hidden min-h-0 flex-1 grid-cols-3 items-stretch gap-8 overflow-hidden lg:grid">
          <div className="flex min-h-0 max-h-full flex-col overflow-hidden px-1 pb-3 pt-1">
            <SocialAssetsColumn className="h-full max-h-full" />
          </div>

          <div className="flex min-h-0 max-h-full flex-col overflow-hidden px-1 pb-3 pt-1">
            <CreationForm smileOffset className="min-h-0 max-h-full flex-1" />
          </div>

          <div className="flex min-h-0 max-h-full flex-col overflow-hidden px-1 pb-3 pt-1">
            <WhatsAppPreview className="h-full max-h-full" />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto no-scrollbar lg:hidden">
          <div
            role="tablist"
            aria-label="בחירת רשת לתצוגה"
            className="grid shrink-0 grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mobileTab === "social"}
              onClick={() => setMobileTab("social")}
              className={[
                "rounded-lg px-3 py-2.5 text-sm font-semibold transition-all",
                mobileTab === "social"
                  ? "bg-white text-sky-700 shadow-sm ring-1 ring-sky-100"
                  : "text-slate-500 hover:bg-white/60 hover:text-slate-700",
              ].join(" ")}
            >
              📷 סושיאל
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileTab === "whatsapp"}
              onClick={() => setMobileTab("whatsapp")}
              className={[
                "rounded-lg px-3 py-2.5 text-sm font-semibold transition-all",
                mobileTab === "whatsapp"
                  ? "bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100"
                  : "text-slate-500 hover:bg-white/60 hover:text-slate-700",
              ].join(" ")}
            >
              📢 וואטסאפ
            </button>
          </div>

          <div className="max-h-[min(55vh,28rem)] shrink-0 overflow-hidden">
            {mobileTab === "whatsapp" ? (
              <WhatsAppPreview className="h-full min-h-[22rem]" />
            ) : (
              <SocialAssetsColumn className="h-full min-h-[22rem]" />
            )}
          </div>

          <div className="min-h-0 flex-1 pb-2">
            <CreationForm stickyCta className="min-h-[20rem]" />
          </div>
        </div>

        <div className="mt-1 shrink-0 pb-1 lg:pb-2">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-1.5">
            {PILLARS.map((p) => (
              <div
                key={p.title}
                className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white/90 p-1.5 shadow-sm transition hover:border-sky-300/60 hover:shadow-md"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs ${p.tint}`}
                  aria-hidden
                >
                  {p.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold leading-snug text-slate-800 sm:text-[11px]">
                    {p.title}
                  </p>
                  <p className="mt-0.5 text-[9px] leading-snug text-slate-500">
                    {p.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
