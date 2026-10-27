"use client";

import Image from "next/image";
import { useRef, useState, type ReactNode } from "react";
import {
  Check,
  Copy,
  Download,
  ImagePlus,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
  Zap,
} from "lucide-react";
import type { PostDraftVariantRow } from "@/lib/db/schema";
import { MAX_VARIANTS_ERROR_HE } from "@/lib/db/draft-constants";
import {
  callFinalizePost,
  getActiveSelectedVariantId,
  getActiveSessionId,
} from "@/lib/api/finalize-post";
import { buildDigitalCardShareUrl } from "@/lib/ai/digital-card";
import { ensureDraftSessionId } from "@/lib/session/draft-session";
import { useEnhanceImage } from "@/hooks/useEnhanceImage";
import {
  ENHANCE_STAGE_LABELS,
  MAX_DRAFT_VARIANTS,
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [finalizeBusy, setFinalizeBusy] = useState(false);

  const {
    selectFileForEnhance,
    isImageBusy,
    atDualLimit,
    enhanceStage,
  } = useEnhanceImage();

  const businessName = usePostStore((s) => s.businessName);
  const headline = usePostStore((s) => s.headline);
  const instagramCaption = usePostStore((s) => s.instagramCaption);
  const facebookCaption = usePostStore((s) => s.facebookCaption);
  const imagePrompt = usePostStore((s) => s.imagePrompt);
  const postGoal = usePostStore((s) => s.postGoal);
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
  const setGeneratedImage = usePostStore((s) => s.setGeneratedImage);
  const setIsImageBusy = usePostStore((s) => s.setIsImageBusy);
  const setCaption = usePostStore((s) => s.setCaption);
  const setInstagramCaption = usePostStore((s) => s.setInstagramCaption);
  const setFacebookCaption = usePostStore((s) => s.setFacebookCaption);
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

  const variants = useDraftVariantsStore((s) => s.variants);
  const activeVariantIndex = useDraftVariantsStore((s) => s.activeVariantIndex);
  const atLimit = useDraftVariantsStore(selectIsAtVariantLimit);
  const selectVariant = useDraftVariantsStore((s) => s.selectVariant);
  const applyEnhanceResult = useDraftVariantsStore((s) => s.applyEnhanceResult);
  const setSessionId = useDraftVariantsStore((s) => s.setSessionId);
  const draftSessionId = useDraftVariantsStore((s) => s.sessionId);
  const pendingEnhanceFlavors = useDraftVariantsStore(
    (s) => s.pendingEnhanceFlavors,
  );
  const activeFlavor = useDraftVariantsStore((s) => s.activeFlavor);
  const selectEnhanceFlavor = useDraftVariantsStore(
    (s) => s.selectEnhanceFlavor,
  );

  const displayIndex = activeVariantIndex ?? variants.length;
  const canCommit = variants.length > 0 && activeVariantIndex != null;
  const counterLabel =
    variants.length > 0
      ? `גרסה ${displayIndex || 1} מתוך ${MAX_DRAFT_VARIANTS}`
      : `גרסה 0 מתוך ${MAX_DRAFT_VARIANTS}`;

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
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
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
    } catch {
      setImageError("הורדת התמונה נכשלה");
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

  async function handleRegenerateImage() {
    if (isImageBusy || atLimit) return;
    setImageError(null);
    setIsImageBusy(true);

    try {
      const sessionId = ensureDraftSessionId();
      setSessionId(sessionId);

      const prompt =
        imagePrompt ||
        `Commercial photo for ${businessName}: ${postGoal}`;

      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model: "schnell",
          imageSize: "square_hd",
          sessionId,
          headline: headline || undefined,
          igCaption: instagramCaption || undefined,
          fbCaption: facebookCaption || undefined,
        }),
      });

      const json = (await res.json()) as {
        imageUrl?: string;
        variantIndex?: number;
        variants?: PostDraftVariantRow[];
        error?: string;
      };

      if (!res.ok || !json.imageUrl) {
        throw new Error(json.error ?? "יצירת תמונה נכשלה");
      }

      if (json.variants && typeof json.variantIndex === "number") {
        applyEnhanceResult({
          sessionId,
          variants: json.variants,
          variantIndex: json.variantIndex,
        });
      } else {
        setGeneratedImage(json.imageUrl);
      }
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "שגיאה בהחלפת תמונה");
    } finally {
      setIsImageBusy(false);
    }
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

  async function handleUpload(file: File) {
    setImageError(null);
    setStudioMode("enhance");
    // Preview only — processing starts from the control panel button
    const result = await selectFileForEnhance(file);
    if (!result.ok && result.error) {
      setImageError(result.error);
    }
    if (fileRef.current) fileRef.current.value = "";
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

  function onCaptionChange(value: string) {
    setCaption(value);
    if (
      activePlatform === "facebook" ||
      activePlatform === "google" ||
      activePlatform === "easy" ||
      activePlatform === "linkedin" ||
      activePlatform === "whatsapp"
    ) {
      setFacebookCaption(value);
    } else if (activePlatform === "instagram") {
      setInstagramCaption(value);
    } else {
      setInstagramCaption(value);
      setFacebookCaption(value);
    }
  }

  return (
    <section className="flex w-full flex-col gap-2 self-start">
      {/* Locked uniform mockup chassis — identical for all 6 platforms */}
      <div className="relative flex h-[560px] w-full flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0B0F19] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <div className="flex shrink-0 flex-wrap justify-center gap-2 border-b border-slate-800/80 bg-[#0B0F19] px-3 py-2">
          <button
            type="button"
            onClick={handleRegenerateImage}
            disabled={isImageBusy || atLimit}
            className="inline-flex items-center gap-1.5 rounded-full border border-sky-brand/40 bg-sky-brand px-3 py-1.5 text-xs font-bold text-white shadow-md transition hover:bg-sky-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            שנה תמונה
          </button>
          <button
            type="button"
            onClick={() => {
              setStudioMode("enhance");
              fileRef.current?.click();
            }}
            disabled={isImageBusy || atDualLimit}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-bold text-slate-200 shadow-md transition hover:border-sky-brand/50 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            {atDualLimit
              ? "מקסימום גרסאות"
              : variants.length > 0
                ? "צור עוד גרסה"
                : "העלה תמונה"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="mx-auto flex h-full w-full min-h-0 max-w-md flex-1 items-stretch justify-center overflow-hidden">
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
          <div className="shrink-0 border-t border-slate-800/80 bg-[#0B0F19] px-3 py-2">
            <p className="mb-1.5 text-center text-[10px] font-bold text-slate-400">
              בחרו גרסה — מתעדכן מיד בכל הפלטפורמות
            </p>
            <div className="mx-auto grid max-w-md grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={activeFlavor === "natural"}
                onClick={() => selectEnhanceFlavor("natural")}
                className={[
                  "flex items-center gap-2 overflow-hidden rounded-xl px-2 py-1.5 text-right transition",
                  activeFlavor === "natural"
                    ? "ring-2 ring-sky-500 border border-sky-400 bg-sky-500/10 shadow-[0_0_15px_rgba(56,189,248,0.2)]"
                    : "cursor-pointer border border-slate-800 bg-[#0B0F19]/60 opacity-70 hover:border-slate-700",
                ].join(" ")}
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-900">
                  <Image
                    src={pendingEnhanceFlavors.naturalUrl}
                    alt="אותנטי וטבעי"
                    fill
                    className="object-cover"
                    sizes="48px"
                    unoptimized
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold leading-tight text-slate-100">
                    אותנטי וטבעי
                  </p>
                  {activeFlavor === "natural" ? (
                    <span className="mt-0.5 inline-block text-[9px] font-bold text-sky-300">
                      ✓ נבחר
                    </span>
                  ) : null}
                </div>
              </button>
              <button
                type="button"
                aria-pressed={activeFlavor === "studio"}
                onClick={() => selectEnhanceFlavor("studio")}
                className={[
                  "flex items-center gap-2 overflow-hidden rounded-xl px-2 py-1.5 text-right transition",
                  activeFlavor === "studio"
                    ? "ring-2 ring-sky-500 border border-sky-400 bg-sky-500/10 shadow-[0_0_15px_rgba(56,189,248,0.2)]"
                    : "cursor-pointer border border-slate-800 bg-[#0B0F19]/60 opacity-70 hover:border-slate-700",
                ].join(" ")}
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-900">
                  <Image
                    src={pendingEnhanceFlavors.studioUrl}
                    alt="סטודיו מסחרי"
                    fill
                    className="object-cover"
                    sizes="48px"
                    unoptimized
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold leading-tight text-slate-100">
                    סטודיו מסחרי
                  </p>
                  {activeFlavor === "studio" ? (
                    <span className="mt-0.5 inline-block text-[9px] font-bold text-sky-300">
                      ✓ נבחר
                    </span>
                  ) : null}
                </div>
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Fixed dock under mockup — capsules + actions */}
      <div className="shrink-0 rounded-2xl border border-slate-200 bg-white px-2 py-2 shadow-sm">
        <PlatformCapsules />
      </div>

      <div className="flex w-full shrink-0 gap-2">
        <TrayBtn
          onClick={() => void handleCopy()}
          icon={
            copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )
          }
          label={copied ? "הועתק בהצלחה! ✓" : "📋 העתק טקסט"}
          className="flex-1"
        />
        <TrayBtn
          onClick={() => void handleDownload()}
          icon={<Download className="h-3.5 w-3.5" />}
          label="📥 הורד תמונה"
          className="flex-1"
        />
        <button
          type="button"
          onClick={handleSendWhatsApp}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#25D366] px-3 py-2 text-[11px] font-bold text-white shadow-md transition hover:brightness-105"
        >
          <Zap className="h-3.5 w-3.5" />
          שלח לוואטסאפ
        </button>
      </div>

      <div className="flex w-full shrink-0">
        <button
          type="button"
          onClick={() => void handleSaveOrPublish()}
          disabled={finalizeBusy || isImageBusy}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:border-sky-brand/40 hover:text-sky-brand disabled:cursor-not-allowed disabled:opacity-50"
        >
          {finalizeBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : officialConnected ? (
            <Zap className="h-3.5 w-3.5" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {officialConnected
            ? "פרסום בלחיצה"
            : toGuidePlatform(activePlatform)
              ? "מדריך פרסום"
              : "שמור / פרסם"}
        </button>
      </div>

      <div className="no-scrollbar shrink-0 space-y-2 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
          {variants.length > 0 ? (
            <div className="space-y-2">
              <div
                className="no-scrollbar flex gap-2 overflow-x-auto pb-1"
                role="listbox"
                aria-label="גרסאות טיוטה"
              >
                {variants.map((variant) => {
                  const active = variant.variant_index === activeVariantIndex;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => selectVariant(variant.variant_index)}
                      className={[
                        "relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100 transition",
                        active
                          ? "border-2 border-sky-500 ring-2 ring-sky-500/20"
                          : "border border-slate-200 hover:border-sky-300",
                      ].join(" ")}
                      title={`גרסה ${variant.variant_index}`}
                    >
                      <Image
                        src={variant.image_url}
                        alt={`גרסה ${variant.variant_index}`}
                        fill
                        className="object-cover"
                        sizes="56px"
                        unoptimized
                      />
                      <span
                        className={[
                          "absolute inset-x-0 bottom-0 truncate bg-black/55 px-1 py-0.5 text-center text-[9px] font-bold text-white",
                          active ? "bg-sky-600/90" : "",
                        ].join(" ")}
                      >
                        גרסה {variant.variant_index}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-center text-[11px] font-semibold text-slate-500">
                {counterLabel}
              </p>
              {atLimit ? (
                <p
                  className="rounded-lg bg-amber-50 px-3 py-2 text-center text-[11px] font-semibold leading-relaxed text-amber-800"
                  role="status"
                >
                  הגעת למקסימום גרסאות (4/4)
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-center text-[11px] font-semibold text-slate-400">
              {counterLabel}
            </p>
          )}

          {imageError ? (
            <p className="text-xs text-amber-700" role="status">
              {imageError.includes("מקסימום")
                ? MAX_VARIANTS_ERROR_HE
                : imageError}
            </p>
          ) : null}

          {variants.length > 0 ? (
            <button
              type="button"
              onClick={() => void handleDiscardSession()}
              disabled={finalizeBusy || isImageBusy}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              מחק והתחל חדש
            </button>
          ) : null}

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500">טקסט הפוסט</p>
            <textarea
              value={caption}
              onChange={(e) => onCaptionChange(e.target.value)}
              rows={3}
              className="studio-input max-h-28 min-h-[4.5rem] resize-none text-[13px] leading-relaxed"
              placeholder="טקסט הפוסט יופיע כאן..."
            />
          </div>
      </div>
    </section>
  );
}

function TrayBtn({
  onClick,
  icon,
  label,
  className,
}: {
  onClick: () => void;
  icon: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:border-sky-brand/40 hover:text-sky-brand",
        className ?? "",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}
