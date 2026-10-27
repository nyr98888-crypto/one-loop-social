import { NextResponse } from "next/server";
import { OpenRouterError, generateMarketingPost } from "@/lib/ai/openrouter";
import type { GeneratePostRequest } from "@/lib/ai/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function parseBody(body: unknown): GeneratePostRequest | null {
  if (!body || typeof body !== "object") return null;
  const { businessName, industry, postGoal } = body as Record<string, unknown>;

  if (
    typeof businessName !== "string" ||
    typeof industry !== "string" ||
    typeof postGoal !== "string"
  ) {
    return null;
  }

  const trimmed = {
    businessName: businessName.trim(),
    industry: industry.trim(),
    postGoal: postGoal.trim(),
  };

  if (!trimmed.businessName || !trimmed.industry || !trimmed.postGoal) {
    return null;
  }

  return trimmed;
}

export async function POST(request: Request) {
  try {
    const body = parseBody(await request.json().catch(() => null));
    if (!body) {
      return NextResponse.json(
        {
          error:
            "Expected JSON body with businessName, industry, and postGoal",
        },
        { status: 400 },
      );
    }

    // Text generation only — permanent `posts` rows require a chosen image
    // via the draft-variant lifecycle (`post_draft_variants` → `posts`).
    const post = await generateMarketingPost(body);

    return NextResponse.json({
      ok: true,
      post,
    });
  } catch (err) {
    if (err instanceof OpenRouterError) {
      return NextResponse.json(
        { error: err.message, details: err.details },
        { status: err.status },
      );
    }

    console.error("[generate-post]", err);
    return NextResponse.json(
      { error: "Failed to generate post" },
      { status: 500 },
    );
  }
}
