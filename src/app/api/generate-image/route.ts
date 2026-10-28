import { NextResponse } from "next/server";
import {
  COMMERCIAL_NEGATIVE_PROMPT,
  buildCommercialPrompt,
} from "@/lib/ai/constants";
import { FalError, generateFluxImage } from "@/lib/ai/fal";
import type { GenerateImageRequest, MarketContext } from "@/lib/ai/types";
import {
  parseMarketContext,
  resolveLockedPostImageSize,
  toFalImageSize,
} from "@/lib/ai/image-aspect";
import { expandVisualPrompt } from "@/lib/ai/visual-prompt-expander";
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
export const maxDuration = 90;

interface GenerateImageBody extends GenerateImageRequest {
  sessionId?: string;
  headline?: string;
  igCaption?: string;
  fbCaption?: string;
}

function asTrimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseBody(body: unknown): GenerateImageBody | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;

  const prompt = asTrimmed(o.prompt);
  if (!prompt) return null;

  const parsed: GenerateImageBody = { prompt };

  if (o.model === "schnell" || o.model === "pro" || o.model === "recraft") {
    parsed.model = o.model;
  }

  const imageSize = asTrimmed(o.imageSize);
  if (
    imageSize === "square_hd" ||
    imageSize === "square" ||
    imageSize === "portrait_4_5"
  ) {
    parsed.imageSize =
      imageSize === "square" ? "square_hd" : imageSize;
  }

  parsed.marketContext = parseMarketContext(o.marketContext);
  const targetPlatform = asTrimmed(o.targetPlatform);
  if (targetPlatform) parsed.targetPlatform = targetPlatform;
  const businessName = asTrimmed(o.businessName);
  if (businessName) parsed.businessName = businessName;
  const industry = asTrimmed(o.industry);
  if (industry) parsed.industry = industry;
  const postGoal = asTrimmed(o.postGoal);
  if (postGoal) parsed.postGoal = postGoal;

  const sessionId = asTrimmed(o.sessionId);
  if (sessionId) parsed.sessionId = sessionId;
  const headline = asTrimmed(o.headline);
  if (headline) parsed.headline = headline;
  const igCaption = asTrimmed(o.igCaption);
  if (igCaption) parsed.igCaption = igCaption;
  const fbCaption = asTrimmed(o.fbCaption);
  if (fbCaption) parsed.fbCaption = fbCaption;

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

    const marketContext: MarketContext =
      body.marketContext ?? "israeli_local";

    // 1) Cultural Visual Expander (LLM) — prioritize user visual notes, never raw→Flux
    const expanded = await expandVisualPrompt({
      concept: body.prompt,
      postGoal: body.postGoal,
      marketContext,
      businessName: body.businessName,
      industry: body.industry,
    });

    // 2) Category-aware commercial wrapper + banned-token / no-random-faces safety net
    const commercialPrompt = buildCommercialPrompt(expanded.prompt, {
      industry: body.industry,
      postGoal: body.postGoal,
    });

    // 3) Strict 1:1 or 4:5 lock
    const locked = resolveLockedPostImageSize(
      body.imageSize,
      body.targetPlatform,
    );
    const falSize = toFalImageSize(locked);

    const result = await generateFluxImage({
      prompt: commercialPrompt,
      model: "recraft",
      imageSize: falSize,
      style: "realistic_image",
      subStyle: "natural_light",
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
      expandedPrompt: expanded.prompt,
      expandSource: expanded.source,
      marketContext,
      aspectRatio: locked === "portrait_4_5" ? "4:5" : "1:1",
      negativePrompt: COMMERCIAL_NEGATIVE_PROMPT,
      model: result.engine,
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
