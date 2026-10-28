"use client";

import Image from "next/image";
import {
  Clock,
  Globe2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { usePostStore } from "@/store/usePostStore";
import { buildDigitalCardShareUrl } from "@/lib/ai/digital-card";
import { isBrandPlaceholder } from "@/components/studio/PlaceholderBrandOverlay";

/**
 * Compact digital business card — fits viewport with WhatsApp CTA + platform pills visible.
 */
export default function WhatsAppCardMockup() {
  const businessName = usePostStore((s) => s.businessName);
  const slogan = usePostStore((s) => s.services);
  const whatsappNumber = usePostStore((s) => s.whatsappNumber);
  const openingHours = usePostStore((s) => s.openingHours);
  const serviceArea = usePostStore((s) => s.serviceArea);
  const cardDirectPhone = usePostStore((s) => s.cardDirectPhone);
  const cardEmail = usePostStore((s) => s.cardEmail);
  const cardWebsite = usePostStore((s) => s.cardWebsite);
  const whatsappBio = usePostStore((s) => s.whatsappBio);
  const generatedImage = usePostStore((s) => s.generatedImage);
  const whatsappTagline = usePostStore((s) => s.whatsappTagline);
  const industry = usePostStore((s) => s.industry);

  const name = businessName.trim();
  const tagline = (slogan || whatsappTagline || industry).trim();
  const bio = whatsappBio.trim();
  const wa = whatsappNumber.trim();
  const phone = cardDirectPhone.trim();
  const email = cardEmail.trim();
  const area = serviceArea.trim();
  const hours = openingHours.trim();
  const web = cardWebsite.trim();
  const hasImage = Boolean(
    generatedImage && !isBrandPlaceholder(generatedImage),
  );

  const shareUrl = buildDigitalCardShareUrl({
    businessName: name,
    slogan: tagline,
    whatsappNumber: wa,
    directPhone: phone,
    email,
    serviceArea: area,
    openingHours: hours,
    website: web,
    bio,
  });

  const empty =
    !name && !tagline && !bio && !wa && !phone && !email && !area && !hours && !web;

  return (
    <article
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0B0F19]"
      aria-label="כרטיס ביקור דיגיטלי"
      dir="rtl"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3">
        <div className="flex shrink-0 flex-col items-center text-center">
          <div className="relative mb-2 h-14 w-14 shrink-0">
            <div
              className="absolute -inset-1 rounded-full bg-sky-500/30 blur-md"
              aria-hidden
            />
            <div className="relative h-full w-full overflow-hidden rounded-full bg-[#070B19] ring-2 ring-sky-400/70 ring-offset-1 ring-offset-[#0B0F19]">
              {hasImage ? (
                <Image
                  src={generatedImage}
                  alt={name || "לוגו"}
                  fill
                  className="object-cover object-center"
                  sizes="56px"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-900 text-lg font-bold text-sky-300">
                  {(name || "ע").slice(0, 1)}
                </div>
              )}
            </div>
          </div>
          <p className="text-sm font-bold text-slate-100">
            {name || "העסק שלך"}
          </p>
          {tagline ? (
            <p className="mt-0.5 text-[11px] text-slate-400">{tagline}</p>
          ) : null}
        </div>

        {bio ? (
          <p className="mt-2 max-h-16 overflow-y-auto whitespace-pre-wrap text-center text-[11px] leading-relaxed text-slate-300">
            {bio}
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          {phone ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-900/80 px-2.5 py-1 text-[10px] text-slate-200">
              <Phone className="h-3 w-3 text-sky-400" />
              <span dir="ltr">{phone}</span>
            </span>
          ) : null}
          {wa ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-700/50 bg-emerald-950/40 px-2.5 py-1 text-[10px] text-emerald-200">
              <MessageCircle className="h-3 w-3" />
              <span dir="ltr">{wa}</span>
            </span>
          ) : null}
          {email ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-900/80 px-2.5 py-1 text-[10px] text-slate-200">
              <Mail className="h-3 w-3 text-sky-400" />
              <span className="max-w-[120px] truncate" dir="ltr">
                {email}
              </span>
            </span>
          ) : null}
          {area ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-900/80 px-2.5 py-1 text-[10px] text-slate-200">
              <MapPin className="h-3 w-3 text-sky-400" />
              {area}
            </span>
          ) : null}
          {hours ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-900/80 px-2.5 py-1 text-[10px] text-slate-200">
              <Clock className="h-3 w-3 text-sky-400" />
              {hours}
            </span>
          ) : null}
          {web ? (
            <a
              href={web.startsWith("http") ? web : `https://${web}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-900/80 px-2.5 py-1 text-[10px] text-slate-200"
            >
              <Globe2 className="h-3 w-3 text-sky-400" />
              <span className="max-w-[120px] truncate" dir="ltr">
                {web.replace(/^https?:\/\//i, "")}
              </span>
            </a>
          ) : null}
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-3">
          <button
            type="button"
            disabled={empty}
            onClick={() =>
              window.open(shareUrl, "_blank", "noopener,noreferrer")
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-sm font-bold text-white transition hover:bg-[#20bd5a] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <MessageCircle className="h-4 w-4" />
            שלח כרטיס ישיר בוואטסאפ
          </button>
        </div>
      </div>
    </article>
  );
}
