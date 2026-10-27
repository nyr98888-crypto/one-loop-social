"use client";

import Image from "next/image";
import { MoreHorizontal } from "lucide-react";
import {
  PLACEHOLDER_IMAGE,
  usePostStore,
  selectActiveCaption,
  toHandle,
} from "@/store/usePostStore";

function PlaceholderBrandOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#070B19]"
      aria-hidden
    >
      <Image
        src="/logo.png"
        alt="One Loop Social"
        width={220}
        height={72}
        className="h-14 w-auto select-none object-contain opacity-90 md:h-16"
        priority
        unoptimized
      />
    </div>
  );
}

/**
 * LinkedIn feed mockup — dark glass console, no white bands.
 */
export default function LinkedInMockup() {
  const businessName = usePostStore((s) => s.businessName);
  const industry = usePostStore((s) => s.industry);
  const generatedImage = usePostStore((s) => s.generatedImage);
  const headline = usePostStore((s) => s.headline);
  const caption = usePostStore(selectActiveCaption);
  const handle = toHandle(businessName);
  const name = businessName.trim() || "העסק שלך";
  const body = [headline, caption].filter(Boolean).join("\n\n") || caption;
  const hashtags = industry.trim()
    ? `#${industry.trim().replace(/\s+/g, "_")} #עסקים #OneLoopSocial`
    : "#עסקים #שיווק #OneLoopSocial";

  return (
    <article
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0B0F19]"
      aria-label="תצוגת LinkedIn"
      dir="rtl"
    >
      <div className="flex shrink-0 items-start gap-2.5 border-b border-slate-800/60 bg-slate-900/40 px-3 py-2.5 backdrop-blur-sm">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded bg-[#0A66C2] text-sm font-bold text-white">
          {name.slice(0, 1)}
          <span
            className="absolute -bottom-0.5 -left-0.5 flex h-4 w-4 items-center justify-center rounded-sm bg-[#0A66C2] text-[8px] font-black text-white ring-1 ring-slate-900"
            title="LinkedIn"
            aria-hidden
          >
            in
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-slate-100">
            {name}
          </p>
          <p className="truncate text-[11px] text-slate-400">
            {industry.trim() || handle} · 1,240 עוקבים
          </p>
          <p className="text-[10px] text-sky-400/90">קידום עסקי • 1 שעה</p>
        </div>
        <MoreHorizontal className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
      </div>

      <div className="shrink-0 space-y-1.5 bg-transparent px-3 py-2">
        {headline ? (
          <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-100">
            {headline}
          </p>
        ) : null}
        <p className="line-clamp-3 whitespace-pre-wrap text-[12px] leading-relaxed text-slate-300">
          {body}
        </p>
        <p className="line-clamp-1 text-[11px] font-medium text-sky-400">
          {hashtags}
        </p>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#070B19]">
        <Image
          src={generatedImage}
          alt={headline || "LinkedIn"}
          fill
          className="object-cover"
          sizes="380px"
          unoptimized
        />
        {generatedImage === PLACEHOLDER_IMAGE ? (
          <PlaceholderBrandOverlay />
        ) : null}
      </div>

      <div className="grid shrink-0 grid-cols-4 border-t border-slate-800/60 bg-slate-900/40 text-[10px] font-semibold text-slate-200 backdrop-blur-sm sm:text-[11px]">
        <span className="inline-flex items-center justify-center gap-1 py-2.5">
          👍 לייק
        </span>
        <span className="inline-flex items-center justify-center gap-1 py-2.5">
          💡 תובנה
        </span>
        <span className="inline-flex items-center justify-center gap-1 py-2.5">
          💬 תגובה
        </span>
        <span className="inline-flex items-center justify-center gap-1 py-2.5">
          ↗️ שיתוף
        </span>
      </div>
    </article>
  );
}
