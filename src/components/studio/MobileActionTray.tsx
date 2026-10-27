"use client";

import { useRef, useState } from "react";
import { Check, Copy, ImagePlus, Loader2, Zap } from "lucide-react";
import { useEnhanceImage } from "@/hooks/useEnhanceImage";
import {
  buildDigitalCardShareText,
  buildDigitalCardShareUrl,
} from "@/lib/ai/digital-card";
import {
  selectActiveCaption,
  type ActivePlatform,
  usePostStore,
} from "@/store/usePostStore";
import {
  type ManualGuidePlatform,
  useSocialConnectStore,
} from "@/store/useSocialConnectStore";
import { useToastStore } from "@/store/useToastStore";

function toGuidePlatform(
  platform: ActivePlatform,
): ManualGuidePlatform | null {
  if (
    platform === "whatsapp" ||
    platform === "facebook" ||
    platform === "instagram" ||
    platform === "easy" ||
    platform === "linkedin"
  ) {
    return platform;
  }
  if (platform === "google") return "google";
  return null;
}

/**
 * Fixed bottom tray for mobile preview stage — swap image + copy/publish.
 */
export default function MobileActionTray() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  const { selectFileForEnhance, isImageBusy, atDualLimit } = useEnhanceImage();
  const headline = usePostStore((s) => s.headline);
  const caption = usePostStore(selectActiveCaption);
  const whatsappWaMeLink = usePostStore((s) => s.whatsappWaMeLink);
  const whatsappBio = usePostStore((s) => s.whatsappBio);
  const businessName = usePostStore((s) => s.businessName);
  const services = usePostStore((s) => s.services);
  const whatsappNumber = usePostStore((s) => s.whatsappNumber);
  const cardDirectPhone = usePostStore((s) => s.cardDirectPhone);
  const cardEmail = usePostStore((s) => s.cardEmail);
  const serviceArea = usePostStore((s) => s.serviceArea);
  const openingHours = usePostStore((s) => s.openingHours);
  const cardWebsite = usePostStore((s) => s.cardWebsite);
  const studioMode = usePostStore((s) => s.studioMode);
  const activePlatform = usePostStore((s) => s.activePlatform);
  const setStudioMode = usePostStore((s) => s.setStudioMode);

  const facebookConnected = useSocialConnectStore((s) => s.facebook.connected);
  const instagramConnected = useSocialConnectStore(
    (s) => s.instagram.connected,
  );
  const googleBusinessConnected = useSocialConnectStore(
    (s) => s.googleBusiness.connected,
  );
  const openGuide = useSocialConnectStore((s) => s.openGuide);
  const showToast = useToastStore((s) => s.showToast);

  const officialConnected =
    (activePlatform === "facebook" && facebookConnected) ||
    (activePlatform === "instagram" && instagramConnected) ||
    (activePlatform === "google" && googleBusinessConnected);

  async function handleCopyAndPublish() {
    if (studioMode === "card") {
      const fields = {
        businessName,
        slogan: services,
        whatsappNumber,
        directPhone: cardDirectPhone,
        email: cardEmail,
        serviceArea,
        openingHours,
        website: cardWebsite,
        bio: whatsappBio,
      };
      const text = buildDigitalCardShareText(fields);
      try {
        if (text) {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        }
      } catch {
        /* ignore */
      }
      window.open(
        buildDigitalCardShareUrl(fields),
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }

    const text = [headline, caption].filter(Boolean).join("\n\n");

    if (officialConnected) {
      showToast("הפוסט נשלח לפרסום (הדמיה) — חיבור רשמי פעיל");
      return;
    }

    const guidePlatform = toGuidePlatform(activePlatform);
    if (guidePlatform) {
      openGuide(guidePlatform);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }

    const target =
      whatsappWaMeLink ||
      `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(target, "_blank", "noopener,noreferrer");
  }

  async function onPick(file: File | undefined) {
    if (!file) return;
    setStudioMode("enhance");
    // Preview only — user starts enhance from the control panel
    await selectFileForEnhance(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 lg:hidden">
      <div className="pointer-events-auto border-t border-slate-200/80 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-md">
        <div className="mx-auto flex max-w-lg gap-2">
          <button
            type="button"
            disabled={isImageBusy || atDualLimit}
            onClick={() => fileRef.current?.click()}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-[12px] font-bold text-slate-800 shadow-sm transition active:scale-[0.98] disabled:opacity-50"
          >
            {isImageBusy ? (
              <Loader2 className="h-4 w-4 animate-spin text-sky-brand" />
            ) : (
              <ImagePlus className="h-4 w-4 text-sky-brand" />
            )}
            החלף תמונה
          </button>
          <button
            type="button"
            onClick={() => void handleCopyAndPublish()}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-b from-sky-brand to-sky-hover px-3 py-3 text-[12px] font-bold text-white shadow-sm transition active:scale-[0.98]"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {copied
              ? "הועתק!"
              : officialConnected
                ? "פרסום בלחיצה"
                : toGuidePlatform(activePlatform)
                  ? "מדריך פרסום"
                  : "⚡ העתק טקסט ופרסם"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => void onPick(e.target.files?.[0])}
          />
        </div>
      </div>
    </div>
  );
}
