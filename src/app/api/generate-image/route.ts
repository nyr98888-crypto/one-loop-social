import { NextResponse } from "next/server";
import {
  COMMERCIAL_NEGATIVE_PROMPT,
  buildCommercialPrompt,
} from "@/lib/ai/constants";
import { FalError, generateFluxImage } from "@/lib/ai/fal";
import type { GenerateImageRequest } from "@/lib/ai/types";

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

function parseBody(body: unknown): GenerateImageRequest | null {
  if (!body || typeof body !== "object") return null;
  const { prompt, model, imageSize } = body as Record<string, unknown>;

  if (typeof prompt !== "string" || !prompt.trim()) return null;

  const parsed: GenerateImageRequest = { prompt: prompt.trim() };

  if (model === "schnell" || model === "pro") {
    parsed.model = model;
  }

  if (typeof imageSize === "string" && VALID_SIZES.has(imageSize)) {
    parsed.imageSize = imageSize as GenerateImageRequest["imageSize"];
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

    const commercialPrompt = buildCommercialPrompt(body.prompt);

    const result = await generateFluxImage({
      prompt: commercialPrompt,
      model: body.model ?? "schnell",
      imageSize: body.imageSize ?? "square_hd",
    });

    return NextResponse.json({
      ok: true,
      imageUrl: result.imageUrl,
      seed: result.seed,
      prompt: commercialPrompt,
      negativePrompt: COMMERCIAL_NEGATIVE_PROMPT,
      model: body.model ?? "schnell",
    });
  } catch (err) {
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
