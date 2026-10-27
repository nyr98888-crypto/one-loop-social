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
import {
  PLACEHOLDER_IMAGE,
  usePostStore,
} from "@/store/usePostStore";
import { buildDigitalCardShareUrl } from "@/lib/ai/digital-card";
import { downloadVCard } from "@/lib/ai/vcard";

function AvatarInitials({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
  return (
    <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-950 text-lg font-bold tracking-wide text-white">
      {initials || "OL"}
    </span>
  );
}

/**
 * Dark executive NFC-style digital business card — fills locked console frame.
 * Renders only fields that were filled in the form.
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
  const hasImage = Boolean(generatedImage && generatedImage !== PLACEHOLDER_IMAGE);

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

  function handleDownloadVcf() {
    const safeName = (name || "contact").replace(/[^\w\u0590-\u05FF-]+/g, "_");
    downloadVCard(
      {
        fullName: name || undefined,
        org: name || undefined,
        phone,
        whatsapp: wa,
        email,
        url: web || undefined,
        note:
          [tagline, bio, area, hours].filter(Boolean).join(" · ") || undefined,
      },
      `${safeName}.vcf`,
    );
  }

  const empty = !name && !tagline && !bio && !wa && !phone && !email && !area && !hours && !web;

  return (
    <article
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0B0F19]"
      aria-label="כרטיס ביקור דיגיטלי"
      dir="rtl"
    >
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-3 pt-5">
        {/* Header: glowing avatar + typography */}
        <div className="flex shrink-0 flex-col items-center text-center">
          <div className="relative mb-3 h-20 w-20 shrink-0">
            <div
              className="absolute -inset-1 rounded-full bg-sky-500/30 blur-md"
              aria-hidden
            />
            <div className="relative h-full w-full overflow-hidden rounded-full ring-2 ring-sky-400/70 ring-offset-2 ring-offset-[#0B0F19]">
              {hasImage ? (
                <Image
                  src={generatedImage}
                  alt={name || "לוגו"}
                  fill
                  className="object-cover"
                  sizes="80px"
                  unoptimized
                />
              ) : (
                <AvatarInitials name={name} />
              )}
            </div>
          </div>
          <h3 className="max-w-full truncate text-xl font-bold text-white">
            {name || "שם העסק"}
          </h3>
          {tagline ? (
            <p className="mt-1 line-clamp-2 text-sm text-sky-400">{tagline}</p>
          ) : (
            <p className="mt-1 text-sm text-sky-400/50">קטגוריה / סלוגן</p>
          )}
          {bio ? (
            <p className="mt-2 line-clamp-3 max-w-sm text-[11px] leading-relaxed text-slate-400">
              {bio}
            </p>
          ) : null}
        </div>

        {/* Dynamic contact actions */}
        <div className="mt-5 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {empty ? (
            <p className="mt-4 text-center text-[12px] leading-relaxed text-slate-500">
              מלאו שדות בטופס — הכרטיס מתעדכן מיד
            </p>
          ) : null}

          {wa ? (
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 font-medium text-white transition hover:bg-[#20bd5a]"
            >
              <MessageCircle className="h-4 w-4" />
              וואטסאפ · {wa}
            </a>
          ) : null}

          {phone ? (
            <a
              href={`tel:${phone.replace(/\s+/g, "")}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-2 text-white transition hover:bg-slate-700"
            >
              <Phone className="h-4 w-4" />
              {phone}
            </a>
          ) : null}

          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {email ? (
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-[11px] text-slate-200"
              >
                <Mail className="h-3 w-3 text-sky-400" />
                <span className="max-w-[140px] truncate" dir="ltr">
                  {email}
                </span>
              </a>
            ) : null}
            {area ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-[11px] text-slate-200">
                <MapPin className="h-3 w-3 text-sky-400" />
                {area}
              </span>
            ) : null}
            {hours ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-[11px] text-slate-200">
                <Clock className="h-3 w-3 text-sky-400" />
                {hours}
              </span>
            ) : null}
            {web ? (
              <a
                href={web.startsWith("http") ? web : `https://${web}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-[11px] text-slate-200"
              >
                <Globe2 className="h-3 w-3 text-sky-400" />
                <span className="max-w-[140px] truncate" dir="ltr">
                  {web.replace(/^https?:\/\//i, "")}
                </span>
              </a>
            ) : null}
          </div>

          <div className="mt-auto flex flex-col gap-2 pt-3">
            {!wa ? (
              <button
                type="button"
                onClick={() =>
                  window.open(shareUrl, "_blank", "noopener,noreferrer")
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 font-medium text-white transition hover:bg-[#20bd5a]"
              >
                <MessageCircle className="h-4 w-4" />
                שלח כרטיס ישיר בוואטסאפ
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleDownloadVcf}
              disabled={empty}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-[11px] font-semibold text-slate-300 transition hover:border-sky-500/40 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              הורד איש קשר (.vcf)
            </button>
          </div>
        </div>

        <p className="mt-3 shrink-0 text-center text-[10px] font-medium tracking-wide text-slate-600">
          One Loop Social Verified
        </p>
      </div>
    </article>
  );
}
