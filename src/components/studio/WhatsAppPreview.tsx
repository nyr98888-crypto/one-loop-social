"use client";

import Image from "next/image";
import { useMemo } from "react";
import {
  selectDraftCaption,
  selectFacebookDraft,
  usePostStore,
} from "@/store/usePostStore";
import { useAgentStore } from "@/store/useAgentStore";
import { buildWaMeLink } from "@/lib/ai/whatsapp";
import {
  isBrandPlaceholder,
} from "./PlaceholderBrandOverlay";
import ShimmerOverlay from "./ShimmerOverlay";

type WhatsAppPreviewProps = {
  className?: string;
};

/**
 * WhatsApp 1-to-many broadcast — owner → community / status / lists.
 * Built from the unified `/api/generate` store payload.
 */
export default function WhatsAppPreview({ className }: WhatsAppPreviewProps) {
  const businessName = usePostStore((s) => s.businessName);
  const industry = usePostStore((s) => s.industry);
  const isGenerating = usePostStore((s) => s.isGenerating);
  const isGenerated = usePostStore((s) => s.isGenerated);
  const generatedImage = usePostStore((s) => s.generatedImage);
  const headline = usePostStore((s) => s.headline);
  const igCtaText = usePostStore((s) => s.igCtaText);
  const leadMessage = usePostStore((s) => s.waLeadIncomingMessage);
  const businessReply = usePostStore((s) => s.waBusinessAutoReply);
  const waBroadcastMessage = usePostStore((s) => s.waBroadcastMessage);
  const whatsappNumber = usePostStore((s) => s.whatsappNumber);
  const lastPostId = useAgentStore((s) => s.lastPostId);
  const igCaption = usePostStore(selectDraftCaption);
  const fbCaption = usePostStore(selectFacebookDraft);

  const brand = businessName.trim() || "העסק שלך";
  const niche = industry.trim() || "עסק מקומי";
  const placeholder = isBrandPlaceholder(generatedImage);

  const broadcastText = useMemo(() => {
    if (!isGenerated) {
      return [
        `📢 *${brand}* · ${niche}`,
        "",
        "הודעת שידור לקהילה ולסטטוס תופיע כאן אחרי יצירת הפוסט.",
        "",
        "✨ כתבו מה לפרסם ולחצו «צור פוסטים ותמונה»",
      ].join("\n");
    }

    // Prefer authentic 1-to-many announcement from the API
    if (waBroadcastMessage.trim()) {
      const cta = igCtaText.trim();
      const lines = [waBroadcastMessage.trim()];
      if (cta && !waBroadcastMessage.includes(cta)) {
        lines.push("", `👉 ${cta}`);
      }
      lines.push("", `📍 ${brand}`);
      return lines.join("\n");
    }

    const bullets: string[] = [];
    const source =
      businessReply.trim() ||
      fbCaption.trim() ||
      igCaption.trim() ||
      leadMessage.trim();

    if (headline.trim()) {
      bullets.push(`🔥 *${headline.trim()}*`);
    }

    if (source) {
      const lines = source
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 6);
      for (const line of lines) {
        if (line.startsWith("#") || line.startsWith("*")) {
          bullets.push(line);
        } else {
          bullets.push(`• ${line}`);
        }
      }
    }

    const cta = igCtaText.trim() || "לפרטים — ענו להודעה זו";
    bullets.push("");
    bullets.push(`👉 ${cta}`);
    bullets.push("");
    bullets.push(`📍 ${brand}`);

    return bullets.join("\n");
  }, [
    isGenerated,
    brand,
    niche,
    headline,
    waBroadcastMessage,
    businessReply,
    fbCaption,
    igCaption,
    leadMessage,
    igCtaText,
  ]);

  function openBroadcast() {
    const text = broadcastText;
    let link =
      buildWaMeLink(whatsappNumber, text) ||
      `https://wa.me/?text=${encodeURIComponent(text)}`;
    // Click-tracking for Performance dashboard: wa.me?...&ref=post_id
    if (lastPostId) {
      try {
        const u = new URL(link);
        u.searchParams.set("ref", lastPostId);
        link = u.toString();
      } catch {
        /* ignore */
      }
    }
    window.open(link, "_blank", "noopener,noreferrer");
  }

  return (
    <article
      dir="rtl"
      className={[
        "relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-emerald-100/80 bg-white shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="שידור וואטסאפ לקהילה"
    >
      <ShimmerOverlay active={isGenerating} />

      <header className="shrink-0 border-b border-emerald-100 bg-gradient-to-l from-emerald-50 to-white px-3 py-2.5">
        <p className="rounded-xl bg-emerald-600/10 px-3 py-2 text-center text-[12px] font-bold leading-snug text-emerald-800">
          📢 שידור מהעסק לקהילה · סטטוס ורשימות תפוצה
        </p>
        <p className="mt-1.5 truncate text-center text-[11px] text-slate-500">
          {brand} · {niche}
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden px-3 py-3">
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-emerald-100 bg-slate-100">
          {!placeholder ? (
            <Image
              src={generatedImage}
              alt={headline || "תצוגת שידור"}
              fill
              className="object-cover object-center"
              sizes="(max-width: 1024px) 100vw, 33vw"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#075E54]/5 px-4 text-center">
              <span className="text-2xl" aria-hidden>
                🖼️
              </span>
              <p className="text-[11px] font-medium text-slate-500">
                תמונת הפוסט תופיע כאן
              </p>
            </div>
          )}
        </div>

        <div className="max-h-[30%] shrink-0 overflow-y-auto rounded-xl border border-emerald-100 bg-[#F0FDF4] px-3.5 py-2.5 no-scrollbar">
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800">
            {broadcastText}
          </p>
        </div>
      </div>

      <div className="shrink-0 border-t border-emerald-100 bg-white px-3 py-3">
        <button
          type="button"
          onClick={openBroadcast}
          className="inline-flex w-full items-center justify-center rounded-full bg-[#25D366] px-3 py-3 text-[13px] font-bold text-white shadow-md shadow-emerald-500/25 transition hover:brightness-105 active:scale-[0.99]"
        >
          🟢 שגר בוואטסאפ
        </button>
      </div>
    </article>
  );
}
