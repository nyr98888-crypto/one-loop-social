"use client";

import { useState } from "react";
import {
  Image as ImageIcon,
  LayoutTemplate,
  Loader2,
  Megaphone,
  RefreshCw,
  Sparkles,
  Type,
} from "lucide-react";
import type { GeneratedPostContent } from "@/lib/ai/types";
import {
  type StudioMode,
  usePostStore,
} from "@/store/usePostStore";

const MODES: {
  id: StudioMode;
  label: string;
  badge: string;
  icon: typeof Sparkles;
}[] = [
  { id: "logo", label: "עיצוב לוגו מהיר", badge: "לוגו", icon: Sparkles },
  { id: "brand", label: "תמונת תדמית", badge: "תדמית", icon: ImageIcon },
  { id: "banner", label: "באנר / כיסוי", badge: "באנר", icon: LayoutTemplate },
  { id: "campaign", label: "יצירת קמפיין שלם", badge: "קמפיין", icon: Megaphone },
];

export default function StudioAssistant() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"text" | "image" | "both" | null>(null);

  const businessName = usePostStore((s) => s.businessName);
  const industry = usePostStore((s) => s.industry);
  const postGoal = usePostStore((s) => s.postGoal);
  const headline = usePostStore((s) => s.headline);
  const imagePrompt = usePostStore((s) => s.imagePrompt);
  const studioMode = usePostStore((s) => s.studioMode);
  const setBusinessName = usePostStore((s) => s.setBusinessName);
  const setIndustry = usePostStore((s) => s.setIndustry);
  const setPostGoal = usePostStore((s) => s.setPostGoal);
  const setHeadline = usePostStore((s) => s.setHeadline);
  const setStudioMode = usePostStore((s) => s.setStudioMode);
  const setIsImageBusy = usePostStore((s) => s.setIsImageBusy);
  const setGeneratedImage = usePostStore((s) => s.setGeneratedImage);
  const applyGenerated = usePostStore((s) => s.applyGenerated);
  const setInstagramCaption = usePostStore((s) => s.setInstagramCaption);
  const setFacebookCaption = usePostStore((s) => s.setFacebookCaption);

  const activeMode = MODES.find((m) => m.id === studioMode) ?? MODES[1];

  async function regenerateText() {
    if (busy) return;
    setError(null);
    setBusy("text");

    try {
      const res = await fetch("/api/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, industry, postGoal }),
      });
      const json = (await res.json()) as {
        post?: GeneratedPostContent;
        error?: string;
      };
      if (!res.ok || !json.post) {
        throw new Error(json.error ?? "יצירת טקסט נכשלה");
      }

      setHeadline(json.post.headline);
      setInstagramCaption(json.post.instagramCaption);
      setFacebookCaption(json.post.facebookCaption);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setBusy(null);
    }
  }

  async function regenerateImage() {
    if (busy) return;
    setError(null);
    setBusy("image");
    setIsImageBusy(true);

    try {
      const prompt =
        imagePrompt ||
        modeImageHint(studioMode, businessName, postGoal);

      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model: "schnell",
          imageSize: studioMode === "banner" ? "landscape_16_9" : "square_hd",
        }),
      });
      const json = (await res.json()) as {
        imageUrl?: string;
        error?: string;
      };
      if (!res.ok || !json.imageUrl) {
        throw new Error(json.error ?? "יצירת תמונה נכשלה");
      }
      setGeneratedImage(json.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setBusy(null);
      setIsImageBusy(false);
    }
  }

  async function regenerateAll() {
    if (busy) return;
    setError(null);
    setBusy("both");
    setIsImageBusy(true);

    try {
      const postRes = await fetch("/api/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, industry, postGoal }),
      });
      const postJson = (await postRes.json()) as {
        post?: GeneratedPostContent;
        error?: string;
      };
      if (!postRes.ok || !postJson.post) {
        throw new Error(postJson.error ?? "יצירת טקסט נכשלה");
      }

      const prompt =
        postJson.post.imagePrompt ||
        modeImageHint(studioMode, businessName, postGoal);

      const imageRes = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model: "schnell",
          imageSize: studioMode === "banner" ? "landscape_16_9" : "square_hd",
        }),
      });
      const imageJson = (await imageRes.json()) as {
        imageUrl?: string;
        error?: string;
      };
      if (!imageRes.ok || !imageJson.imageUrl) {
        throw new Error(imageJson.error ?? "יצירת תמונה נכשלה");
      }

      applyGenerated({
        headline: postJson.post.headline,
        instagramCaption: postJson.post.instagramCaption,
        facebookCaption: postJson.post.facebookCaption,
        imagePrompt: postJson.post.imagePrompt,
        generatedImage: imageJson.imageUrl,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
      setIsImageBusy(false);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col gap-3">
      {/* Mode tabs */}
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="מצב סטודיו"
      >
        {MODES.map(({ id, label }) => {
          const active = studioMode === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStudioMode(id)}
              className={[
                "rounded-full px-3.5 py-2 text-xs font-semibold transition",
                active
                  ? "bg-sky-brand text-white shadow-sky-glow"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-sky-brand/40 hover:text-sky-brand",
              ].join(" ")}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        {/* Mode form card */}
        <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-md">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-light text-sky-brand">
                <activeMode.icon className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  עוזר הסטודיו
                </h2>
                <p className="text-[11px] text-slate-500">{activeMode.label}</p>
              </div>
            </div>
            <span className="rounded-full bg-sky-light px-2.5 py-1 text-[11px] font-bold text-sky-brand">
              {activeMode.badge}
            </span>
          </div>

          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">
                שם העסק
              </span>
              <input
                className="studio-input py-2.5"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">
                תחום
              </span>
              <input
                className="studio-input py-2.5"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">
                {modeGoalLabel(studioMode)}
              </span>
              <textarea
                className="studio-input max-h-24 min-h-[4.5rem] resize-none py-2.5 text-[13px]"
                rows={3}
                value={postGoal}
                onChange={(e) => setPostGoal(e.target.value)}
              />
            </label>
            {headline ? (
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">
                  כותרת
                </span>
                <input
                  className="studio-input py-2.5"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                />
              </label>
            ) : null}
          </div>
        </div>

        {/* Quick regenerate — focused, no bloated toolbars */}
        <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-md">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-sky-light px-2.5 py-1 text-[11px] font-bold text-sky-brand">
              מהיר
            </span>
            <p className="text-xs font-semibold text-slate-700">
              יצירה מחדש בלי להסתבך
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <QuickBtn
              label="טקסט"
              icon={Type}
              loading={busy === "text"}
              disabled={!!busy}
              onClick={regenerateText}
            />
            <QuickBtn
              label="תמונה"
              icon={ImageIcon}
              loading={busy === "image"}
              disabled={!!busy}
              onClick={regenerateImage}
            />
            <QuickBtn
              label="הכל"
              icon={RefreshCw}
              loading={busy === "both"}
              disabled={!!busy}
              onClick={regenerateAll}
              primary
            />
          </div>

          {error ? (
            <p className="mt-3 text-xs text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            ממוקד לעסקים מקומיים — טקסט ישראלי חד, תמונה מסחרית נקייה, ומוכנים
            לשליחה בוואטסאפ.
          </p>
        </div>

        {/* Conversion tip */}
        <div className="mt-auto shrink-0 rounded-2xl border border-sky-brand/20 bg-gradient-to-l from-sky-light/80 to-white p-4">
          <p className="text-xs font-bold text-sky-hover">טיפ המרה</p>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-700">
            {modeTip(studioMode)}
          </p>
        </div>
      </div>
    </section>
  );
}

function QuickBtn({
  label,
  icon: Icon,
  onClick,
  loading,
  disabled,
  primary,
}: {
  label: string;
  icon: typeof RefreshCw;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-3 text-xs font-semibold transition disabled:opacity-50",
        primary
          ? "bg-gradient-to-b from-sky-brand to-sky-hover text-white shadow-sm hover:brightness-105"
          : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-brand/40 hover:bg-sky-light/50 hover:text-sky-brand",
      ].join(" ")}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      {label}
    </button>
  );
}

function modeGoalLabel(mode: StudioMode): string {
  switch (mode) {
    case "logo":
      return "רעיון ללוגו / סגנון";
    case "banner":
      return "מסר לכיסוי / באנר";
    case "campaign":
      return "מטרת הקמפיין";
    case "brand":
    default:
      return "מטרת התמונה / המבצע";
  }
}

function modeTip(mode: StudioMode): string {
  switch (mode) {
    case "logo":
      return "שמרו על שם העסק קצר וברור — לוגואים פשוטים נקראים טוב יותר בסטורי ובכרטיס וואטסאפ.";
    case "banner":
      return "באנרים עם הטבה אחת ברורה ממירים יותר. הימנעו משלוש הצעות באותה תמונה.";
    case "campaign":
      return "קמפיין שלם = תמונה + טקסט + הנעה לוואטסאפ. שלחו קודם ללקוחות חמים.";
    case "brand":
    default:
      return "תמונת תדמית עם תוצאה מוגמרת (רכב מבריק, חלל נקי) בונה אמון מהר יותר מטקסט בלבד.";
  }
}

function modeImageHint(
  mode: StudioMode,
  businessName: string,
  goal: string,
): string {
  const base = `${businessName}: ${goal}`;
  switch (mode) {
    case "logo":
      return `Minimal clean logo mark for local Israeli business, ${base}`;
    case "banner":
      return `Wide commercial cover banner for social media, ${base}`;
    case "campaign":
      return `Full campaign hero visual, conversion-focused commercial scene, ${base}`;
    case "brand":
    default:
      return `Brand identity commercial photograph, ${base}`;
  }
}
