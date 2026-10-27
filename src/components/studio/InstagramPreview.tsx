"use client";

import Image from "next/image";
import {
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
} from "lucide-react";
import {
  selectDraftCaption,
  toHandle,
  usePostStore,
} from "@/store/usePostStore";
import ShimmerOverlay from "./ShimmerOverlay";

export default function InstagramPreview() {
  const businessName = usePostStore((s) => s.businessName);
  const industry = usePostStore((s) => s.industry);
  const generatedImage = usePostStore((s) => s.generatedImage);
  const headline = usePostStore((s) => s.headline);
  const isGenerating = usePostStore((s) => s.isGenerating);
  const isGenerated = usePostStore((s) => s.isGenerated);
  const caption = usePostStore(selectDraftCaption);
  const handle = toHandle(businessName);

  return (
    <article
      className="relative mx-auto w-full max-w-[380px] overflow-hidden rounded-3xl border border-slate-200/90 bg-studio-card shadow-lg shadow-slate-200/60"
      aria-label="תצוגת אינסטגרם חיה"
    >
      <ShimmerOverlay active={isGenerating} />

      {/* Phone chrome */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="relative h-9 w-9 overflow-hidden rounded-full bg-gradient-to-tr from-sky-brand via-fuchsia-400 to-amber-300 p-[2px]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-xs font-bold text-sky-hover">
              {businessName.slice(0, 1) || "ע"}
            </div>
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-slate-900">
              {handle}
            </p>
            <p className="truncate text-[11px] text-slate-500">{industry}</p>
          </div>
        </div>
        <MoreHorizontal className="h-5 w-5 text-slate-700" aria-hidden />
      </div>

      {/* Image */}
      <div className="relative aspect-square bg-sky-light">
        <Image
          src={generatedImage}
          alt={headline || "תצוגת פוסט"}
          fill
          className="object-cover"
          sizes="380px"
          unoptimized
          priority
        />
        {isGenerated && headline ? (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-4 pb-3 pt-10">
            <p className="text-sm font-semibold text-white drop-shadow">
              {headline}
            </p>
          </div>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <div className="flex items-center gap-3.5 text-slate-800">
          <Heart className="h-6 w-6" strokeWidth={1.75} />
          <MessageCircle className="h-6 w-6" strokeWidth={1.75} />
          <Send className="h-[22px] w-[22px]" strokeWidth={1.75} />
        </div>
        <Bookmark className="h-6 w-6 text-slate-800" strokeWidth={1.75} />
      </div>

      {/* Caption */}
      <div className="space-y-1.5 px-4 pb-5">
        <p className="text-sm font-semibold text-slate-900">128 לייקים</p>
        <p className="text-sm leading-relaxed text-slate-800">
          <span className="font-semibold">{handle}</span>{" "}
          <span className="whitespace-pre-wrap">{caption}</span>
        </p>
        <p className="pt-1 text-xs text-slate-400">לפני דקה</p>
      </div>
    </article>
  );
}
