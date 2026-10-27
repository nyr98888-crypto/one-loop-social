"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import {
  Check,
  Copy,
  ImagePlus,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react";
import {
  selectActiveCaption,
  usePostStore,
} from "@/store/usePostStore";
import PlatformSwitcher from "./PlatformSwitcher";

export default function StudioPreviewCard() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const businessName = usePostStore((s) => s.businessName);
  const headline = usePostStore((s) => s.headline);
  const generatedImage = usePostStore((s) => s.generatedImage);
  const imagePrompt = usePostStore((s) => s.imagePrompt);
  const postGoal = usePostStore((s) => s.postGoal);
  const activePlatform = usePostStore((s) => s.activePlatform);
  const isImageBusy = usePostStore((s) => s.isImageBusy);
  const caption = usePostStore(selectActiveCaption);
  const setGeneratedImage = usePostStore((s) => s.setGeneratedImage);
  const setIsImageBusy = usePostStore((s) => s.setIsImageBusy);
  const setCaption = usePostStore((s) => s.setCaption);
  const setInstagramCaption = usePostStore((s) => s.setInstagramCaption);
  const setFacebookCaption = usePostStore((s) => s.setFacebookCaption);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function handleRegenerateImage() {
    if (isImageBusy) return;
    setImageError(null);
    setIsImageBusy(true);

    try {
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
        }),
      });

      const json = (await res.json()) as {
        ok?: boolean;
        imageUrl?: string;
        error?: string;
      };

      if (!res.ok || !json.imageUrl) {
        throw new Error(json.error ?? "יצירת תמונה נכשלה");
      }

      setGeneratedImage(json.imageUrl);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "שגיאה בהחלפת תמונה");
    } finally {
      setIsImageBusy(false);
    }
  }

  async function handleUpload(file: File) {
    if (isImageBusy) return;
    setImageError(null);
    setIsImageBusy(true);

    try {
      const dataUrl = await readFileAsDataUrl(file);

      const res = await fetch("/api/enhance-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: dataUrl,
          lightingStyle: "studio",
          upscaleFactor: 2,
        }),
      });

      const json = (await res.json()) as {
        ok?: boolean;
        imageUrl?: string;
        error?: string;
      };

      if (!res.ok || !json.imageUrl) {
        // Fall back to local preview if enhance fails (e.g. missing key)
        if (res.status === 500 || res.status >= 400) {
          setGeneratedImage(dataUrl);
          if (json.error) {
            setImageError("הועלה ללא שיפור AI — בדקו את מפתח FAL");
          }
          return;
        }
        throw new Error(json.error ?? "העלאה נכשלה");
      }

      setGeneratedImage(json.imageUrl);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "שגיאה בהעלאה");
    } finally {
      setIsImageBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handlePublish() {
    const text = [headline, caption].filter(Boolean).join("\n\n");
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function onCaptionChange(value: string) {
    setCaption(value);
    if (activePlatform === "facebook" || activePlatform === "google") {
      setFacebookCaption(value);
    } else if (activePlatform === "instagram") {
      setInstagramCaption(value);
    } else {
      setInstagramCaption(value);
      setFacebookCaption(value);
    }
  }

  const ctaLabel =
    activePlatform === "whatsapp"
      ? "שלח לוואטסאפ"
      : activePlatform === "google"
        ? "פרסם ב-Google"
        : "שלח לוואטסאפ / פרסם";

  return (
    <section className="flex h-full min-h-0 flex-col gap-3">
      <PlatformSwitcher />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-md">
        {/* Image canvas */}
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-slate-100">
          <Image
            src={generatedImage}
            alt={headline || businessName}
            fill
            className="object-contain"
            sizes="(max-width: 1024px) 100vw, 50vw"
            unoptimized
            priority
          />

          {isImageBusy ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
              <Loader2 className="h-8 w-8 animate-spin text-sky-brand" />
            </div>
          ) : null}

          {/* Ghost image actions */}
          <div className="absolute bottom-3 left-3 z-20 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRegenerateImage}
              disabled={isImageBusy}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-black/45 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md transition hover:bg-black/60 disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              שנה תמונה
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={isImageBusy}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-black/45 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md transition hover:bg-black/60 disabled:opacity-50"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              העלה תמונה שלי
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />
          </div>
        </div>

        {imageError ? (
          <p className="mt-2 text-xs text-amber-700" role="status">
            {imageError}
          </p>
        ) : null}

        {/* Caption + copy */}
        <div className="mt-3 shrink-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-500">טקסט הפוסט</p>
            <button
              type="button"
              onClick={handleCopy}
              className={[
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
                copied
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-slate-100 text-slate-600 hover:bg-sky-light hover:text-sky-brand",
              ].join(" ")}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  הועתק
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  העתק טקסט
                </>
              )}
            </button>
          </div>
          <textarea
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            rows={3}
            className="studio-input max-h-28 min-h-[4.5rem] resize-none text-[13px] leading-relaxed"
            placeholder="טקסט הפוסט יופיע כאן..."
          />
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          onClick={handlePublish}
          className="mt-3 flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-sky-brand to-sky-hover px-4 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#0369a1] transition hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#0369a1] active:translate-y-[3px] active:shadow-[0_1px_0_0_#0369a1]"
        >
          <Send className="h-4 w-4" />
          {ctaLabel}
        </button>
      </div>
    </section>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("קריאת הקובץ נכשלה"));
    reader.readAsDataURL(file);
  });
}
