"use client";

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";
import {
  PLACEHOLDER_IMAGE,
  usePostStore,
} from "@/store/usePostStore";
import {
  AGENT_AMBIGUITY_MESSAGE,
  useAgentStore,
} from "@/store/useAgentStore";
import type {
  GeneratedPostContent,
  UnifiedGenerateContent,
} from "@/lib/ai/types";
import {
  fileToCompressedDataUrl,
  isAcceptedImageFile,
} from "@/lib/image/file-to-data-url";
import type { VoiceDictationResult } from "@/hooks/useVoiceDictation";
import { useToastStore } from "@/store/useToastStore";
import MarketingAgentPanel from "./MarketingAgentPanel";
import VoiceMicButton from "./VoiceMicButton";

type ImageSource = "ai" | "upload";

type CreationFormProps = {
  stickyCta?: boolean;
  smileOffset?: boolean;
  className?: string;
};

const SMART_PLACEHOLDER =
  "ספר בקצרה מה העסק ומה רוצים לפרסם היום...\nלדוגמה: ג'חנון הבוסתן, מארזים חמים לשבת שיצאו מהתנור עם רסק וביצה, נשארו 20 אחרונים לאיסוף או משלוח.";

export default function CreationForm({
  stickyCta = false,
  smileOffset = false,
  className,
}: CreationFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<ImageSource>("ai");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const postGoal = usePostStore((s) => s.postGoal);
  const marketContext = usePostStore((s) => s.marketContext);
  const isGenerating = usePostStore((s) => s.isGenerating);
  const isGenerated = usePostStore((s) => s.isGenerated);
  const setPostGoal = usePostStore((s) => s.setPostGoal);
  const setBusinessName = usePostStore((s) => s.setBusinessName);
  const setIndustry = usePostStore((s) => s.setIndustry);
  const setGeneratedImage = usePostStore((s) => s.setGeneratedImage);
  const setIsGenerating = usePostStore((s) => s.setIsGenerating);
  const setIsImageBusy = usePostStore((s) => s.setIsImageBusy);
  const setIsUserUpload = usePostStore((s) => s.setIsUserUpload);
  const setPreviewEnhanceOn = usePostStore((s) => s.setPreviewEnhanceOn);
  const applyGenerated = usePostStore((s) => s.applyGenerated);
  const openAfterGenerate = useAgentStore((s) => s.openAfterGenerate);
  const agentOpen = useAgentStore((s) => s.open);
  const pushAgentMessage = useAgentStore((s) => s.pushMessage);
  const showToast = useToastStore((s) => s.showToast);

  const clearUpload = useCallback(() => {
    setUploadedImage(null);
    setGeneratedImage(PLACEHOLDER_IMAGE);
    setIsUserUpload(false);
    setPreviewEnhanceOn(false);
    setIsImageBusy(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [
    setGeneratedImage,
    setIsUserUpload,
    setPreviewEnhanceOn,
    setIsImageBusy,
  ]);

  function selectImageSource(next: ImageSource) {
    if (next === imageSource) return;
    setError(null);
    setImageSource(next);
    if (next === "ai") {
      setIsUserUpload(false);
      setPreviewEnhanceOn(false);
      setIsImageBusy(false);
      if (uploadedImage) setGeneratedImage(PLACEHOLDER_IMAGE);
    } else if (uploadedImage) {
      setGeneratedImage(uploadedImage);
      setIsUserUpload(true);
    }
  }

  /**
   * Upload → 4-layer FAL enhance (persist:false) → bind CDN URL to preview.
   * Raw data-URL is never left as the Instagram media source.
   */
  async function ingestFile(file: File | null | undefined) {
    if (!file) return;
    setError(null);
    if (!isAcceptedImageFile(file)) {
      setError("נא להעלות JPG, PNG או WebP בלבד");
      return;
    }

    let dataUrl: string;
    try {
      dataUrl = await fileToCompressedDataUrl(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "העלאת התמונה נכשלה");
      return;
    }

    setImageSource("upload");
    setUploadedImage(dataUrl);
    setIsUserUpload(true);
    setPreviewEnhanceOn(false);
    setGeneratedImage(dataUrl);
    setIsImageBusy(true);

    try {
      const res = await fetch("/api/enhance-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: dataUrl,
          industry: "general",
          targetPlatform: "instagram",
          flavor: "studio",
          dual: false,
          persist: false,
          skipLogo: true,
          sessionId: crypto.randomUUID(),
        }),
      });

      const json = (await res.json()) as {
        ok?: boolean;
        imageUrl?: string;
        error?: string;
      };

      if (!res.ok || !json.imageUrl) {
        throw new Error(json.error ?? "שיפור התמונה נכשל");
      }

      setUploadedImage(json.imageUrl);
      setGeneratedImage(json.imageUrl);
      setIsUserUpload(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "שיפור התמונה נכשל — נסו תמונה אחרת",
      );
    } finally {
      setIsImageBusy(false);
    }
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    void ingestFile(e.target.files?.[0]);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    void ingestFile(e.dataTransfer.files?.[0]);
  }

  function onMainVoice(result: VoiceDictationResult) {
    // Live text already written via setText; only handle ambiguity on stop
    if (result.ambiguous || !result.text.trim()) {
      if (agentOpen) {
        pushAgentMessage("agent", AGENT_AMBIGUITY_MESSAGE);
      } else {
        showToast(AGENT_AMBIGUITY_MESSAGE);
      }
    }
  }

  async function handleGenerate() {
    if (isGenerating) return;

    const smartPrompt = postGoal.trim();

    if (!smartPrompt) {
      setError("נא לספר בקצרה מה העסק ומה רוצים לפרסם");
      return;
    }
    if (imageSource === "upload" && !uploadedImage) {
      setError("נא להעלות תמונה או לעבור ליצירה ב-AI");
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      // Silent typo sanitization via DeepSeek-V3 (preserves intent)
      let cleanedPrompt = smartPrompt;
      try {
        const sanitizeRes = await fetch("/api/sanitize-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: smartPrompt }),
        });
        const sanitizeJson = (await sanitizeRes.json()) as {
          corrected?: string;
          changed?: boolean;
        };
        if (
          sanitizeRes.ok &&
          typeof sanitizeJson.corrected === "string" &&
          sanitizeJson.corrected.trim()
        ) {
          cleanedPrompt = sanitizeJson.corrected.trim();
          if (sanitizeJson.changed && cleanedPrompt !== smartPrompt) {
            setPostGoal(cleanedPrompt);
          }
        }
      } catch {
        // non-blocking — continue with raw prompt
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smartPrompt: cleanedPrompt,
          postGoal: cleanedPrompt,
          marketContext,
          needFalImagePrompt: imageSource === "ai",
          ...(imageSource === "upload" && uploadedImage
            ? { referenceImage: uploadedImage }
            : {}),
        }),
      });

      const json = (await res.json()) as {
        ok?: boolean;
        data?: UnifiedGenerateContent;
        post?: GeneratedPostContent & {
          whatsappBroadcastMessage?: string;
        };
        imageUrl?: string | null;
        meta?: {
          dictionaryId?: string;
          businessName?: string;
          industry?: string;
        };
        error?: string | boolean;
        details?: string;
      };

      if (!res.ok || !json.data || !json.post) {
        const raw =
          (typeof json.details === "string" && json.details) ||
          (typeof json.error === "string" && json.error) ||
          "יצירת הפוסט נכשלה";
        throw new Error(
          /expected|smartPrompt|postGoal/i.test(raw)
            ? "נא לספר בקצרה מה העסק ומה רוצים לפרסם"
            : raw,
        );
      }

      const { data, post } = json;
      const tags = data.instagram.hashtags.join(" ");
      const igCaption = [data.instagram.caption, tags]
        .filter(Boolean)
        .join("\n\n");

      if (json.meta?.businessName) setBusinessName(json.meta.businessName);
      if (json.meta?.industry) setIndustry(json.meta.industry);

      const postId = `post_${Date.now().toString(36)}`;

      applyGenerated({
        headline: data.instagram.headline || post.headline,
        instagramCaption: igCaption || post.instagramCaption,
        facebookCaption:
          data.facebook?.caption?.trim() ||
          post.facebookCaption ||
          data.instagram.caption,
        imagePrompt: data.falImagePrompt || data.imagePrompt || post.imagePrompt,
        generatedImage:
          json.imageUrl ||
          uploadedImage ||
          PLACEHOLDER_IMAGE,
        igCtaText: data.instagram.ctaText,
        waLeadIncomingMessage: data.whatsapp.leadIncomingMessage,
        waBusinessAutoReply: data.whatsapp.businessAutoReply,
        waActionButton: data.whatsapp.actionButton,
        waBroadcastMessage:
          data.whatsapp.broadcastMessage ||
          post.whatsappBroadcastMessage ||
          data.whatsapp.businessAutoReply,
      });

      // Proactive Marketing Agent refinement loop
      openAfterGenerate(postId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו השתבש. נסו שוב.");
    } finally {
      setIsGenerating(false);
    }
  }

  const ctaLabel = isGenerated
    ? "✨ צור שוב פוסטים ותמונה"
    : "✨ צור פוסטים ותמונה";

  return (
    <section
      dir="rtl"
      className={[
        "flex min-h-0 w-full flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6",
        smileOffset ? "mt-6 lg:mt-8" : "",
        "h-full overflow-hidden",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="סטודיו יצירה"
    >
      <div
        className={[
          "flex min-h-0 flex-1 flex-col gap-4",
          // Desktop smile grid: lock inside viewport — no nested page scroll
          smileOffset ? "overflow-hidden" : "overflow-y-auto no-scrollbar",
        ].join(" ")}
      >
        {/* 1. Image source toggle — top of card */}
        <div
          role="group"
          aria-label="מצב תמונה"
          className="mx-auto flex w-full shrink-0 gap-1 rounded-full border border-slate-200 bg-slate-50 p-1"
        >
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => selectImageSource("ai")}
            className={[
              "flex-1 rounded-full px-3 py-2.5 text-center text-[12px] font-semibold transition-all sm:text-sm",
              imageSource === "ai"
                ? "bg-white text-sky-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            ].join(" ")}
          >
            ✨ יצירה ב-AI
          </button>
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => selectImageSource("upload")}
            className={[
              "flex-1 rounded-full px-3 py-2.5 text-center text-[12px] font-semibold transition-all sm:text-sm",
              imageSource === "upload"
                ? "bg-white text-sky-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            ].join(" ")}
          >
            📷 העלאת תמונה
          </button>
        </div>

        {/* 2. Drop-zone / thumbnail — only when upload selected */}
        {imageSource === "upload" ? (
          <div
            className={[
              "relative shrink-0 overflow-hidden rounded-2xl border transition",
              dragOver
                ? "border-sky-400 bg-sky-50/50"
                : "border-slate-200 bg-slate-50/60",
            ].join(" ")}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            {uploadedImage ? (
              <div className="relative aspect-[16/9] w-full sm:aspect-[2/1]">
                <Image
                  src={uploadedImage}
                  alt="תמונה שהועלתה"
                  fill
                  className="object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={clearUpload}
                  className="absolute left-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  aria-label="הסר תמונה"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 px-4 py-7 text-center transition hover:bg-white/70 disabled:opacity-50"
              >
                <Upload className="h-6 w-6 text-slate-400" aria-hidden />
                <span className="text-[12px] font-medium text-slate-500">
                  גרור תמונה לכאן או לחץ לבחירה
                </span>
                <span className="text-[10px] text-slate-400">
                  JPG, PNG או WebP
                </span>
              </button>
            )}
          </div>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={onFileChange}
          disabled={isGenerating}
        />

        {/* 3. Single generous smart textarea + voice mic */}
        <div
          className={[
            "flex min-h-0 flex-col",
            agentOpen ? "shrink-0" : "flex-1",
          ].join(" ")}
        >
          <label
            htmlFor="smartPrompt"
            className="mb-1.5 shrink-0 text-[12px] font-semibold text-slate-600"
          >
            ספרו בקצרה על העסק ומה מפרסמים היום
          </label>
          <div className="relative flex min-h-0 flex-1 flex-col">
            <textarea
              id="smartPrompt"
              value={postGoal}
              onChange={(e) => {
                setError(null);
                setPostGoal(e.target.value);
              }}
              disabled={isGenerating}
              rows={agentOpen ? 4 : 10}
              spellCheck={true}
              lang="he"
              autoCorrect="on"
              autoCapitalize="sentences"
              inputMode="text"
              className={[
                "landing-input spellcheck-he min-h-0 w-full resize-none py-3.5 pe-12 text-[15px] leading-relaxed",
                agentOpen ? "min-h-[5.5rem]" : "flex-1",
              ].join(" ")}
              placeholder={SMART_PLACEHOLDER}
              aria-label="ספר בקצרה מה העסק ומה רוצים לפרסם"
              dir="rtl"
            />
            <div className="absolute bottom-2 left-2 z-10">
              <VoiceMicButton
                text={postGoal}
                setText={(next) => {
                  setError(null);
                  setPostGoal(next);
                }}
                disabled={isGenerating}
                onResult={onMainVoice}
                title="הכתבה קולית לפרומפט"
              />
            </div>
          </div>
        </div>

        {error ? (
          <p
            className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {/* Proactive agent refinement loop (post-generation) */}
        {agentOpen ? (
          <MarketingAgentPanel compact className="min-h-0 flex-1" />
        ) : null}

        <div
          className={[
            "shrink-0",
            smileOffset ? "mt-1 pb-0 pt-2" : "mt-auto pt-1",
            stickyCta ? "sticky bottom-0 bg-white pt-2" : "",
          ].join(" ")}
        >
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isGenerating}
            aria-busy={isGenerating}
            className={[
              "studio-cta-glow group relative w-full overflow-hidden rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-sky-500/25 transition-all hover:from-sky-600 hover:to-blue-700",
              stickyCta ? "text-base" : "",
              isGenerating
                ? "cursor-wait opacity-90"
                : "hover:brightness-[1.03] active:scale-[0.99]",
            ].join(" ")}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  מכין פוסטים ותמונה...
                </>
              ) : (
                ctaLabel
              )}
            </span>
            {isGenerating ? (
              <span className="studio-shimmer absolute inset-0 opacity-60" />
            ) : null}
          </button>
        </div>
      </div>
    </section>
  );
}
