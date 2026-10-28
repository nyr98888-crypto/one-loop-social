import { NextResponse } from "next/server";
import { sanitizeUserPrompt } from "@/lib/ai/agent-refine";
import { TextEngineError } from "@/lib/ai/text-engine";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      text?: unknown;
    } | null;
    const text = typeof body?.text === "string" ? body.text : "";
    if (!text.trim()) {
      return NextResponse.json(
        { error: "Expected JSON body with text string" },
        { status: 400 },
      );
    }

    const result = await sanitizeUserPrompt(text);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof TextEngineError) {
      return NextResponse.json(
        { error: err.message, details: err.details },
        { status: err.status },
      );
    }
    console.error("[sanitize-prompt]", err);
    return NextResponse.json({ error: "Sanitize failed" }, { status: 500 });
  }
}
