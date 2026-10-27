"use client";

import Image from "next/image";
import {
  Bookmark,
  Globe2,
  Heart,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
  Star,
  ThumbsUp,
} from "lucide-react";
import {
  PLACEHOLDER_IMAGE,
  selectActiveCaption,
  toHandle,
  usePostStore,
} from "@/store/usePostStore";
import LinkedInMockup from "@/components/studio/LinkedInMockup";
import WhatsAppCardMockup from "@/components/studio/WhatsAppCardMockup";

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

const HEADER =
  "flex shrink-0 items-center border-b border-slate-800/60 bg-slate-900/40 px-3 py-2.5 backdrop-blur-sm";
const FOOTER =
  "shrink-0 border-t border-slate-800/60 bg-slate-900/40 backdrop-blur-sm";

/**
 * Live platform mockup — seamless dark glass console (no white bands).
 */
export default function StudioPlatformMockup() {
  const activePlatform = usePostStore((s) => s.activePlatform);
  const businessName = usePostStore((s) => s.businessName);
  const industry = usePostStore((s) => s.industry);
  const generatedImage = usePostStore((s) => s.generatedImage);
  const headline = usePostStore((s) => s.headline);
  const caption = usePostStore(selectActiveCaption);
  const handle = toHandle(businessName);

  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden bg-[#0B0F19]">
      {activePlatform === "instagram" ? (
        <InstagramFrame
          businessName={businessName}
          industry={industry}
          generatedImage={generatedImage}
          headline={headline}
          caption={caption}
          handle={handle}
        />
      ) : null}
      {activePlatform === "facebook" ? (
        <FacebookFrame
          businessName={businessName}
          industry={industry}
          generatedImage={generatedImage}
          headline={headline}
          caption={caption}
        />
      ) : null}
      {activePlatform === "whatsapp" ? <WhatsAppCardMockup /> : null}
      {activePlatform === "google" ? (
        <GoogleFrame
          businessName={businessName}
          industry={industry}
          generatedImage={generatedImage}
          headline={headline}
          caption={caption}
        />
      ) : null}
      {activePlatform === "easy" ? (
        <EasyFrame
          businessName={businessName}
          industry={industry}
          generatedImage={generatedImage}
          headline={headline}
          caption={caption}
        />
      ) : null}
      {activePlatform === "linkedin" ? <LinkedInMockup /> : null}
    </div>
  );
}

function InstagramFrame({
  businessName,
  industry,
  generatedImage,
  headline,
  caption,
  handle,
}: {
  businessName: string;
  industry: string;
  generatedImage: string;
  headline: string;
  caption: string;
  handle: string;
}) {
  return (
    <article
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0B0F19]"
      aria-label="תצוגת אינסטגרם 1:1"
    >
      <div className={`${HEADER} justify-between`}>
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-sky-brand via-fuchsia-400 to-amber-300 text-[11px] font-bold text-white">
            {businessName.slice(0, 1) || "ע"}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-xs font-semibold text-slate-100">
              {handle}
            </p>
            <p className="truncate text-[10px] text-slate-400">{industry}</p>
          </div>
        </div>
        <MoreHorizontal className="h-4 w-4 text-slate-300" aria-hidden />
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#070B19]">
        <Image
          src={generatedImage}
          alt={headline || "Instagram"}
          fill
          className="object-cover"
          sizes="340px"
          unoptimized
        />
        {generatedImage === PLACEHOLDER_IMAGE ? (
          <PlaceholderBrandOverlay />
        ) : null}
        {headline ? (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8">
            <p className="line-clamp-1 text-xs font-semibold text-white drop-shadow">
              {headline}
            </p>
          </div>
        ) : null}
      </div>

      <div className={`${FOOTER} flex items-center justify-between px-3 py-1.5`}>
        <div className="flex items-center gap-3 text-slate-200">
          <Heart className="h-5 w-5" strokeWidth={1.75} />
          <MessageCircle className="h-5 w-5" strokeWidth={1.75} />
          <Send className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </div>
        <Bookmark className="h-5 w-5 text-slate-200" strokeWidth={1.75} />
      </div>

      <div className="shrink-0 space-y-1 bg-transparent px-3 pb-2.5">
        <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-200">
          <span className="font-semibold text-slate-100">{handle}</span>{" "}
          {caption}
        </p>
      </div>
    </article>
  );
}

function FacebookFrame({
  businessName,
  industry,
  generatedImage,
  headline,
  caption,
}: {
  businessName: string;
  industry: string;
  generatedImage: string;
  headline: string;
  caption: string;
}) {
  return (
    <article
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0B0F19]"
      aria-label="תצוגת פייסבוק"
    >
      <div className={`${HEADER} items-start gap-2.5`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1877F2] text-xs font-bold text-white">
          {businessName.slice(0, 1) || "ע"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-100">
            {businessName || "העסק שלך"}
          </p>
          <p className="flex items-center gap-1 text-[10px] text-slate-400">
            <span>עכשיו · {industry || "עסקים"}</span>
            <Globe2 className="h-3 w-3" aria-hidden />
          </p>
        </div>
      </div>

      <div className="shrink-0 space-y-0.5 bg-transparent px-3 py-1.5">
        {headline ? (
          <p className="line-clamp-1 text-[13px] font-bold leading-snug text-slate-100">
            {headline}
          </p>
        ) : null}
        <p className="line-clamp-2 text-[12px] leading-relaxed text-slate-300">
          {caption}
        </p>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#070B19]">
        <Image
          src={generatedImage}
          alt={headline || "Facebook"}
          fill
          className="object-cover"
          sizes="380px"
          unoptimized
        />
        {generatedImage === PLACEHOLDER_IMAGE ? (
          <PlaceholderBrandOverlay />
        ) : null}
      </div>

      <div
        className={`${FOOTER} grid grid-cols-3 text-[11px] font-medium text-slate-200`}
      >
        <span className="inline-flex items-center justify-center gap-1 py-2">
          <ThumbsUp className="h-3.5 w-3.5" /> לייק
        </span>
        <span className="inline-flex items-center justify-center gap-1 py-2">
          <MessageCircle className="h-3.5 w-3.5" /> תגובה
        </span>
        <span className="inline-flex items-center justify-center gap-1 py-2.5">
          <Share2 className="h-3.5 w-3.5" /> שיתוף
        </span>
      </div>
    </article>
  );
}

