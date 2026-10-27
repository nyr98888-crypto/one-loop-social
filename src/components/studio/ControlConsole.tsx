"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ArrowLeft, Loader2, Sparkles, Wand2 } from "lucide-react";
import { usePostStore } from "@/store/usePostStore";
import type { GeneratedPostContent } from "@/lib/ai/types";

export default function ControlConsole() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const businessName = usePostStore((s) => s.businessName);
  const industry = usePostStore((s) => s.industry);
  const postGoal = usePostStore((s) => s.postGoal);
  const isGenerating = usePostStore((s) => s.isGenerating);
  const isGenerated = usePostStore((s) => s.isGenerated);
  const setBusinessName = usePostStore((s) => s.setBusinessName);
  const setIndustry = usePostStore((s) => s.setIndustry);
  const setPostGoal = usePostStore((s) => s.setPostGoal);
  const setIsGenerating = usePostStore((s) => s.setIsGenerating);
  const applyGenerated = usePostStore((s) => s.applyGenerated);

  async function handleGenerate() {
    if (isGenerating) return;
    setError(null);
    setIsGenerating(true);

    try {
      const postRes = await fetch("/api/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, industry, postGoal }),
      });

      const postJson = (await postRes.json()) as {
        ok?: boolean;
        post?: GeneratedPostContent;
        error?: string;
      };

      if (!postRes.ok || !postJson.post) {
        throw new Error(postJson.error ?? "יצירת הטקסט נכשלה");
      }

      const { post } = postJson;

      const imageRes = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: post.imagePrompt,
          model: "schnell",
          imageSize: "square_hd",
        }),
      });

      const imageJson = (await imageRes.json()) as {
        ok?: boolean;
        imageUrl?: string;
        error?: string;
      };

      if (!imageRes.ok || !imageJson.imageUrl) {
        throw new Error(imageJson.error ?? "יצירת התמונה נכשלה");
      }

      applyGenerated({
        headline: post.headline,
        instagramCaption: post.instagramCaption,
        facebookCaption: post.facebookCaption,
        imagePrompt: post.imagePrompt,
        generatedImage: imageJson.imageUrl,
      });
    } catch (err) {
      setIsGenerating(false);
      setError(err instanceof Error ? err.message : "משהו השתבש. נסו שוב.");
    }
  }

  return (
    <section
      className="relative rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8"
      aria-label="קונסולת שליטה"
    >
      <div className="mb-6 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-light text-sky-brand">
          <Wand2 className="h-[18px] w-[18px]" />
        </span>
        <div>
          <h2 className="text-base font-bold text-slate-900">קונסולת יצירה</h2>
          <p className="text-xs text-slate-500">השינויים מתעדכנים בלייב במוקאפים</p>
        </div>
      </div>

      <div className="space-y-5">
        <Field label="שם העסק" htmlFor="businessName">
          <input
            id="businessName"
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            disabled={isGenerating}
            className="studio-input"
            placeholder="לדוגמה: אקספרס מוטורס"
          />
        </Field>

        <Field label="תחום העסק" htmlFor="industry">
          <input
            id="industry"
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            disabled={isGenerating}
            className="studio-input"
            placeholder="לדוגמה: מוסך מורשה וטיפולי רכב"
          />
        </Field>

        <Field label="מה המטרה או המבצע של הפוסט?" htmlFor="postGoal">
          <textarea
            id="postGoal"
            value={postGoal}
            onChange={(e) => setPostGoal(e.target.value)}
            disabled={isGenerating}
            rows={4}
            className="studio-input min-h-[7.5rem] resize-y"
            placeholder="תארו את המבצע, ההטבה או המסר העיקרי..."
          />
        </Field>
      </div>

      {error ? (
        <p
          className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-7">
        {!isGenerated ? (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !businessName.trim() || !postGoal.trim()}
            className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-b from-sky-brand to-sky-hover px-5 py-4 text-base font-bold text-white shadow-[0_8px_0_0_#0369a1] transition-all duration-150 enabled:hover:translate-y-[2px] enabled:hover:shadow-[0_6px_0_0_#0369a1] enabled:active:translate-y-[6px] enabled:active:shadow-[0_2px_0_0_#0369a1] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  עוזר הסטודיו מכין את הפוסט שלך...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 transition group-hover:rotate-12" />
                  צור את הפוסט שלי
                </>
              )}
            </span>
            {isGenerating ? (
              <span className="absolute inset-0 animate-pulse bg-white/10" />
            ) : null}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/studio")}
            className="studio-cta-glow group w-full rounded-2xl bg-gradient-to-b from-sky-brand to-sky-hover px-5 py-4 text-base font-bold text-white shadow-sky-glow transition hover:-translate-y-0.5 hover:shadow-[0_0_28px_rgba(14,165,233,0.45)] active:translate-y-0"
          >
            <span className="inline-flex items-center justify-center gap-2 transition group-hover:gap-3">
              פתח בסטודיו לעריכה ופרסום
              <ArrowLeft className="h-5 w-5 transition group-hover:-translate-x-1" />
            </span>
          </button>
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block space-y-2">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      {children}
    </label>
  );
}
