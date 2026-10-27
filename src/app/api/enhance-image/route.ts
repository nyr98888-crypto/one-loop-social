import { NextResponse } from "next/server";
import { FalError, relightImage, upscaleImage } from "@/lib/ai/fal";
import type { EnhanceImageRequest } from "@/lib/ai/types";

export const runtime = "nodejs";
export const maxDuration = 90;

const VALID_LIGHTING = new Set([
  "natural",
  "studio",
  "golden_hour",
  "soft",
  "dramatic",
  "front_light",
]);

function isValidImageRef(value: string): boolean {
  return (
    value.startsWith("https://") ||
    value.startsWith("http://") ||
    value.startsWith("data:image/")
  );
}

function parseBody(body: unknown): EnhanceImageRequest | null {
  if (!body || typeof body !== "object") return null;
  const { imageUrl, lightingStyle, upscaleFactor } = body as Record<
    string,
    unknown
  >;

  if (typeof imageUrl !== "string" || !isValidImageRef(imageUrl.trim())) {
    return null;
  }

  const parsed: EnhanceImageRequest = { imageUrl: imageUrl.trim() };

  if (typeof lightingStyle === "string" && VALID_LIGHTING.has(lightingStyle)) {
    parsed.lightingStyle =
      lightingStyle as EnhanceImageRequest["lightingStyle"];
  }

  if (
    typeof upscaleFactor === "number" &&
    [1, 2, 3, 4].includes(upscaleFactor)
  ) {
    parsed.upscaleFactor = upscaleFactor as 1 | 2 | 3 | 4;
  }

  return parsed;
}

/**
 * Pipeline: studio relight → Topaz upscale.
 * Turns raw phone shots into sharp, well-lit commercial creatives.
 */
export async function POST(request: Request) {
  try {
    const body = parseBody(await request.json().catch(() => null));
    if (!body) {
      return NextResponse.json(
        {
          error:
            "Expected JSON body with imageUrl (https URL or data:image URI)",
        },
        { status: 400 },
      );
    }

    const lightingStyle = body.lightingStyle ?? "studio";
    const upscaleFactor = body.upscaleFactor ?? 2;

    const relitUrl = await relightImage({
      imageUrl: body.imageUrl,
      lightingStyle,
    });

    const enhancedUrl = await upscaleImage({
      imageUrl: relitUrl,
      upscaleFactor,
    });

    return NextResponse.json({
      ok: true,
      imageUrl: enhancedUrl,
      relitUrl,
      lightingStyle,
      upscaleFactor,
    });
  } catch (err) {
    if (err instanceof FalError) {
      return NextResponse.json(
        { error: err.message, details: err.details },
        { status: err.status },
      );
    }

    console.error("[enhance-image]", err);
    return NextResponse.json(
      { error: "Failed to enhance image" },
      { status: 500 },
    );
  }
}
