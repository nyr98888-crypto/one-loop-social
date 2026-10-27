"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react";
import {
  getPlatformDeepLink,
  getPlatformGuideTitle,
} from "@/lib/publish/deep-links";
import {
  selectActiveCaption,
  usePostStore,
} from "@/store/usePostStore";
import {
  type ManualGuidePlatform,
  useSocialConnectStore,
} from "@/store/useSocialConnectStore";

const PLATFORM_TABS: { id: ManualGuidePlatform; label: string }[] = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "instagram", label: "אינסטגרם" },
  { id: "facebook", label: "פייסבוק" },
  { id: "google", label: "Google" },
  { id: "easy", label: "איזי" },
  { id: "linkedin", label: "LinkedIn" },
];

/**
 * Automated 3-step assistant for manual (private account) publishing.
 * Usable from Studio and from the Connect Center Pathway B.
 */
export default function PublishGuideModal() {
  const open = useSocialConnectStore((s) => s.guideOpen);
  const platform = useSocialConnectStore((s) => s.guidePlatform);
  const closeGuide = useSocialConnectStore((s) => s.closeGuide);
  const openGuide = useSocialConnectStore((s) => s.openGuide);

  const headline = usePostStore((s) => s.headline);
  const caption = usePostStore(selectActiveCaption);
  const generatedImage = usePostStore((s) => s.generatedImage);

  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setCopied(false);
    setDownloaded(false);
  }, [open, platform]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeGuide();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeGuide]);

  if (!open) return null;

  const text = [headline, caption].filter(Boolean).join("\n\n");
  const deep = getPlatformDeepLink(platform);
  const title = getPlatformGuideTitle(platform);

  async function handleCopyAndDownload() {
    setBusy(true);
    try {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      } catch {
        /* ignore */
      }

      try {
        const res = await fetch(generatedImage);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `one-loop-${Date.now()}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
        setDownloaded(true);
      } catch {
        /* image may be cross-origin placeholder */
      }

      setStep(2);
    } finally {
      setBusy(false);
    }
  }

  function handleOpenPlatform() {
    window.open(deep.href, "_blank", "noopener,noreferrer");
    setStep(3);
  }

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        aria-label="סגור"
        onClick={closeGuide}
      />
      <div className="absolute left-1/2 top-1/2 flex max-h-[min(92vh,640px)] w-[min(100%-1.5rem,440px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="shrink-0 border-b border-slate-100 px-5 pb-4 pt-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-sky-brand">
                מדריך פרסום · 3 שלבים
              </p>
              <h2 className="mt-0.5 text-lg font-bold text-slate-900">
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={closeGuide}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="סגור"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            className="flex flex-wrap gap-1.5"
            role="tablist"
            aria-label="פלטפורמה"
          >
            {PLATFORM_TABS.map((tab) => {
              const active = tab.id === platform;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => openGuide(tab.id)}
                  className={[
                    "rounded-full px-3 py-1 text-[11px] font-semibold transition",
                    active
                      ? "bg-sky-brand text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <ol className="mt-4 flex items-center gap-2" aria-label="התקדמות">
            {[1, 2, 3].map((n) => (
              <li key={n} className="flex flex-1 items-center gap-2">
                <span
                  className={[
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    step > n
                      ? "bg-emerald-500 text-white"
                      : step === n
                        ? "bg-sky-brand text-white"
                        : "bg-slate-100 text-slate-400",
                  ].join(" ")}
                >
                  {step > n ? <Check className="h-3.5 w-3.5" /> : n}
                </span>
                {n < 3 ? (
                  <span
                    className={[
                      "h-0.5 flex-1 rounded-full",
                      step > n ? "bg-emerald-400" : "bg-slate-200",
                    ].join(" ")}
                  />
                ) : null}
              </li>
            ))}
          </ol>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {step === 1 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                שלב 1 · העתקת טקסט והורדת תמונה
              </h3>
              <p className="text-[13px] leading-relaxed text-slate-600">
                נעתיק את הטקסט ללוח ונוריד את התמונה למכשיר — אחר כך תדביקו
                בפלטפורמה.
              </p>
              <div className="max-h-28 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-[12px] leading-relaxed text-slate-700 whitespace-pre-wrap">
                {text || "אין טקסט עדיין — צרו פוסט בסטודיו קודם."}
              </div>
              <button
                type="button"
                disabled={busy || !text}
                onClick={() => void handleCopyAndDownload()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-sky-brand to-sky-hover px-4 py-3.5 text-sm font-bold text-white shadow-sky-glow transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <Download className="h-4 w-4" />
                  </>
                )}
                העתק טקסט והורד תמונה
              </button>
              {(copied || downloaded) && (
                <p className="text-center text-xs font-medium text-emerald-600">
                  {copied ? "הטקסט הועתק" : null}
                  {copied && downloaded ? " · " : null}
                  {downloaded ? "התמונה הורדה" : null}
                </p>
              )}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                שלב 2 · פתיחת האפליקציה
              </h3>
              <p className="text-[13px] leading-relaxed text-slate-600">
                פתחו את האפליקציה או האתר, צרו פוסט חדש והעלו את התמונה שהורדתם.
              </p>
              <button
                type="button"
                onClick={handleOpenPlatform}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-sky-brand to-sky-hover px-4 py-3.5 text-sm font-bold text-white shadow-sky-glow transition hover:brightness-105"
              >
                <ExternalLink className="h-4 w-4" />
                {deep.label}
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full text-center text-xs font-semibold text-slate-500 underline-offset-2 hover:text-sky-brand hover:underline"
              >
                כבר פתחתי — המשך לשלב 3
              </button>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                שלב 3 · הדבקה ופרסום
              </h3>
              <p className="text-[13px] leading-relaxed text-slate-600">
                הדביקו את הטקסט שהועתק (Ctrl/Cmd+V), בדקו את התמונה ולחצו{" "}
                <strong className="text-slate-800">פרסם</strong>.
              </p>
              <ul className="space-y-2 rounded-2xl border border-sky-brand/20 bg-sky-light/50 px-4 py-3 text-[12px] leading-relaxed text-sky-hover">
                <li>הטקסט כבר בלוח ההעתקה</li>
                <li>התמונה נמצאת בתיקיית ההורדות</li>
                <li>אחרי הפרסום אפשר לחזור לסטודיו לפוסט הבא</li>
              </ul>
              <button
                type="button"
                onClick={closeGuide}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition hover:border-sky-brand/40 hover:bg-sky-light/40"
              >
                <Check className="h-4 w-4 text-emerald-600" />
                סיימתי — סגור
              </button>
            </div>
          ) : null}
        </div>

        {step > 1 ? (
          <div className="shrink-0 border-t border-slate-100 px-5 py-3">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="text-xs font-semibold text-slate-500 hover:text-sky-brand"
            >
              ← חזרה לשלב הקודם
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
