"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAmbiguousTranscript } from "@/lib/voice/ambiguity";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string; confidence?: number };
  }>;
};

function getSpeechRecognitionCtor():
  | (new () => SpeechRecognitionLike)
  | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export type VoiceDictationResult = {
  text: string;
  ambiguous: boolean;
  source: "webspeech" | "whisper";
};

export function useVoiceDictation(opts?: {
  /** Current field value — used as the seed when listening starts. */
  getText?: () => string;
  /** Live updates (final + interim) while speaking. */
  setText?: (text: string) => void;
  /** Fired when the user stops (final committed transcript only). */
  onResult?: (result: VoiceDictationResult) => void;
  lang?: string;
}) {
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  /** Reliable flag inside recognition callbacks (avoids stale closures). */
  const isListeningRef = useRef(false);
  /** Full field text committed so far (seed + finals). */
  const finalTranscriptRef = useRef("");
  /** Only speech finals from this session (for ambiguity check). */
  const sessionSpeechRef = useRef("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const getTextRef = useRef(opts?.getText);
  const setTextRef = useRef(opts?.setText);
  const onResultRef = useRef(opts?.onResult);
  getTextRef.current = opts?.getText;
  setTextRef.current = opts?.setText;
  onResultRef.current = opts?.onResult;
  const lang = opts?.lang ?? "he-IL";

  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      recognitionRef.current?.abort();
      if (mediaRef.current?.state === "recording") {
        mediaRef.current.stop();
      }
    };
  }, []);

  const emitFinal = useCallback((text: string, source: "webspeech" | "whisper") => {
    const trimmed = text.trim();
    onResultRef.current?.({
      text: trimmed,
      ambiguous: isAmbiguousTranscript(trimmed),
      source,
    });
  }, []);

  const transcribeWithWhisper = useCallback(async (blob: Blob) => {
    const form = new FormData();
    form.append("audio", blob, "dictation.webm");
    form.append("filename", "dictation.webm");
    const res = await fetch("/api/voice/transcribe", {
      method: "POST",
      body: form,
    });
    const json = (await res.json()) as {
      text?: string;
      ambiguous?: boolean;
      error?: string;
    };
    if (!res.ok) {
      throw new Error(json.error ?? "תמלול נכשל");
    }
    return (json.text ?? "").trim();
  }, []);

  const startMediaFallback = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    mediaRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      void (async () => {
        setBusy(true);
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const text = await transcribeWithWhisper(blob);
          const base = (getTextRef.current?.() ?? "").trim();
          const merged = base ? `${base} ${text}`.trim() : text;
          setTextRef.current?.(merged);
          emitFinal(text, "whisper");
        } catch (err) {
          setError(err instanceof Error ? err.message : "תמלול נכשל");
          emitFinal("", "whisper");
        } finally {
          setBusy(false);
          setListening(false);
          isListeningRef.current = false;
        }
      })();
    };

    recorder.start();
    isListeningRef.current = true;
    setListening(true);
    setError(null);
  }, [emitFinal, transcribeWithWhisper]);

  const start = useCallback(async () => {
    if (isListeningRef.current || busy) return;
    setError(null);

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      try {
        await startMediaFallback();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "הדפדפן אינו תומך בזיהוי קולי",
        );
      }
      return;
    }

    try {
      const recognition = new Ctor();
      recognition.lang = lang;
      recognition.continuous = true; // don't stop on breath pauses
      recognition.interimResults = true; // live partial text
      recognitionRef.current = recognition;

      // Seed from current field — append speech after existing text
      const seed = (getTextRef.current?.() ?? "").trim();
      finalTranscriptRef.current = seed ? `${seed} ` : "";
      sessionSpeechRef.current = "";

      recognition.onresult = (event) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const row = event.results[i];
          if (!row) continue;
          const transcript = row[0]?.transcript ?? "";
          if (row.isFinal) {
            finalTranscriptRef.current +=
              (finalTranscriptRef.current &&
              !finalTranscriptRef.current.endsWith(" ")
                ? " "
                : "") + transcript;
            sessionSpeechRef.current +=
              (sessionSpeechRef.current ? " " : "") + transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        const live =
          finalTranscriptRef.current +
          (interimTranscript
            ? (finalTranscriptRef.current &&
              !finalTranscriptRef.current.endsWith(" ")
                ? " "
                : "") + interimTranscript
            : "");
        setTextRef.current?.(live);
      };

      recognition.onerror = (event) => {
        const code = event.error ?? "";
        // Expected during stop() / Chrome session recycle — never console.error
        // (Next.js overlays console.error as a runtime issue).
        if (
          code === "aborted" ||
          code === "no-speech" ||
          code === "audio-capture"
        ) {
          return;
        }
        if (code === "not-allowed" || code === "service-not-allowed") {
          setError("אין הרשאת מיקרופון");
          isListeningRef.current = false;
          setListening(false);
          return;
        }
        console.warn("[voice] recognition error:", code);
      };

      // Chrome often ends sessions abruptly — restart if user didn't stop
      recognition.onend = () => {
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch (e) {
            console.warn("הפעלה מחדש נכשלה:", e);
            isListeningRef.current = false;
            setListening(false);
          }
        } else {
          setListening(false);
        }
      };

      isListeningRef.current = true;
      setListening(true);
      recognition.start();
    } catch {
      await startMediaFallback().catch((err) => {
        setError(err instanceof Error ? err.message : "הקלטה נכשלה");
        setListening(false);
        isListeningRef.current = false;
      });
    }
  }, [busy, lang, startMediaFallback]);

  const stop = useCallback(() => {
    isListeningRef.current = false;
    setListening(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* already stopped */
      }
      const committed = finalTranscriptRef.current.trim();
      if (committed) setTextRef.current?.(committed);
      emitFinal(sessionSpeechRef.current.trim(), "webspeech");
      recognitionRef.current = null;
    }

    if (mediaRef.current?.state === "recording") {
      mediaRef.current.stop();
    }
  }, [emitFinal]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else void start();
  }, [listening, start, stop]);

  return { listening, busy, error, start, stop, toggle };
}
