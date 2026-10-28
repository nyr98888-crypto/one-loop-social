"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Check,
  Globe2,
  Loader2,
  MoreHorizontal,
} from "lucide-react";
import {
  selectDraftCaption,
  selectFacebookDraft,
  toHandle,
  usePostStore,
} from "@/store/usePostStore";
import { useToastStore } from "@/store/useToastStore";
import PlaceholderBrandOverlay, {
  isBrandPlaceholder,
} from "./PlaceholderBrandOverlay";
import ShimmerOverlay from "./ShimmerOverlay";

export type PreviewPlatform = "instagram" | "facebook";

type LivePreviewProps = {
  platform: PreviewPlatform;
  className?: string;
};

const CARD_SHELL =
  "relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm";

const HEADER_ROW = "flex h-10 shrink-0 items-center gap-2.5 px-3";

/** Client-side "AI auto-enhance" — warmth + contrast + light sharpen. */
const ENHANCE_FILTER =
  "brightness(1.06) contrast(1.12) saturate(1.18) sepia(0.12)";

export default function LivePreview({ platform, className }: LivePreviewProps) {
  const [copied, setCopied] = useState(false);

  const businessName = usePostStore((s) => s.businessName);
  const industry = usePostStore((s) => s.industry);
  const generatedImage = usePostStore((s) => s.generatedImage);
  const headline = usePostStore((s) => s.headline);
  const isGenerating = usePostStore((s) => s.isGenerating);
  const isGenerated = usePostStore((s) => s.isGenerated);
  const isImageBusy = usePostStore((s) => s.isImageBusy);
  const isUserUpload = usePostStore((s) => s.isUserUpload);
  const previewEnhanceOn = usePostStore((s) => s.previewEnhanceOn);
  const igCaption = usePostStore(selectDraftCaption);
  const fbCaption = usePostStore(selectFacebookDraft);
  const showToast = useToastStore((s) => s.showToast);

  const caption = platform === "facebook" ? fbCaption : igCaption;
  const handle = toHandle(businessName);
  const placeholder = isBrandPlaceholder(generatedImage);
  const useContain = isUserUpload && !placeholder && !isImageBusy;
  const enhanceActive = useContain && previewEnhanceOn && !isImageBusy;
  const showEnhanceLoader = isImageBusy;

  const fullCaptionText = useMemo(() => {
    if (platform === "instagram") {
      const body = caption || "הכיתוב יופיע כאן אחרי יצירת הפוסט…";
      if (isGenerated && headline) {
        return `${headline}\n\n${body}`;
      }
      return body;
    }
    return caption || "טקסט הפוסט יופיע כאן…";
  }, [platform, caption, headline, isGenerated]);

  const copyPayload = useMemo(() => {
    if (platform === "instagram") {
      return [headline, igCaption].filter(Boolean).join("\n\n");
    }
    return [headline, fbCaption].filter(Boolean).join("\n\n");
  }, [platform, headline, igCaption, fbCaption]);

  async function handleCopyPublish() {
    const text = copyPayload || fullCaptionText;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast(
        platform === "facebook"
          ? "הטקסט הועתק — הדביקו בפייסבוק"
          : "הטקסט הועתק — הדביקו באינסטגרם",
      );
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("ההעתקה נכשלה");
    }
  }

  async function handleDownload() {
    try {
      const res = await fetch(generatedImage);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "oneloop-post.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("התמונה הורדה");
    } catch {
      showToast("הורדת התמונה נכשלה");
    }
  }

  return (
    <article
      dir="rtl"
      className={[CARD_SHELL, className].filter(Boolean).join(" ")}
      aria-label={
        platform === "facebook" ? "תצוגת פייסבוק חיה" : "תצוגת אינסטגרם חיה"
      }
    >
      <ShimmerOverlay active={isGenerating && !showEnhanceLoader} />

      {platform === "facebook" ? (
        <FacebookHeader businessName={businessName} industry={industry} />
      ) : (
        <InstagramHeader
          businessName={businessName}
          industry={industry}
          handle={handle}
        />
      )}

      {/* Image — balanced share of card height */}
      <div className="relative mx-3 min-h-0 flex-[1.15] overflow-hidden rounded-xl border border-slate-100">
        <div
          className={[
            "absolute inset-0",
            useContain ? "bg-zinc-900" : "bg-slate-100",
          ].join(" ")}
        >
          <Image
            src={generatedImage}
            alt={headline || "תצוגת פוסט"}
            fill
            className={[
              useContain
                ? "object-contain object-center"
                : "object-cover object-center",
              showEnhanceLoader ? "scale-105 opacity-40 blur-[2px]" : "",
              enhanceActive ? "transition-[filter] duration-300" : "",
            ].join(" ")}
            style={enhanceActive ? { filter: ENHANCE_FILTER } : undefined}
            sizes="(max-width: 1024px) 100vw, 33vw"
            unoptimized
            priority
          />
          {placeholder && !showEnhanceLoader ? (
            <PlaceholderBrandOverlay />
          ) : null}

          {showEnhanceLoader ? (
            <div
              className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-slate-950/55 px-4 text-center backdrop-blur-[2px]"
              role="status"
              aria-live="polite"
            >
              <div className="studio-shimmer absolute inset-0 opacity-40" />
              <Loader2 className="relative z-10 h-8 w-8 animate-spin text-sky-300" />
              <p className="relative z-10 max-w-[16rem] text-[12px] font-semibold leading-relaxed text-white">
                ✨ משפר תמונה ב-AI, מחדד פרטים ומכין את הפוסט...
              </p>
            </div>
          ) : null}

          {!placeholder && !showEnhanceLoader ? (
            <button
              type="button"
              onClick={() => void handleDownload()}
              className="absolute bottom-2 left-2 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-black/55 text-base text-white shadow-md backdrop-blur-sm transition hover:bg-black/70 active:scale-95"
              aria-label="הורד תמונה"
              title="הורד תמונה"
            >
              📥
            </button>
          ) : null}
        </div>
      </div>

      {/* Full caption — no line-clamp / no expand toggle */}
      <div className="mx-3 mt-2 min-h-0 flex-1 overflow-y-auto no-scrollbar rounded-xl bg-slate-50/70 px-3 py-2.5">
        {platform === "instagram" ? (
          <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-slate-800">
            <span className="font-semibold">{handle}</span>{" "}
            {fullCaptionText}
          </p>
        ) : (
          <div>
            {isGenerated && headline ? (
              <p className="mb-1 text-[13px] font-bold leading-snug text-slate-900">
                {headline}
              </p>
            ) : null}
            <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-slate-800">
              {fullCaptionText}
            </p>
          </div>
        )}
      </div>

      {/* Single clean copy button */}
      <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-3 py-2.5">
        <button
          type="button"
          onClick={() => void handleCopyPublish()}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] font-bold text-slate-800 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              הועתק ✓
            </>
          ) : (
            "📋 העתק כיתוב"
          )}
        </button>
      </div>
    </article>
  );
}

