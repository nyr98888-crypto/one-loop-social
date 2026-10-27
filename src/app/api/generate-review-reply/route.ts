import { NextResponse } from "next/server";
import { OpenRouterError, generateReviewReply } from "@/lib/ai/openrouter";
import type { GenerateReviewReplyRequest } from "@/lib/ai/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function parseBody(body: unknown): GenerateReviewReplyRequest | null {
  if (!body || typeof body !== "object") return null;
  const { customerName, rating, reviewText, platform, businessName } =
    body as Record<string, unknown>;

  if (
    typeof customerName !== "string" ||
    typeof reviewText !== "string" ||
    typeof platform !== "string" ||
    (platform !== "google" && platform !== "easy") ||
    typeof rating !== "number" ||
    !Number.isFinite(rating)
  ) {
    return null;
  }

  const trimmed: GenerateReviewReplyRequest = {
    customerName: customerName.trim(),
    rating: Math.min(5, Math.max(1, Math.round(rating))),
    reviewText: reviewText.trim(),
    platform,
  };

  if (typeof businessName === "string" && businessName.trim()) {
    trimmed.businessName = businessName.trim();
  }

  if (!trimmed.customerName || !trimmed.reviewText) return null;
  return trimmed;
}

export async function POST(request: Request) {
  try {
    const body = parseBody(await request.json().catch(() => null));
    if (!body) {
      return NextResponse.json(
        {
          error:
            "Expected customerName, rating (1–5), reviewText, platform (google|easy)",
        },
        { status: 400 },
      );
    }

    const result = await generateReviewReply(body);

    return NextResponse.json({
      ok: true,
      success: true,
      reply: result.reply,
    });
  } catch (err) {
    if (err instanceof OpenRouterError) {
      return NextResponse.json(
        { error: err.message, details: err.details },
        { status: err.status },
      );
    }

    console.error("[generate-review-reply]", err);
    return NextResponse.json(
      { error: "Failed to generate review reply" },
      { status: 500 },
    );
  }
}
