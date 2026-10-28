"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Check,
  Copy,
  Download,
  Loader2,
  Save,
  Trash2,
  Zap,
} from "lucide-react";
import { MAX_VARIANTS_ERROR_HE } from "@/lib/db/draft-constants";
import {
  callFinalizePost,
  getActiveSelectedVariantId,
  getActiveSessionId,
} from "@/lib/api/finalize-post";
import { buildDigitalCardShareUrl } from "@/lib/ai/digital-card";
import { useEnhanceImage } from "@/hooks/useEnhanceImage";
import {
  ENHANCE_STAGE_LABELS,
  selectIsAtVariantLimit,
  useDraftVariantsStore,
} from "@/store/useDraftVariantsStore";
import {
  selectActiveCaption,
  type ActivePlatform,
  usePostStore,
} from "@/store/usePostStore";
import {
  type ManualGuidePlatform,
  selectIsOfficialConnectedForPlatform,
  useSocialConnectStore,
} from "@/store/useSocialConnectStore";
import { useToastStore } from "@/store/useToastStore";
import PlatformCapsules from "./PlatformCapsules";
import StudioPlatformMockup from "./StudioPlatformMockup";

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

export default function PreviewColumn() {
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [finalizeBusy, setFinalizeBusy] = useState(false);

  const { isImageBusy, enhanceStage } = useEnhanceImage();

  const businessName = usePostStore((s) => s.businessName);
  const headline = usePostStore((s) => s.headline);
  const generatedImage = usePostStore((s) => s.generatedImage);
  const studioMode = usePostStore((s) => s.studioMode);
  const services = usePostStore((s) => s.services);
  const whatsappNumber = usePostStore((s) => s.whatsappNumber);
  const cardDirectPhone = usePostStore((s) => s.cardDirectPhone);
  const cardEmail = usePostStore((s) => s.cardEmail);
  const serviceArea = usePostStore((s) => s.serviceArea);
  const openingHours = usePostStore((s) => s.openingHours);
  const cardWebsite = usePostStore((s) => s.cardWebsite);
  const whatsappBio = usePostStore((s) => s.whatsappBio);
  const activePlatform = usePostStore((s) => s.activePlatform);
  const caption = usePostStore(selectActiveCaption);

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

  const variants = useDraftVariantsStore((s) => s.variants);
  const activeVariantIndex = useDraftVariantsStore((s) => s.activeVariantIndex);
  const atLimit = useDraftVariantsStore(selectIsAtVariantLimit);
  const draftSessionId = useDraftVariantsStore((s) => s.sessionId);
  const pendingEnhanceFlavors = useDraftVariantsStore(
    (s) => s.pendingEnhanceFlavors,
  );
  const activeFlavor = useDraftVariantsStore((s) => s.activeFlavor);
  const selectEnhanceFlavor = useDraftVariantsStore(
    (s) => s.selectEnhanceFlavor,
  );

  const canCommit = variants.length > 0 && activeVariantIndex != null;

  const overlayLabel =
    enhanceStage !== "idle"
      ? ENHANCE_STAGE_LABELS[enhanceStage]
      : "משדרג תמונה...";

  const currentPlatformCaption = [headline, caption]
    .filter(Boolean)
    .join("\n\n");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(currentPlatformCaption);
      setCopied(true);
      showToast("הטקסט הועתק ללוח");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
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
      setImageError("הורדת התמונה נכשלה");
      showToast("הורדת התמונה נכשלה");
    }
  }

  function handleSendWhatsApp() {
    const text = currentPlatformCaption || "שלום!";
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function handleDiscardSession() {
    const sessionId = getActiveSessionId() ?? draftSessionId;
    if (!sessionId || finalizeBusy) return;
    setFinalizeBusy(true);
    setImageError(null);
    try {
      const result = await callFinalizePost({
        action: "discard",
        sessionId,
        showSuccessToast: false,
      });
      if (!result.success) {
        setImageError(result.error ?? "איפוס הטיוטה נכשל");
      }
    } finally {
      setFinalizeBusy(false);
    }
  }

  async function finalizeCommit(): Promise<boolean> {
    const sessionId = getActiveSessionId() ?? draftSessionId;
    const selectedVariantId = getActiveSelectedVariantId();

    if (!sessionId || !selectedVariantId) {
      setImageError("בחרו גרסה לשמירה לפני הפרסום");
      return false;
    }

    setFinalizeBusy(true);
    setImageError(null);
    try {
      const result = await callFinalizePost({
        action: "commit",
        sessionId,
        selectedVariantId,
      });
      if (!result.success) {
        setImageError(result.error ?? "שמירת הפוסט נכשלה");
        return false;
      }
      return true;
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "שמירת הפוסט נכשלה");
      return false;
    } finally {
      setFinalizeBusy(false);
    }
  }

  async function handleSaveOrPublish() {
    if (finalizeBusy || isImageBusy) return;

    if (canCommit) {
      const ok = await finalizeCommit();
      if (!ok) return;
    } else if (variants.length === 0) {
      // Allow publishing current preview copy without draft variants
    }

    if (studioMode === "card") {
      window.open(
        buildDigitalCardShareUrl({
          businessName,
          slogan: services,
          whatsappNumber,
          directPhone: cardDirectPhone,
          email: cardEmail,
          serviceArea,
          openingHours,
          website: cardWebsite,
          bio: whatsappBio,
        }),
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }

    const text = [headline, caption].filter(Boolean).join("\n\n");

    // Pathway A: official channel connected → 1-click publish affordance (stub)
    if (
      officialConnected ||
      selectIsOfficialConnectedForPlatform(activePlatform)
    ) {
      showToast("הפוסט נשלח לפרסום (הדמיה) — חיבור רשמי פעיל");
      return;
    }

    // Pathway B: guided manual publish for social platforms
    const guidePlatform = toGuidePlatform(activePlatform);
    if (guidePlatform) {
      openGuide(guidePlatform);
      return;
    }

    // WhatsApp / fallback
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <section className="flex h-full min-h-0 w-full flex-col gap-1.5 lg:overflow-hidden">
      {/* Preview card — constrained so the full card fits in the viewport */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0B0F19] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-hidden">
            <StudioPlatformMockup />
          </div>

          {isImageBusy ? (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-[#0B0F19]/80 px-4 text-center backdrop-blur-[2px]">
              <Loader2 className="h-8 w-8 animate-spin text-sky-brand" />
              <p className="max-w-sm rounded-2xl border border-sky-brand/30 bg-slate-900/95 px-4 py-3 text-xs font-semibold leading-relaxed text-slate-100 shadow-sm sm:text-[13px]">
                {overlayLabel}
              </p>
              <p className="text-[11px] font-medium text-slate-400">
                כ־30–60 שניות
              </p>
            </div>
          ) : null}
        </div>

        {pendingEnhanceFlavors && !isImageBusy ? (
          <div className="shrink-0 border-t border-slate-800/80 bg-[#0B0F19] px-2 py-1.5">
            <p className="mb-1 text-center text-[10px] font-bold text-slate-400">
              לחצו על תמונה לבחירה
            </p>
            <div className="mx-auto grid max-w-md grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={activeFlavor === "natural"}
                onClick={() => selectEnhanceFlavor("natural")}
                className={[
                  "overflow-hidden rounded-lg transition",
                  activeFlavor === "natural"
                    ? "border-2 border-sky-400 ring-2 ring-sky-500 shadow-[0_0_12px_rgba(56,189,248,0.35)]"
                    : "cursor-pointer border border-slate-700 opacity-75 hover:opacity-100",
                ].join(" ")}
              >
                <div className="relative aspect-square max-h-20 bg-slate-900">
                  <Image
                    src={pendingEnhanceFlavors.naturalUrl}
                    alt="אותנטי וטבעי"
                    fill
                    className="object-cover object-center"
                    sizes="96px"
                    unoptimized
                  />
                </div>
              </button>
              <button
                type="button"
                aria-pressed={activeFlavor === "studio"}
                onClick={() => selectEnhanceFlavor("studio")}
                className={[
                  "overflow-hidden rounded-lg transition",
                  activeFlavor === "studio"
                    ? "border-2 border-sky-400 ring-2 ring-sky-500 shadow-[0_0_12px_rgba(56,189,248,0.35)]"
                    : "cursor-pointer border border-slate-700 opacity-75 hover:opacity-100",
                ].join(" ")}
              >
                <div className="relative aspect-square max-h-20 bg-slate-900">
                  <Image
                    src={pendingEnhanceFlavors.studioUrl}
                    alt="סטודיו מסחרי"
                    fill
                    className="object-cover object-center"
                    sizes="96px"
                    unoptimized
                  />
                </div>
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Platform switch — always visible under preview */}
      <div className="shrink-0 rounded-xl border border-slate-200 bg-white px-1.5 py-1.5 shadow-sm">
        <PlatformCapsules />
      </div>

      {/* Dedicated export actions */}
      <div className="flex w-full shrink-0 gap-2">
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 shadow-sm transition hover:border-sky-brand/40 hover:text-sky-brand"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "הועתק ✓" : "העתק טקסט"}
        </button>
        <button
          type="button"
          onClick={() => void handleDownload()}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 shadow-sm transition hover:border-sky-brand/40 hover:text-sky-brand"
        >
          <Download className="h-3.5 w-3.5" />
          הורד תמונה
        </button>
      </div>

      <div className="flex w-full shrink-0 gap-2">
        <button
          type="button"
          onClick={handleSendWhatsApp}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#25D366] px-3 py-2 text-[11px] font-bold text-white shadow-sm transition hover:brightness-105"
        >
          <Zap className="h-3.5 w-3.5" />
          וואטסאפ
        </button>
        <button
          type="button"
          onClick={() => void handleSaveOrPublish()}
          disabled={finalizeBusy || isImageBusy}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:border-sky-brand/40 hover:text-sky-brand disabled:cursor-not-allowed disabled:opacity-50"
        >
          {finalizeBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : officialConnected ? (
            <Zap className="h-3.5 w-3.5" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {officialConnected
            ? "פרסום"
            : toGuidePlatform(activePlatform)
              ? "מדריך"
              : "שמור"}
        </button>
        {variants.length > 0 ? (
          <button
            type="button"
            onClick={() => void handleDiscardSession()}
            disabled={finalizeBusy || isImageBusy}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-2.5 py-2 text-slate-500 transition hover:border-red-200 hover:text-red-600 disabled:opacity-50"
            title="מחק והתחל חדש"
            aria-label="מחק והתחל חדש"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {imageError || atLimit ? (
        <div className="shrink-0 space-y-1">
          {imageError ? (
            <p className="text-xs text-amber-700" role="status">
              {imageError.includes("מקסימום")
                ? MAX_VARIANTS_ERROR_HE
                : imageError}
            </p>
          ) : null}
          {atLimit ? (
            <p
              className="rounded-lg bg-amber-50 px-2.5 py-1 text-center text-[11px] font-semibold text-amber-800"
              role="status"
            >
              הגעת למקסימום גרסאות (4/4)
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
