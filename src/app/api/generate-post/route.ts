import { NextResponse } from "next/server";
import { OpenRouterError, generateMarketingPost } from "@/lib/ai/openrouter";
import { saveGeneratedPost } from "@/lib/db/posts";
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

    const post = await generateMarketingPost(body);

    let saved: Awaited<ReturnType<typeof saveGeneratedPost>> | null = null;
    try {
      saved = await saveGeneratedPost({
        businessName: body.businessName,
        industry: body.industry,
        headline: post.headline,
        igCaption: post.instagramCaption,
        fbCaption: post.facebookCaption,
        imageUrl: null,
        status: "generated",
      });
    } catch (dbErr) {
      // Generation succeeded — do not fail the request if persistence hiccups.
      console.error("[generate-post] db persist failed", dbErr);
    }

    return NextResponse.json({
      ok: true,
      post,
      saved: saved
        ? { id: saved.id, businessId: saved.businessId, status: saved.status }
        : null,
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
