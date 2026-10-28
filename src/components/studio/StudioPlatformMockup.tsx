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
  selectActiveCaption,
  toHandle,
  usePostStore,
} from "@/store/usePostStore";
import LinkedInMockup from "@/components/studio/LinkedInMockup";
import PlaceholderBrandOverlay, {
  isBrandPlaceholder,
} from "@/components/studio/PlaceholderBrandOverlay";
import WhatsAppCardMockup from "@/components/studio/WhatsAppCardMockup";

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
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0B0F19]">
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
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-sky-brand via-fuchsia-400 to-amber-300 text-[10px] font-bold text-white">
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

      <div className="relative mx-auto aspect-square w-full max-h-[min(36vh,300px)] max-w-[min(100%,36vh,300px)] shrink-0 overflow-hidden bg-[#070B19]">
        <Image
          src={generatedImage}
          alt={headline || "Instagram"}
          fill
          className="h-full w-full object-cover object-center"
          sizes="300px"
          unoptimized
        />
        {isBrandPlaceholder(generatedImage) ? (
          <PlaceholderBrandOverlay />
        ) : null}
        {headline && !isBrandPlaceholder(generatedImage) ? (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6">
            <p className="line-clamp-1 text-xs font-semibold text-white drop-shadow">
              {headline}
            </p>
          </div>
        ) : null}
      </div>

      <div className={`${FOOTER} flex items-center justify-between px-3 py-1`}>
        <div className="flex items-center gap-3 text-slate-200">
          <Heart className="h-4 w-4" strokeWidth={1.75} />
          <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
          <Send className="h-4 w-4" strokeWidth={1.75} />
        </div>
        <Bookmark className="h-4 w-4 text-slate-200" strokeWidth={1.75} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2 pt-1">
        <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-200">
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
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1877F2] text-xs font-bold text-white">
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

      <div className="min-h-0 max-h-[28%] shrink overflow-y-auto bg-transparent px-3 py-1.5">
        {headline ? (
          <p className="text-[13px] font-bold leading-snug text-slate-100">
            {headline}
          </p>
        ) : null}
        <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-slate-300">
          {caption}
        </p>
      </div>

      <div className="relative mx-auto aspect-[4/5] w-full max-h-[min(42vh,340px)] max-w-[min(100%,calc(42vh*0.8),272px)] shrink-0 overflow-hidden bg-[#070B19]">
        <Image
          src={generatedImage}
          alt={headline || "Facebook"}
          fill
          className="h-full w-full object-cover object-center"
          sizes="280px"
          unoptimized
        />
        {isBrandPlaceholder(generatedImage) ? (
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

      <div className="relative mx-auto aspect-[4/5] w-full max-h-[min(40vh,320px)] max-w-[min(100%,calc(40vh*0.8),256px)] shrink-0 overflow-hidden bg-[#070B19]">
        <Image
          src={generatedImage}
          alt={headline || "Google Business"}
          fill
          className="h-full w-full object-cover object-center"
          sizes="260px"
          unoptimized
        />
        {isBrandPlaceholder(generatedImage) ? (
          <PlaceholderBrandOverlay />
        ) : null}
      </div>

      <div className={`${FOOTER} flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-2`}>
        {headline ? (
          <p className="text-[12px] font-semibold text-slate-100">
            {headline}
          </p>
        ) : null}
        <p className="whitespace-pre-wrap text-[11px] leading-snug text-slate-300">
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
      <div className="flex shrink-0 items-center justify-between border-b border-[#1296D4]/40 bg-[#1296D4]/10 px-3 py-2.5 backdrop-blur-sm">
        <span className="inline-flex items-center gap-1.5">
          <Image
            src="/platforms/easy.png"
            alt=""
            width={22}
            height={22}
            className="h-[22px] w-[22px] shrink-0 rounded-lg object-cover"
            aria-hidden
            unoptimized
          />
          <span className="text-sm font-black tracking-tight text-[#1296D4]">
            איזי
          </span>
        </span>
        <span className="rounded-full border border-[#1296D4]/40 bg-[#1296D4]/15 px-2 py-0.5 text-[10px] font-semibold text-sky-100">
          כרטיס עסק
        </span>
      </div>

      <div className="relative mx-auto aspect-[4/5] w-full max-h-[min(38vh,300px)] max-w-[min(100%,calc(38vh*0.8),240px)] shrink-0 overflow-hidden bg-[#070B19]">
        <Image
          src={generatedImage}
          alt={headline || "easy"}
          fill
          className="h-full w-full object-cover object-center"
          sizes="240px"
          unoptimized
        />
        {isBrandPlaceholder(generatedImage) ? (
          <PlaceholderBrandOverlay />
        ) : null}
      </div>

      <div className={`${FOOTER} flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-2`}>
        <p className="truncate text-sm font-semibold text-slate-100">
          {businessName || "העסק שלך"}
        </p>
        <p className="truncate text-[11px] font-medium text-[#1296D4]">
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
          <p className="text-[12px] font-semibold text-slate-100">
            {headline}
          </p>
        ) : null}
        <p className="whitespace-pre-wrap text-[11px] leading-snug text-slate-300">
          {caption}
        </p>
        <div className="mt-1 flex shrink-0 gap-2">
          <span className="flex-1 rounded-lg bg-[#1296D4] py-2 text-center text-[11px] font-bold text-white">
            התקשרו
          </span>
          <span className="flex-1 rounded-lg border border-[#1296D4]/50 py-2 text-center text-[11px] font-bold text-[#1296D4]">
            ניווט
          </span>
        </div>
      </div>
    </article>
  );
}
