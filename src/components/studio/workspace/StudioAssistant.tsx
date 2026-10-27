"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import {
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import type {
  GeneratedBioContent,
  GeneratedPostContent,
} from "@/lib/ai/types";
import { buildDigitalCardShareUrl } from "@/lib/ai/digital-card";
import type { PostDraftVariantRow } from "@/lib/db/schema";
import { ensureDraftSessionId } from "@/lib/session/draft-session";
import { useEnhanceImage } from "@/hooks/useEnhanceImage";
import { useDraftVariantsStore } from "@/store/useDraftVariantsStore";
import {
  type StudioMode,
  usePostStore,
} from "@/store/usePostStore";

const MODES: {
  id: StudioMode;
  label: string;
  icon: typeof Sparkles;
}[] = [
  {
    id: "post",
    label: "⚡ יצירת פוסט",
    icon: Sparkles,
  },
  {
    id: "enhance",
    label: "📸 שדרוג תמונה",
    icon: Wand2,
  },
  {
    id: "card",
    label: "📇 כרטיס ביקור דיגיטלי",
    icon: ImageIcon,
  },
];

const ENHANCE_PRESET_CHIPS: { label: string; prompt: string }[] = [
  {
    label: "💡 תאורת יום רכה ופוקוס חד",
    prompt: "תאורת יום רכה וטבעית, פוקוס חד על הנושא, ניקיון עדין של רעשים",
  },
  {
    label: "🏢 רקע קליניקה יוקרתית",
    prompt:
      "רקע קליניקה יוקרתית ונקייה, שיש בהיר, תאורה רכה ומחמיאה, אווירה מקצועית",
  },
  {
    label: "🔧 רקע מוסך בוטיק מבריק",
    prompt:
      "רקע מוסך בוטיק מודרני ומבריק, רצפת אפוקסי, תאורת סטודיו חמה, מראה מסחרי",
  },
  {
    label: "🌿 טשטוש רקע עדין ומודרני",
    prompt: "טשטוש רקע עדין ומודרני, עומק שדה קולנועי, הדגשת הנושא במרכז",
  },
];

function friendlyError(raw: string): string {
  const lower = raw.toLowerCase();
  if (
    lower.includes("expected json") ||
    lower.includes("businessname") ||
    lower.includes("postgoal") ||
    lower.includes("expected")
  ) {
    return "נא למלא שם עסק ומטרת פוסט";
  }
  if (lower.includes("failed") || lower.includes("error")) {
    return "משהו השתבש — נסו שוב";
  }
  return raw;
}

