"use client";

import { useRef } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import {
  useVoiceDictation,
  type VoiceDictationResult,
} from "@/hooks/useVoiceDictation";

type VoiceMicButtonProps = {
  /** Current textarea value — speech appends live. */
  text?: string;
  /** Live + final text writer (preferred continuous mode). */
  setText?: (text: string) => void;
  /** Optional stop callback (ambiguity / agent hooks). */
  onResult?: (result: VoiceDictationResult) => void;
  disabled?: boolean;
  className?: string;
  title?: string;
};

export default function VoiceMicButton({
  text = "",
  setText,
  onResult,
  disabled,
  className,
  title = "הכתבה קולית",
}: VoiceMicButtonProps) {
  const textRef = useRef(text);
  textRef.current = text;

  const { listening, busy, error, toggle } = useVoiceDictation({
    getText: () => textRef.current,
    setText,
    onResult,
  });

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={toggle}
        title={listening ? "עצור הקלטה" : title}
        aria-label={listening ? "עצור הקלטה" : title}
        aria-pressed={listening}
        className={[
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition",
          listening
            ? "border-rose-400 bg-rose-500 text-white shadow-sm"
            : "border-slate-200 bg-slate-100 text-slate-800 hover:border-sky-300 hover:bg-white hover:text-sky-700",
          disabled || busy ? "cursor-not-allowed opacity-50" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : listening ? (
          <Square className="h-3 w-3 fill-current" />
        ) : (
          <span className="text-sm leading-none" aria-hidden>
            🎤
          </span>
        )}
        <Mic className="sr-only" />
      </button>
      {error ? (
        <span className="absolute -bottom-5 left-1/2 w-44 -translate-x-1/2 text-center text-[9px] text-rose-600">
          {error}
        </span>
      ) : null}
    </div>
  );
}
