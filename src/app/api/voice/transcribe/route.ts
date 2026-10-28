import { NextResponse } from "next/server";
import OpenAI from "openai";
import { isAmbiguousTranscript } from "@/lib/voice/ambiguity";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Whisper STT fallback when Web Speech API is unavailable.
 * Accepts multipart form-data with `audio` file (webm/wav/mp3/ogg/m4a).
 */
export async function POST(request: Request) {
  try {
    const key =
      process.env.OPENAI_API_KEY?.trim() ||
      process.env.TOGETHER_API_KEY?.trim();
    if (!key) {
      return NextResponse.json(
        {
          error:
            "Missing OPENAI_API_KEY (or TOGETHER_API_KEY) for Whisper transcription",
        },
        { status: 500 },
      );
    }

    const form = await request.formData();
    const audio = form.get("audio");
    if (!(audio instanceof Blob) || audio.size < 64) {
      return NextResponse.json(
        { error: "Expected multipart field `audio`" },
        { status: 400 },
      );
    }

    const filename =
      (typeof form.get("filename") === "string" &&
        (form.get("filename") as string)) ||
      "dictation.webm";

    const file = new File([audio], filename, {
      type: audio.type || "audio/webm",
    });

    // Prefer OpenAI Whisper; Together OpenAI-compatible may also accept audio
    const useTogether = !process.env.OPENAI_API_KEY?.trim();
    const client = new OpenAI({
      apiKey: key,
      ...(useTogether
        ? { baseURL: "https://api.together.xyz/v1" }
        : {}),
    });

    const result = await client.audio.transcriptions.create({
      file,
      model: useTogether ? "openai/whisper-large-v3" : "whisper-1",
      language: "he",
      response_format: "json",
    });

    const text = (result.text ?? "").trim();
    const ambiguous = isAmbiguousTranscript(text);

    return NextResponse.json({
      ok: true,
      text,
      ambiguous,
      source: useTogether ? "together-whisper" : "openai-whisper",
    });
  } catch (err) {
    console.error("[voice/transcribe]", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Transcription failed",
        ambiguous: true,
      },
      { status: 502 },
    );
  }
}