export default function StudioAssistant() {
  const enhanceInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [enhanceInstruction, setEnhanceInstruction] = useState("");
  const [busy, setBusy] = useState<"text" | "image" | "both" | "bio" | null>(
    null,
  );

  const {
    selectFileForEnhance,
    startEnhance,
    clearPendingUpload,
    pendingEnhanceUpload,
    setEnhanceCustomInstruction,
    isImageBusy,
    atDualLimit,
  } = useEnhanceImage();
  const applyEnhanceResult = useDraftVariantsStore((s) => s.applyEnhanceResult);
  const setSessionId = useDraftVariantsStore((s) => s.setSessionId);
  const pendingEnhanceFlavors = useDraftVariantsStore(
    (s) => s.pendingEnhanceFlavors,
  );
  const activeFlavor = useDraftVariantsStore((s) => s.activeFlavor);
  const selectedEnhanceStyle = useDraftVariantsStore(
    (s) => s.selectedEnhanceStyle,
  );
  const setSelectedEnhanceStyle = useDraftVariantsStore(
    (s) => s.setSelectedEnhanceStyle,
  );
  const selectEnhanceFlavor = useDraftVariantsStore(
    (s) => s.selectEnhanceFlavor,
  );
  const atLimit = useDraftVariantsStore((s) => s.variants.length >= 4);

  const businessName = usePostStore((s) => s.businessName);
  const industry = usePostStore((s) => s.industry);
  const postGoal = usePostStore((s) => s.postGoal);
  const headline = usePostStore((s) => s.headline);
  const instagramCaption = usePostStore((s) => s.instagramCaption);
  const facebookCaption = usePostStore((s) => s.facebookCaption);
  const imagePrompt = usePostStore((s) => s.imagePrompt);
  const studioMode = usePostStore((s) => s.studioMode);
  const services = usePostStore((s) => s.services);
  const serviceArea = usePostStore((s) => s.serviceArea);
  const whatsappNumber = usePostStore((s) => s.whatsappNumber);
  const openingHours = usePostStore((s) => s.openingHours);
  const whatsappBio = usePostStore((s) => s.whatsappBio);
  const cardDirectPhone = usePostStore((s) => s.cardDirectPhone);
  const cardEmail = usePostStore((s) => s.cardEmail);
  const cardWebsite = usePostStore((s) => s.cardWebsite);
  const setBusinessName = usePostStore((s) => s.setBusinessName);
  const setIndustry = usePostStore((s) => s.setIndustry);
  const setPostGoal = usePostStore((s) => s.setPostGoal);
  const setHeadline = usePostStore((s) => s.setHeadline);
  const setStudioMode = usePostStore((s) => s.setStudioMode);
  const setActivePlatform = usePostStore((s) => s.setActivePlatform);
  const setIsImageBusy = usePostStore((s) => s.setIsImageBusy);
  const setGeneratedImage = usePostStore((s) => s.setGeneratedImage);
  const applyGenerated = usePostStore((s) => s.applyGenerated);
  const applyWhatsAppCard = usePostStore((s) => s.applyWhatsAppCard);
  const setInstagramCaption = usePostStore((s) => s.setInstagramCaption);
  const setFacebookCaption = usePostStore((s) => s.setFacebookCaption);
  const setServices = usePostStore((s) => s.setServices);
  const setServiceArea = usePostStore((s) => s.setServiceArea);
  const setWhatsappNumber = usePostStore((s) => s.setWhatsappNumber);
  const setOpeningHours = usePostStore((s) => s.setOpeningHours);
  const setCardDirectPhone = usePostStore((s) => s.setCardDirectPhone);
  const setCardEmail = usePostStore((s) => s.setCardEmail);
  const setCardWebsite = usePostStore((s) => s.setCardWebsite);
  const setMobileStage = usePostStore((s) => s.setMobileStage);
  const setIsGenerated = usePostStore((s) => s.setIsGenerated);

  function switchStudioMode(id: StudioMode) {
    setStudioMode(id);
    if (id === "card") {
      setActivePlatform("whatsapp");
    }
  }

  function shareDigitalCard() {
    const url = buildDigitalCardShareUrl({
      businessName,
      slogan: services,
      whatsappNumber,
      directPhone: cardDirectPhone,
      email: cardEmail,
      serviceArea,
      openingHours,
      website: cardWebsite,
      bio: whatsappBio,
    });
    setActivePlatform("whatsapp");
    setIsGenerated(true);
    setMobileStage("preview");
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const activeMode = MODES.find((m) => m.id === studioMode) ?? MODES[0];
  const canGeneratePost =
    businessName.trim().length > 0 && postGoal.trim().length > 0;
  const showPostValidationHint = !canGeneratePost && studioMode === "post";

  async function regenerateText() {
    if (busy || !canGeneratePost) return;
    setError(null);
    setBusy("text");

    try {
      const res = await fetch("/api/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, industry, postGoal }),
      });
      const json = (await res.json()) as {
        post?: GeneratedPostContent;
        error?: string;
      };
      if (!res.ok || !json.post) {
        throw new Error(friendlyError(json.error ?? "יצירת טקסט נכשלה"));
      }

      setHeadline(json.post.headline);
      setInstagramCaption(json.post.instagramCaption);
      setFacebookCaption(json.post.facebookCaption);
      usePostStore.setState({ imagePrompt: json.post.imagePrompt });
      setIsGenerated(true);
      setMobileStage("preview");
    } catch (err) {
      setError(
        err instanceof Error ? friendlyError(err.message) : "שגיאה",
      );
    } finally {
      setBusy(null);
    }
  }

  async function generateWhatsAppBioCard() {
    if (busy) return;
    setError(null);
    setBusy("bio");

    try {
      const res = await fetch("/api/generate-bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          services: services || industry,
          serviceArea,
          whatsappNumber,
          openingHours,
        }),
      });
      const json = (await res.json()) as {
        bio?: GeneratedBioContent;
        error?: string;
      };
      if (!res.ok || !json.bio) {
        throw new Error(friendlyError(json.error ?? "יצירת הביו נכשלה"));
      }
      applyWhatsAppCard(json.bio);
      if (services) setIndustry(services);
    } catch (err) {
      setError(
        err instanceof Error
          ? friendlyError(err.message)
          : "שגיאה ביצירת הביו",
      );
    } finally {
      setBusy(null);
    }
  }

  async function regenerateImage() {
    if (busy || atLimit || !canGeneratePost) return;
    setError(null);
    setBusy("image");
    setIsImageBusy(true);

    try {
      const sessionId = ensureDraftSessionId();
      setSessionId(sessionId);
      const prompt =
        imagePrompt ||
        `Brand identity commercial photograph, ${businessName}: ${postGoal}`;

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
        throw new Error(friendlyError(json.error ?? "יצירת תמונה נכשלה"));
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
      setIsGenerated(true);
      setMobileStage("preview");
    } catch (err) {
      setError(
        err instanceof Error ? friendlyError(err.message) : "שגיאה",
      );
    } finally {
      setBusy(null);
      setIsImageBusy(false);
    }
  }

  async function regenerateAll() {
    if (busy || atLimit || !canGeneratePost) return;
    setError(null);
    setBusy("both");
    setIsImageBusy(true);

    try {
      const postRes = await fetch("/api/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, industry, postGoal }),
      });
      const postJson = (await postRes.json()) as {
        post?: GeneratedPostContent;
        error?: string;
      };
      if (!postRes.ok || !postJson.post) {
        throw new Error(friendlyError(postJson.error ?? "יצירת טקסט נכשלה"));
      }

      const sessionId = ensureDraftSessionId();
      setSessionId(sessionId);
      const prompt =
        postJson.post.imagePrompt ||
        `Brand identity commercial photograph, ${businessName}: ${postGoal}`;

      const imageRes = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model: "schnell",
          imageSize: "square_hd",
          sessionId,
          headline: postJson.post.headline,
          igCaption: postJson.post.instagramCaption,
          fbCaption: postJson.post.facebookCaption,
        }),
      });
      const imageJson = (await imageRes.json()) as {
        imageUrl?: string;
        variantIndex?: number;
        variants?: PostDraftVariantRow[];
        error?: string;
      };
      if (!imageRes.ok || !imageJson.imageUrl) {
        throw new Error(friendlyError(imageJson.error ?? "יצירת תמונה נכשלה"));
      }

      applyGenerated({
        headline: postJson.post.headline,
        instagramCaption: postJson.post.instagramCaption,
        facebookCaption: postJson.post.facebookCaption,
        imagePrompt: postJson.post.imagePrompt,
        generatedImage: imageJson.imageUrl,
      });

      if (imageJson.variants && typeof imageJson.variantIndex === "number") {
        applyEnhanceResult({
          sessionId,
          variants: imageJson.variants,
          variantIndex: imageJson.variantIndex,
        });
      }
      setMobileStage("preview");
    } catch (err) {
      setError(
        err instanceof Error ? friendlyError(err.message) : "שגיאה",
      );
      setIsImageBusy(false);
    } finally {
      setBusy(null);
    }
  }

  async function onEnhancePick(file: File | undefined) {
    if (!file) return;
    setError(null);
    const result = await selectFileForEnhance(file);
    if (!result.ok && result.error) {
      setError(result.error);
    } else {
      setEnhanceCustomInstruction(enhanceInstruction);
    }
    if (enhanceInputRef.current) enhanceInputRef.current.value = "";
  }

  async function onStartEnhance() {
    setError(null);
    setEnhanceCustomInstruction(enhanceInstruction);
    const result = await startEnhance();
    if (!result.ok && result.error && result.error !== "busy") {
      setError(result.error);
    }
  }

  return (
    <section className="flex min-h-0 flex-col gap-2 self-start">
      {/* Segmented mode switcher — flush top, aligns with mockup top edge */}
      <div
        className="inline-flex w-full max-w-full flex-wrap justify-start gap-0.5 rounded-full border border-slate-200 bg-slate-100/90 p-1 shadow-sm"
        role="tablist"
        aria-label="מצב סטודיו"
      >
        {MODES.map(({ id, label }) => {
          const active = studioMode === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => switchStudioMode(id)}
              className={[
                "flex-1 rounded-full px-2.5 py-2 text-[11px] font-bold transition sm:text-xs",
                active
                  ? "bg-sky-brand text-white shadow-sky-glow"
                  : "bg-transparent text-slate-600 hover:bg-white hover:text-sky-brand",
              ].join(" ")}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="no-scrollbar flex min-h-0 flex-col gap-2 overflow-y-auto pb-1">
        <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-md sm:p-3.5">
          <div className="mb-2.5 flex items-start gap-2">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-sky-light text-sky-brand">
              <activeMode.icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900">
                {studioMode === "card"
                  ? "כרטיס ביקור דיגיטלי לעסק"
                  : activeMode.label}
              </h2>
              {studioMode === "card" ? (
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                  ממלאים רק מה שרוצים — כל השדות אופציונליים לחלוטין. הכרטיס מוכן
                  לשיתוף מיידי בוואטסאפ בלחיצה אחת.
                </p>
              ) : null}
            </div>
          </div>

          {studioMode === "enhance" ? (
            <div className="space-y-3">
              {pendingEnhanceFlavors ? (
                <EnhanceFlavorPicker
                  naturalUrl={pendingEnhanceFlavors.naturalUrl}
                  studioUrl={pendingEnhanceFlavors.studioUrl}
                  activeFlavor={activeFlavor}
                  onPick={(flavor) => selectEnhanceFlavor(flavor)}
                />
              ) : (
                <div className="space-y-3">
                  {/* Interactive style radio cards — RTL: authentic (right) · studio (left) */}
                  <div
                    className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
                    role="radiogroup"
                    aria-label="סגנון שדרוג"
                  >
                    <EnhanceStyleCard
                      title="אותנטי וטבעי"
                      selected={selectedEnhanceStyle === "authentic"}
                      onSelect={() => setSelectedEnhanceStyle("authentic")}
                      points={[
                        "שומר על המקום האמיתי שלך בלי להמציא רקעים",
                        "מחדד תווי פנים ומנקה רעשי צילום מהטלפון",
                        "תאורה טבעית כאילו צולם ביום מושלם",
                      ]}
                    />
                    <EnhanceStyleCard
                      title="סטודיו מסחרי"
                      selected={selectedEnhanceStyle === "studio"}
                      onSelect={() => setSelectedEnhanceStyle("studio")}
                      points={[
                        "מחליף את הרקע לסביבת עבודה יוקרתית ומצוחצחת",
                        "תאורת פרסומות מקצועית שמבליטה אותך",
                        "טשטוש רקע קולנועי שמושך את העין למרכז",
                      ]}
                    />
                  </div>

                  {pendingEnhanceUpload ? (
                    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      <div className="relative aspect-[4/3] max-h-40 w-full">
                        <Image
                          src={pendingEnhanceUpload.previewUrl}
                          alt="תצוגה מקדימה"
                          fill
                          className="object-contain"
                          sizes="320px"
                          unoptimized
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          clearPendingUpload();
                          setError(null);
                        }}
                        disabled={isImageBusy}
                        className="absolute left-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition hover:bg-white hover:text-slate-900 disabled:opacity-50"
                        aria-label="הסר תמונה"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}

                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-slate-700">
                      איך תרצו שהתמונה תיראה? (הנחיה ל-AI)
                    </span>
                    <p className="text-[11px] leading-relaxed text-slate-500">
                      טיפ לתוצאה מנצחת: ה-AI מבין הכי טוב תיאור של תאורה, רקע
                      ואווירה (במקום מה &apos;לא&apos; לעשות).
                    </p>
                    <textarea
                      className="studio-input max-h-28 min-h-[4rem] resize-none py-2 text-[13px]"
                      rows={2}
                      disabled={isImageBusy}
                      value={enhanceInstruction}
                      onChange={(e) => {
                        setEnhanceInstruction(e.target.value);
                        setEnhanceCustomInstruction(e.target.value);
                      }}
                      placeholder="לדוגמה: תאורת סטודיו חמה ומחמיאה, רקע מוסך בוטיק מודרני ונקי, לטשטש קלות את הרקע"
                    />
                  </label>

                  <div className="flex flex-wrap gap-1.5">
                    {ENHANCE_PRESET_CHIPS.map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        disabled={isImageBusy}
                        onClick={() => {
                          setEnhanceInstruction(chip.prompt);
                          setEnhanceCustomInstruction(chip.prompt);
                        }}
                        className="cursor-pointer rounded-xl border border-slate-600 bg-slate-800/90 px-3 py-2 text-xs font-medium text-slate-100 shadow-sm transition-all hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  {!pendingEnhanceUpload ? (
                    <button
                      type="button"
                      disabled={isImageBusy || atDualLimit}
                      onClick={() => enhanceInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const file = e.dataTransfer.files?.[0];
                        if (file?.type.startsWith("image/")) {
                          void onEnhancePick(file);
                        }
                      }}
                      className="flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-sky-brand/50 bg-sky-light px-4 py-5 text-center shadow-sm transition hover:border-sky-brand hover:bg-sky-brand/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ImagePlus className="h-7 w-7 text-sky-brand" />
                      <p className="text-sm font-bold text-slate-800">
                        העלה תמונה
                      </p>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    disabled={
                      isImageBusy || atDualLimit || !pendingEnhanceUpload
                    }
                    onClick={() => void onStartEnhance()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-sky-brand to-sky-hover px-3 py-3 text-sm font-bold text-white shadow-[0_5px_0_0_#0369a1] transition hover:brightness-105 enabled:active:translate-y-[3px] enabled:active:shadow-[0_2px_0_0_#0369a1] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                  >
                    {isImageBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span aria-hidden>⚡</span>
                    )}
                    שדרג תמונה עכשיו
                  </button>

                  {isImageBusy ? (
                    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-sky-brand/20 bg-sky-light/50 px-3 py-3 text-center">
                      <Loader2 className="h-5 w-5 animate-spin text-sky-brand" />
                      <p className="text-xs font-semibold text-slate-800">
                        משדרג תמונה…
                      </p>
                      <p className="text-[11px] text-slate-500">
                        כ־30–60 שניות
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
              <input
                ref={enhanceInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => void onEnhancePick(e.target.files?.[0])}
              />
              {atDualLimit ? (
                <p className="text-center text-[11px] text-amber-700">
                  מקסימום גרסאות
                </p>
              ) : null}
            </div>
          ) : studioMode === "card" ? (
            <div className="space-y-2.5">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">
                  שם העסק
                </span>
                <input
                  className="studio-input py-2"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="לדוגמה: סטודיו נועה עיצוב"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">
                  תיאור קצר / סלוגן
                </span>
                <input
                  className="studio-input py-2"
                  value={services}
                  onChange={(e) => setServices(e.target.value)}
                  placeholder="לדוגמה: עיצוב פנים שמחבר אנשים למקום"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">
                  מספר וואטסאפ
                </span>
                <input
                  className="studio-input py-2"
                  dir="ltr"
                  inputMode="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="050-1234567"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">
                  טלפון נוסף / ישיר
                </span>
                <input
                  className="studio-input py-2"
                  dir="ltr"
                  inputMode="tel"
                  value={cardDirectPhone}
                  onChange={(e) => setCardDirectPhone(e.target.value)}
                  placeholder="03-1234567"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">
                  אימייל
                </span>
                <input
                  className="studio-input py-2"
                  dir="ltr"
                  type="email"
                  inputMode="email"
                  value={cardEmail}
                  onChange={(e) => setCardEmail(e.target.value)}
                  placeholder="hello@studio.co.il"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">
                  כתובת / אזור פעילות
                </span>
                <input
                  className="studio-input py-2"
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                  placeholder="לדוגמה: תל אביב · גוש דן"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">
                  שעות פעילות
                </span>
                <input
                  className="studio-input py-2"
                  value={openingHours}
                  onChange={(e) => setOpeningHours(e.target.value)}
                  placeholder="א׳–ה׳ 09:00–18:00 · ו׳ לפי תיאום"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">
                  קישור לאתר או דף חברתי
                </span>
                <input
                  className="studio-input py-2"
                  dir="ltr"
                  type="url"
                  inputMode="url"
                  value={cardWebsite}
                  onChange={(e) => setCardWebsite(e.target.value)}
                  placeholder="https://instagram.com/studio"
                />
              </label>
              {whatsappBio ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2.5">
                  <p className="mb-1 text-[10px] font-semibold text-emerald-800">
                    ביו מוכן לשיתוף
                  </p>
                  <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-slate-800">
                    {whatsappBio}
                  </p>
                </div>
              ) : null}
              <button
                type="button"
                onClick={shareDigitalCard}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#1da851] transition hover:brightness-105 active:translate-y-[2px] active:shadow-[0_2px_0_0_#1da851]"
              >
                שתף בוואטסאפ בלחיצה אחת
              </button>
              <button
                type="button"
                disabled={busy === "bio"}
                onClick={() => void generateWhatsAppBioCard()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-brand/40 hover:text-sky-brand disabled:opacity-60"
              >
                {busy === "bio" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                צור ביו עם AI (אופציונלי)
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-700">
                  שם העסק
                </span>
                <input
                  className="studio-input py-2"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="לדוגמה: אקספרס מוטורס"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-700">
                  תחום
                </span>
                <input
                  className="studio-input py-2"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="לדוגמה: מוסך מורשה"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-700">
                  מטרת הפוסט
                </span>
                <textarea
                  className="studio-input max-h-24 min-h-[4rem] resize-none py-2 text-[13px]"
                  rows={3}
                  value={postGoal}
                  onChange={(e) => setPostGoal(e.target.value)}
                  placeholder="לדוגמה: בדיקת בלמים וחורף"
                />
              </label>
              {headline ? (
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-700">
                    כותרת
                  </span>
                  <input
                    className="studio-input py-2"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                  />
                </label>
              ) : null}
            </div>
          )}
        </div>

        {studioMode === "post" ? (
          <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-md sm:p-3.5">
            <div className="flex flex-col gap-2">
              <ActionBtn
                label="צור פוסט מלא"
                loading={busy === "both"}
                disabled={!!busy || !canGeneratePost}
                onClick={regenerateAll}
                primary
              />
              <ActionBtn
                label="צור תמונה"
                loading={busy === "image"}
                disabled={!!busy || !canGeneratePost}
                onClick={regenerateImage}
              />
              <ActionBtn
                label="נסח טקסט"
                loading={busy === "text"}
                disabled={!!busy || !canGeneratePost}
                onClick={regenerateText}
              />
            </div>

            {showPostValidationHint ? (
              <p className="mt-2.5 text-center text-[11px] text-slate-500">
                נא למלא שם עסק ומטרת פוסט
              </p>
            ) : null}

            {error ? (
              <p className="mt-3 text-xs text-red-600" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}

        {error && studioMode !== "post" ? (
          <p className="shrink-0 text-xs text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function EnhanceStyleCard({
  title,
  points,
  selected,
  onSelect,
}: {
  title: string;
  points: string[];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={[
        "rounded-2xl px-3 py-2.5 text-right transition-all",
        selected
          ? "border-2 border-sky-400 bg-sky-950/40 shadow-[0_0_20px_rgba(56,189,248,0.25)]"
          : "cursor-pointer border border-slate-700/80 bg-slate-900/70 hover:border-slate-500",
      ].join(" ")}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p
          className={[
            "text-base font-bold",
            selected ? "text-sky-300" : "text-slate-200 font-medium",
          ].join(" ")}
        >
          {title}
        </p>
        {selected ? (
          <span className="shrink-0 rounded-full bg-sky-500/25 px-2 py-0.5 text-[10px] font-bold text-sky-300 ring-1 ring-sky-400/50">
            ✓ נבחר
          </span>
        ) : null}
      </div>
      <ul className="space-y-1">
        {points.map((p) => (
          <li
            key={p}
            className={[
              "flex gap-1.5 text-xs leading-relaxed",
              selected ? "text-slate-100" : "text-slate-300",
            ].join(" ")}
          >
            <span className="mt-0.5 shrink-0 text-sky-400" aria-hidden>
              •
            </span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}

function EnhanceFlavorPicker({
  naturalUrl,
  studioUrl,
  activeFlavor,
  onPick,
}: {
  naturalUrl: string;
  studioUrl: string;
  activeFlavor: "natural" | "studio" | null;
  onPick: (flavor: "natural" | "studio") => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-center text-xs font-semibold text-slate-700">
        בחרו גרסה — כל כרטיס תמונה נפרדת
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        <FlavorCard
          title="אותנטי וטבעי"
          subtitle="ניקוי אור · שומר על הסביבה"
          imageUrl={naturalUrl}
          active={activeFlavor === "natural"}
          onClick={() => onPick("natural")}
        />
        <FlavorCard
          title="סטודיו מסחרי"
          subtitle="רקע · תאורה · לוגו"
          imageUrl={studioUrl}
          active={activeFlavor === "studio"}
          onClick={() => onPick("studio")}
        />
      </div>
    </div>
  );
}

function FlavorCard({
  title,
  subtitle,
  imageUrl,
  active,
  onClick,
}: {
  title: string;
  subtitle: string;
  imageUrl: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "group overflow-hidden rounded-2xl text-right shadow-sm transition",
        active
          ? "ring-2 ring-sky-500 border border-sky-400 bg-sky-500/10"
          : "border border-slate-200 bg-white hover:border-sky-brand/50 hover:shadow-md",
      ].join(" ")}
    >
      <div className="relative aspect-square bg-slate-100">
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover transition group-hover:scale-[1.02]"
          sizes="160px"
          unoptimized
        />
      </div>
      <div className="space-y-0.5 px-2.5 py-2">
        <p className="text-[12px] font-bold text-slate-900">{title}</p>
        <p className="text-[10px] text-slate-500">{subtitle}</p>
      </div>
    </button>
  );
}

function ActionBtn({
  label,
  onClick,
  loading,
  disabled,
  primary,
}: {
  label: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-[13px] font-bold no-underline transition disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
        primary
          ? "bg-gradient-to-b from-sky-brand to-sky-hover text-white shadow-[0_5px_0_0_#0369a1] hover:brightness-105 enabled:active:translate-y-[3px] enabled:active:shadow-[0_2px_0_0_#0369a1]"
          : "border border-slate-200 bg-slate-100 text-slate-800 shadow-[0_3px_0_0_#cbd5e1] hover:border-sky-brand/50 hover:bg-sky-light hover:text-sky-brand enabled:active:translate-y-[2px] enabled:active:shadow-[0_1px_0_0_#cbd5e1]",
      ].join(" ")}
    >
      {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : null}
      <span className="text-center leading-snug">{label}</span>
    </button>
  );
}