function FacebookHeader({
  businessName,
  industry,
}: {
  businessName: string;
  industry: string;
}) {
  return (
    <div className={HEADER_ROW}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1877F2] text-xs font-bold text-white">
        {businessName.slice(0, 1) || "ע"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-900">
          {businessName || "העסק שלך"}
        </p>
        <p className="flex items-center gap-1 text-[10px] text-slate-500">
          <span>עכשיו · {industry || "עסקים"}</span>
          <Globe2 className="h-3 w-3" aria-hidden />
        </p>
      </div>
    </div>
  );
}

function InstagramHeader({
  businessName,
  industry,
  handle,
}: {
  businessName: string;
  industry: string;
  handle: string;
}) {
  return (
    <div className={`${HEADER_ROW} justify-between`}>
      <div className="flex min-w-0 items-center gap-2">
        <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-gradient-to-tr from-sky-brand via-fuchsia-400 to-amber-300 p-[1.5px]">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-[10px] font-bold text-sky-hover">
            {businessName.slice(0, 1) || "ע"}
          </div>
        </div>
        <div className="min-w-0 leading-tight">
          <p className="flex items-center gap-1 truncate text-xs font-semibold text-slate-900">
            <span className="truncate">{handle}</span>
            <BadgeCheck
              className="h-3.5 w-3.5 shrink-0 fill-[#3897f0] text-white"
              aria-label="מאומת"
            />
          </p>
          <p className="truncate text-[10px] text-slate-500">
            {industry || "עסק מקומי"}
          </p>
        </div>
      </div>
      <MoreHorizontal className="h-4 w-4 shrink-0 text-slate-700" aria-hidden />
    </div>
  );
}
