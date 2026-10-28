"use client";

import Image from "next/image";
import { useMemo, useState, type ReactNode } from "react";
import { Check, Copy, Loader2, Star } from "lucide-react";
import { SEED_REVIEWS, type ReviewItem } from "@/lib/reviews/seed";
import { useToastStore } from "@/store/useToastStore";

type ReplyState = {
  text: string;
  loading: boolean;
  copied: boolean;
};

export default function ReviewsPage() {
  const showToast = useToastStore((s) => s.showToast);
  const [replies, setReplies] = useState<Record<string, ReplyState>>({});

  const googleReviews = useMemo(
    () => SEED_REVIEWS.filter((r) => r.platform === "google"),
    [],
  );
  const easyReviews = useMemo(
    () => SEED_REVIEWS.filter((r) => r.platform === "easy"),
    [],
  );

  function setReply(id: string, patch: Partial<ReplyState>) {
    setReplies((prev) => ({
      ...prev,
      [id]: {
        text: prev[id]?.text ?? "",
        loading: prev[id]?.loading ?? false,
        copied: prev[id]?.copied ?? false,
        ...patch,
      },
    }));
  }

  async function generateReply(review: ReviewItem) {
    setReply(review.id, { loading: true, copied: false });
    try {
      const res = await fetch("/api/generate-review-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: review.customerName,
          rating: review.rating,
          reviewText: review.text,
          platform: review.platform,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        reply?: string;
        error?: string;
      } | null;

      if (!res.ok || !data?.reply) {
        throw new Error(data?.error || "יצירת התגובה נכשלה");
      }

      setReply(review.id, { text: data.reply, loading: false });
      showToast("נוסחה תגובה מנצחת ✨");
    } catch (err) {
      setReply(review.id, { loading: false });
      showToast(
        err instanceof Error ? err.message : "שגיאה ביצירת תגובה",
      );
    }
  }

  async function copyReply(id: string) {
    const text = replies[id]?.text;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setReply(id, { copied: true });
      showToast("התגובה הועתקה");
      window.setTimeout(() => setReply(id, { copied: false }), 2000);
    } catch {
      showToast("ההעתקה נכשלה");
    }
  }

  return (
    <div className="no-scrollbar h-[calc(100vh-54px)] overflow-hidden bg-gradient-to-b from-sky-light/40 via-studio-bg to-slate-100/80">
      <div className="mx-auto flex h-full max-w-[1550px] flex-col px-3 py-2 sm:px-5 sm:py-3">
        <header className="mb-2 shrink-0">
          <h1 className="text-balance text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
            מרכז ביקורות ותגובות
          </h1>
        </header>

        <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-2 lg:gap-4">
          <ReviewColumn
            title="ביקורות Google Business"
            badge={<GoogleBadge />}
            reviews={googleReviews}
            replies={replies}
            onGenerate={generateReply}
            onCopy={copyReply}
          />
          <ReviewColumn
            title="ביקורות איזי"
            badge={<EasyBadge />}
            reviews={easyReviews}
            replies={replies}
            onGenerate={generateReply}
            onCopy={copyReply}
          />
        </div>
      </div>
    </div>
  );
}

function ReviewColumn({
  title,
  badge,
  reviews,
  replies,
  onGenerate,
  onCopy,
}: {
  title: string;
  badge: ReactNode;
  reviews: ReviewItem[];
  replies: Record<string, ReplyState>;
  onGenerate: (review: ReviewItem) => void | Promise<void>;
  onCopy: (id: string) => void | Promise<void>;
}) {
  return (
    <section className="no-scrollbar flex min-h-0 flex-col overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
          {badge}
        </span>
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
      </div>

      {reviews.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-slate-500">
          אין ביקורות להצגה.
        </p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => {
            const state = replies[review.id];
            return (
              <li
                key={review.id}
                className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 shadow-sm shadow-sky-brand/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900">
                      {review.customerName}
                    </h3>
                    <div
                      className="mt-1.5 flex items-center gap-0.5"
                      aria-label={`${review.rating} מתוך 5 כוכבים`}
                    >
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-200"
                          }`}
                          aria-hidden
                        />
                      ))}
                    </div>
                  </div>
                  <time className="shrink-0 text-xs text-slate-400">
                    {formatHebrewDate(review.createdAt)}
                  </time>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-slate-700">
                  {review.text}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void onGenerate(review)}
                    disabled={state?.loading}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-sky-brand px-3.5 py-2 text-sm font-semibold text-white shadow-sky-glow transition hover:bg-sky-hover disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {state?.loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <span aria-hidden>⚡</span>
                    )}
                    נסח תגובה מהירה עם AI
                  </button>

                  {state?.text ? (
                    <button
                      type="button"
                      onClick={() => void onCopy(review.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-brand/40 hover:bg-sky-light/50 hover:text-sky-hover"
                    >
                      {state.copied ? (
                        <Check
                          className="h-4 w-4 text-emerald-600"
                          aria-hidden
                        />
                      ) : (
                        <Copy className="h-4 w-4" aria-hidden />
                      )}
                      העתק תגובה
                    </button>
                  ) : null}
                </div>

                {state?.text ? (
                  <div className="mt-3 rounded-xl border border-sky-brand/20 bg-sky-light/40 px-4 py-3">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-sky-hover">
                      טיוטת תגובה
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                      {state.text}
                    </p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function GoogleBadge() {
  return (
    <span
      className="text-lg font-black text-[#4285F4]"
      aria-hidden
    >
      G
    </span>
  );
}

function EasyBadge() {
  return (
    <Image
      src="/platforms/easy.png"
      alt="איזי"
      width={28}
      height={28}
      className="h-7 w-7 rounded-md object-cover shadow-sm"
      unoptimized
    />
  );
}

function formatHebrewDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
