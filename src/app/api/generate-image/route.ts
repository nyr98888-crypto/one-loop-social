import { NextResponse } from "next/server";
import {
  COMMERCIAL_NEGATIVE_PROMPT,
  buildCommercialPrompt,
} from "@/lib/ai/constants";
import { FalError, generateFluxImage } from "@/lib/ai/fal";
import type { GenerateImageRequest } from "@/lib/ai/types";
import {
  cleanExpiredDrafts,
  getVariantsBySession,
} from "@/lib/db/client";
import {
  DraftSessionLimitError,
  prepareDraftSession,
} from "@/lib/db/draft-session-guard";
import { insertDraftVariant } from "@/lib/db/drafts";

export const runtime = "nodejs";
export const maxDuration = 60;

const VALID_SIZES = new Set([
  "square_hd",
  "square",
  "portrait_4_3",
  "portrait_16_9",
  "landscape_4_3",
  "landscape_16_9",
]);

interface GenerateImageBody extends GenerateImageRequest {
  sessionId?: string;
  headline?: string;
  igCaption?: string;
  fbCaption?: string;
}

function parseBody(body: unknown): GenerateImageBody | null {
  if (!body || typeof body !== "object") return null;
  const {
    prompt,
    model,
    imageSize,
    sessionId,
    headline,
    igCaption,
    fbCaption,
  } = body as Record<string, unknown>;

  if (typeof prompt !== "string" || !prompt.trim()) return null;

  const parsed: GenerateImageBody = { prompt: prompt.trim() };

  if (model === "schnell" || model === "pro") {
    parsed.model = model;
  }

  if (typeof imageSize === "string" && VALID_SIZES.has(imageSize)) {
    parsed.imageSize = imageSize as GenerateImageRequest["imageSize"];
  }

  if (typeof sessionId === "string" && sessionId.trim()) {
    parsed.sessionId = sessionId.trim();
  }
  if (typeof headline === "string" && headline.trim()) {
    parsed.headline = headline.trim();
  }
  if (typeof igCaption === "string" && igCaption.trim()) {
    parsed.igCaption = igCaption.trim();
  }
  if (typeof fbCaption === "string" && fbCaption.trim()) {
    parsed.fbCaption = fbCaption.trim();
  }

  return parsed;
}

export async function POST(request: Request) {
  try {
    const body = parseBody(await request.json().catch(() => null));
    if (!body) {
      return NextResponse.json(
        { error: "Expected JSON body with a non-empty prompt string" },
        { status: 400 },
      );
    }

    // Always sweep abandoned drafts before generation work.
    await cleanExpiredDrafts();

    let nextIndex: number | null = null;
    if (body.sessionId) {
      try {
        const existing = await prepareDraftSession(body.sessionId);
        nextIndex = existing.length + 1;
      } catch (err) {
        if (err instanceof DraftSessionLimitError) {
          return NextResponse.json({ error: err.message }, { status: 400 });
        }
        throw err;
      }
    }

    const commercialPrompt = buildCommercialPrompt(body.prompt);

    const result = await generateFluxImage({
      prompt: commercialPrompt,
      model: body.model ?? "schnell",
      imageSize: body.imageSize ?? "square_hd",
    });

    let variants = null;
    let variantIndex: number | null = null;

    if (body.sessionId && nextIndex != null) {
      await insertDraftVariant({
        sessionId: body.sessionId,
        variantIndex: nextIndex,
        imageUrl: result.imageUrl,
        headline: body.headline,
        igCaption: body.igCaption,
        fbCaption: body.fbCaption,
      });
      variants = await getVariantsBySession(body.sessionId);
      variantIndex = nextIndex;
    }

    return NextResponse.json({
      ok: true,
      success: true,
      imageUrl: result.imageUrl,
      seed: result.seed,
      prompt: commercialPrompt,
      negativePrompt: COMMERCIAL_NEGATIVE_PROMPT,
      model: body.model ?? "schnell",
      ...(variantIndex != null ? { variantIndex, variants } : {}),
    });
  } catch (err) {
    if (err instanceof DraftSessionLimitError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof FalError) {
      return NextResponse.json(
        { error: err.message, details: err.details },
        { status: err.status },
      );
    }

    console.error("[generate-image]", err);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 },
    );
  }
}
