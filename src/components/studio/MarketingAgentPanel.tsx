"use client";

import { useEffect, useRef } from "react";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import {
  AGENT_AMBIGUITY_MESSAGE,
  useAgentStore,
} from "@/store/useAgentStore";
import { usePostStore } from "@/store/usePostStore";
import { useToastStore } from "@/store/useToastStore";
import VoiceMicButton from "./VoiceMicButton";
import type { VoiceDictationResult } from "@/hooks/useVoiceDictation";

type MarketingAgentPanelProps = {
  className?: string;
  compact?: boolean;
};

export default function MarketingAgentPanel({
  className,
  compact,
}: MarketingAgentPanelProps) {
  const open = useAgentStore((s) => s.open);
  const refining = useAgentStore((s) => s.refining);
  const messages = useAgentStore((s) => s.messages);
  const draft = useAgentStore((s) => s.draft);
  const setDraft = useAgentStore((s) => s.setDraft);
  const pushMessage = useAgentStore((s) => s.pushMessage);
  const setRefining = useAgentStore((s) => s.setRefining);
  const close = useAgentStore((s) => s.close);

  const businessName = usePostStore((s) => s.businessName);
  const industry = usePostStore((s) => s.industry);
  const headline = usePostStore((s) => s.headline);
  const instagramCaption = usePostStore((s) => s.instagramCaption);
  const facebookCaption = usePostStore((s) => s.facebookCaption);
  const waBroadcastMessage = usePostStore((s) => s.waBroadcastMessage);
  const igCtaText = usePostStore((s) => s.igCtaText);
  const waActionButton = usePostStore((s) => s.waActionButton);
  const waLeadIncomingMessage = usePostStore((s) => s.waLeadIncomingMessage);
  const waBusinessAutoReply = usePostStore((s) => s.waBusinessAutoReply);
  const imagePrompt = usePostStore((s) => s.imagePrompt);
  const generatedImage = usePostStore((s) => s.generatedImage);
  const applyGenerated = usePostStore((s) => s.applyGenerated);
  const setIsImageBusy = usePostStore((s) => s.setIsImageBusy);
  const showToast = useToastStore((s) => s.showToast);

  const snapshot = {
    businessName,
    industry,
    headline,
    instagramCaption,
    facebookCaption,
    waBroadcastMessage,
    igCtaText,
    waActionButton,
    imagePrompt,
    generatedImage,
  };

  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, refining]);

  if (!open) return null;

  async function submitInstruction(raw: string) {
    const instruction = raw.trim();
    if (!instruction || refining) return;

    pushMessage("user", instruction);
    setDraft("");
    setRefining(true);
    setIsImageBusy(true);

    try {
      const res = await fetch("/api/agent/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, snapshot }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        reply?: string;
        updated?: Partial<typeof snapshot>;
        regeneratedImage?: boolean;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(json.error ?? "העדכון נכשל");
      }

      const u = json.updated ?? {};
      applyGenerated({
        headline: u.headline ?? headline,
        instagramCaption: u.instagramCaption ?? instagramCaption,
        facebookCaption: u.facebookCaption ?? facebookCaption,
        imagePrompt: u.imagePrompt ?? imagePrompt,
        generatedImage: u.generatedImage ?? generatedImage,
        igCtaText,
        waActionButton,
        waLeadIncomingMessage,
        waBusinessAutoReply,
        waBroadcastMessage: u.waBroadcastMessage ?? waBroadcastMessage,
      });

      pushMessage(
        "agent",
        json.reply?.trim() ||
          (json.regeneratedImage
            ? "עדכנתי את הטקסט ואת התמונה לפי הבקשה שלך ✨"
            : "עדכנתי את הפוסט לפי הבקשה שלך ✨"),
      );
      showToast("הסוכן עדכן את הפוסט");
    } catch (err) {
      pushMessage(
        "agent",
        err instanceof Error
          ? `לא הצלחתי לעדכן: ${err.message}`
          : "משהו השתבש בעדכון. נסו שוב.",
      );
    } finally {
      setRefining(false);
      setIsImageBusy(false);
    }
  }

  function onVoice(result: VoiceDictationResult) {
    // Live draft already updated via setText; on stop — submit if clear
    if (result.ambiguous || !result.text.trim()) {
      pushMessage("agent", AGENT_AMBIGUITY_MESSAGE);
      return;
    }
    void submitInstruction(result.text);
  }

  return (
    <section
      dir="rtl"
      className={[
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-sky-200/80 bg-gradient-to-b from-sky-50/90 to-white shadow-sm",
        compact ? "max-h-[14rem]" : "max-h-[18rem]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="סוכן שיווק פרואקטיבי"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-sky-100 px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-sky-600" />
          <p className="truncate text-[12px] font-bold text-sky-800">
            סוכן שיווק · שיפור בזמן אמת
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="סגור צ׳אט סוכן"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2 no-scrollbar"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={[
              "max-w-[92%] rounded-2xl px-3 py-2 text-[12px] leading-relaxed",
              m.role === "user"
                ? "mr-auto bg-sky-600 text-white"
                : "ml-auto border border-slate-100 bg-white text-slate-800 shadow-sm",
            ].join(" ")}
          >
            {m.text}
          </div>
        ))}
        {refining ? (
          <div className="ml-auto inline-flex items-center gap-1.5 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-[11px] text-slate-500 shadow-sm">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600" />
            מעדכן פוסטים ותמונה…
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-sky-100 bg-white/90 p-2">
        <div className="flex items-end gap-1.5">
          <VoiceMicButton
            text={draft}
            setText={setDraft}
            disabled={refining}
            onResult={onVoice}
            title="הכתבה לסוכן"
          />
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submitInstruction(draft);
              }
            }}
            disabled={refining}
            rows={2}
            spellCheck={true}
            lang="he"
            autoCorrect="on"
            autoCapitalize="sentences"
            inputMode="text"
            placeholder='למשל: "תעשה את הטקסט יותר קליל" או "תמונה בלי אנשים ברקע"'
            className="landing-input spellcheck-he min-h-[2.75rem] flex-1 resize-none py-2 text-[12px]"
            aria-label="הודעה לסוכן השיווק"
            dir="rtl"
          />
          <button
            type="button"
            disabled={refining || !draft.trim()}
            onClick={() => void submitInstruction(draft)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-40"
            aria-label="שלח לסוכן"
          >
            {refining ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
