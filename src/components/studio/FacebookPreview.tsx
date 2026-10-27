"use client";

import Image from "next/image";
import {
  Globe2,
  MessageCircle,
  Share2,
  ThumbsUp,
} from "lucide-react";
import {
  selectFacebookDraft,
  usePostStore,
} from "@/store/usePostStore";
import ShimmerOverlay from "./ShimmerOverlay";

export default function FacebookPreview() {
  const businessName = usePostStore((s) => s.businessName);
  const industry = usePostStore((s) => s.industry);
  const generatedImage = usePostStore((s) => s.generatedImage);
  const headline = usePostStore((s) => s.headline);
  const isGenerating = usePostStore((s) => s.isGenerating);
  const isGenerated = usePostStore((s) => s.isGenerated);
  const caption = usePostStore(selectFacebookDraft);

  return (
    <article
      className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-3xl border border-slate-200/90 bg-studio-card shadow-lg shadow-slate-200/60"
      aria-label="תצוגת פייסבוק חיה"
    >
      <ShimmerOverlay active={isGenerating} />

      {/* Feed header */}
      <div className="flex items-start gap-3 px-4 pt-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-brand text-sm font-bold text-white">
          {businessName.slice(0, 1) || "ע"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {businessName}
          </p>
          <p className="flex items-center gap-1 text-[11px] text-slate-500">
            <span>עכשיו · {industry}</span>
            <Globe2 className="h-3 w-3" aria-hidden />
          </p>
        </div>
      </div>

      {/* Copy */}
      <div className="space-y-2 px-4 py-3">
        {isGenerated && headline ? (
          <p className="text-[15px] font-bold leading-snug text-slate-900">
            {headline}
          </p>
        ) : null}
        <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-slate-800">
          {caption}
        </p>
      </div>

      {/* Image */}
      <div className="relative aspect-[4/3] bg-sky-light">
        <Image
          src={generatedImage}
          alt={headline || "תצוגת פוסט פייסבוק"}
          fill
          className="object-cover"
          sizes="420px"
          unoptimized
          priority
        />
      </div>

      {/* WhatsApp CTA */}
      <div className="border-y border-slate-100 bg-gradient-to-l from-emerald-50 to-white px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-emerald-800">וואטסאפ עסקי</p>
            <p className="truncate text-sm font-semibold text-slate-900">
              שלחו הודעה ל־{businessName}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#25D366] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm">
            שלחו הודעה
          </span>
        </div>
      </div>

      {/* Engagement */}
      <div className="flex items-center justify-between px-4 py-2 text-xs text-slate-500">
        <span>24 לייקים</span>
        <span>3 תגובות · 1 שיתוף</span>
      </div>

      <div className="grid grid-cols-3 border-t border-slate-100 text-sm font-medium text-slate-600">
        <button
          type="button"
          className="flex items-center justify-center gap-1.5 py-3 transition hover:bg-slate-50"
        >
          <ThumbsUp className="h-4 w-4" />
          לייק
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-1.5 py-3 transition hover:bg-slate-50"
        >
          <MessageCircle className="h-4 w-4" />
          תגובה
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-1.5 py-3 transition hover:bg-slate-50"
        >
          <Share2 className="h-4 w-4" />
          שיתוף
        </button>
      </div>
    </article>
  );
}