function GoogleFrame({
  businessName,
  industry,
  generatedImage,
  headline,
  caption,
}: {
  businessName: string;
  industry: string;
  generatedImage: string;
  headline: string;
  caption: string;
}) {
  return (
    <article
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0B0F19]"
      aria-label="תצוגת Google Business"
    >
      <div className={`${HEADER} items-start justify-between gap-2`}>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-100">
            {businessName || "העסק שלך"}
          </p>
          <p className="truncate text-[11px] text-slate-400">
            {industry || "עסק מקומי"}
          </p>
          <div className="mt-1 flex items-center gap-0.5 text-amber-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-current" />
            ))}
            <span className="mr-1 text-[11px] font-medium text-slate-200">
              5.0
            </span>
          </div>
          <p className="mt-1 text-[10px] font-semibold text-sky-400">
            גוגל מזהה עסק מאומת
          </p>
        </div>
        <MapPin className="h-4 w-4 shrink-0 text-[#4285F4]" aria-hidden />
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#070B19]">
        <Image
          src={generatedImage}
          alt={headline || "Google Business"}
          fill
          className="object-cover"
          sizes="360px"
          unoptimized
        />
        {generatedImage === PLACEHOLDER_IMAGE ? (
          <PlaceholderBrandOverlay />
        ) : null}
      </div>

      <div className={`${FOOTER} flex flex-col gap-1.5 px-3 py-2.5`}>
        {headline ? (
          <p className="line-clamp-1 text-[12px] font-semibold text-slate-100">
            {headline}
          </p>
        ) : null}
        <p className="line-clamp-2 text-[11px] leading-snug text-slate-300">
          {caption}
        </p>
        <button
          type="button"
          className="w-full shrink-0 rounded-full border border-sky-500/40 bg-sky-500/15 py-2 text-xs font-bold text-sky-300"
        >
          צרו קשר
        </button>
      </div>
    </article>
  );
}

function EasyBadge() {
  return (
    <span
      className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] bg-[#FF6B00] text-[12px] font-black leading-none text-white shadow-sm"
      aria-hidden
    >
      e
    </span>
  );
}

function EasyFrame({
  businessName,
  industry,
  generatedImage,
  headline,
  caption,
}: {
  businessName: string;
  industry: string;
  generatedImage: string;
  headline: string;
  caption: string;
}) {
  return (
    <article
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0B0F19]"
      aria-label="כרטיס easy עסקי"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-[#FF6B00]/40 bg-[#FF6B00]/10 px-3 py-2.5 backdrop-blur-sm">
        <span className="inline-flex items-center gap-1.5">
          <EasyBadge />
          <span className="text-sm font-black tracking-tight text-[#FF6B00]">
            איזי
          </span>
        </span>
        <span className="rounded-full border border-[#FF6B00]/40 bg-[#FF6B00]/15 px-2 py-0.5 text-[10px] font-semibold text-white">
          כרטיס עסק
        </span>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#070B19]">
        <Image
          src={generatedImage}
          alt={headline || "easy"}
          fill
          className="object-cover"
          sizes="360px"
          unoptimized
        />
        {generatedImage === PLACEHOLDER_IMAGE ? (
          <PlaceholderBrandOverlay />
        ) : null}
      </div>

      <div className={`${FOOTER} flex flex-col gap-1.5 px-3 py-2.5`}>
        <p className="truncate text-sm font-semibold text-slate-100">
          {businessName || "העסק שלך"}
        </p>
        <p className="truncate text-[11px] font-medium text-[#FF6B00]">
          {industry || "שירותים"}
        </p>
        <div className="flex items-center gap-0.5 text-amber-400">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-3 w-3 fill-current" />
          ))}
          <span className="mr-1 text-[10px] font-medium text-slate-200">
            4.9
          </span>
        </div>
        {headline ? (
          <p className="line-clamp-1 text-[12px] font-semibold text-slate-100">
            {headline}
          </p>
        ) : null}
        <p className="line-clamp-2 text-[11px] leading-snug text-slate-300">
          {caption}
        </p>
        <div className="mt-1 flex shrink-0 gap-2">
          <span className="flex-1 rounded-lg bg-[#FF6B00] py-2 text-center text-[11px] font-bold text-white">
            התקשרו
          </span>
          <span className="flex-1 rounded-lg border border-[#FF6B00]/50 py-2 text-center text-[11px] font-bold text-[#FF6B00]">
            ניווט
          </span>
        </div>
      </div>
    </article>
  );
}
