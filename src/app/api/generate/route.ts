import { NextResponse } from "next/server";
import {
  applyDomainOutputGuard,
  buildDomainIntentPromptBlock,
  compileStageA,
  parseGenerationPayload,
  toLegacyPost,
  type CompiledPrompt,
  type GenerationPayload,
  type GuardedCampaignOutput,
} from "@/lib/guardrails";
import {
  FalError,
  clarityUpscaleSafe,
  ensurePublicImageUrl,
  generateFluxImageSafe,
} from "@/lib/fal";
import {
  GARAGE_LIFT_LOCKED_PROMPT,
  lintFalPrompt,
  resolveGarageLiftPrompt,
} from "@/lib/visualCompiler";
import { OpenRouterError } from "@/lib/ai/openrouter";
import {
  TextEngineError,
  generateCampaignCopy,
  textEngineToUnified,
} from "@/lib/ai/text-engine";
import { logLlmEnvDiagnostics } from "@/lib/ai/env-debug";
import type { UnifiedGenerateContent } from "@/lib/ai/types";

export const runtime = "nodejs";
export const maxDuration = 90;

logLlmEnvDiagnostics("generate-route");

/**
 * Response shape preserved for frontend:
 * Copy Caption ← data.instagram / post
 * Download Image ← imageUrl
 * WhatsApp Broadcast ← data.whatsapp
 */
function successResponse(
  data: UnifiedGenerateContent,
  compiled: CompiledPrompt,
  imageUrl: string | null,
  usedFallback = false,
): NextResponse<GuardedCampaignOutput> {
  const guarded = applyDomainOutputGuard(data, compiled);

  return NextResponse.json({
    ok: true,
    data: guarded,
    post: toLegacyPost(guarded),
    imageUrl,
    meta: {
      domainIntent: compiled.domainIntent,
      usedFallback,
      usedGoldenPrompt: compiled.usedGoldenPrompt,
      falEnrichedPrompt: compiled.falEnrichedPrompt,
      lockedCta: compiled.lockedCta,
      dictionaryId: compiled.dictionaryId,
      businessName: compiled.businessName,
      industry: compiled.industry,
    },
  });
}

/**
 * Step 4 — FAL-only Execution (Prompt-First, pre-flight linted).
 * AI → fal-ai/flux-pro/v1.1 (flagship); in-FAL Recraft V3 realistic_image fallback.
 * Optional local food img2img stays on FAL Recraft. No third-party / mock images.
 * Upload → clarity-upscaler scale 2.
 * Never crashes the pipeline; returns null imageUrl on failure.
 */
async function stageFalExecution(
  payload: GenerationPayload,
  compiled: CompiledPrompt,
): Promise<string | null> {
  const isUpload =
    payload.imageSource === "upload" || Boolean(payload.referenceImage?.trim());
  const wantAiImage =
    !isUpload &&
    payload.needFalImagePrompt !== false &&
    payload.imageSource !== "upload";

  if (wantAiImage) {
    const lint = lintFalPrompt({
      prompt: compiled.falEnrichedPrompt,
    });
    // Persist lint-cleaned prompt back for meta / response
    compiled.falEnrichedPrompt = lint.prompt;

    const result = await generateFluxImageSafe({
      prompt: lint.prompt,
      timeoutMs: 45_000,
      dictionaryId: compiled.dictionaryId,
      foodHintText: [
        compiled.postGoal,
        compiled.businessName,
        compiled.industry,
      ]
        .filter(Boolean)
        .join(" "),
    });
    if (result.engine) {
      console.info(
        `[generate] image engine: ${result.engine}${
          result.referenceSlug ? ` (ref:${result.referenceSlug})` : ""
        }`,
      );
    }
    if (result.imageUrl) {
      console.log("✅ FAL AI generated image URL:", result.imageUrl);
    }
    return result.imageUrl;
  }

  if (isUpload && payload.referenceImage?.trim()) {
    const ref = payload.referenceImage.trim();
    try {
      const publicUrl = await ensurePublicImageUrl(ref);
      const up = await clarityUpscaleSafe({
        imageUrl: publicUrl,
        upscaleFactor: 2,
        timeoutMs: 45_000,
      });
      if (up.imageUrl) return up.imageUrl;
      if (ref.startsWith("https://") || ref.startsWith("http://")) return ref;
      return null;
    } catch (err) {
      console.warn("[generate] upload enhance failed", err);
      if (ref.startsWith("https://") || ref.startsWith("http://")) return ref;
      return null;
    }
  }

  return null;
}

/**
 * Single smart-input → 2-tier LLM cascade for copy + English Recraft prompt.
 * Tier 1: OpenRouter GPT-4o → GPT-4o-mini (4.5s). Tier 2: Together Llama 70B → DeepSeek-V3.
 * CTAs stay Visual-Compiler locked. Zero mock templates.
 */
async function stageCopyCompiler(
  _payload: GenerationPayload,
  compiled: CompiledPrompt,
): Promise<{
  content: UnifiedGenerateContent;
  provider: string;
  model: string;
  tier: string;
}> {
  const domainBlock = buildDomainIntentPromptBlock(
    compiled.industry,
    compiled.postGoal,
    compiled.businessName,
    compiled.lockedCta,
    compiled.copyHints,
  );

  // One generous free-form string — LLM extracts everything
  const rawInput = [
    compiled.postGoal,
    domainBlock,
    compiled.sampleWhatsapp
      ? `Tone reference (vibe only, never copy): ${compiled.sampleWhatsapp}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const { campaign, provider, model, tier } = await generateCampaignCopy({
    rawInput,
    businessName: compiled.businessName,
    industry: compiled.industry,
    lockedCta: compiled.lockedCta,
  });

  if (campaign.businessName?.trim()) {
    compiled.businessName = campaign.businessName.trim();
  }
  if (campaign.industry?.trim()) {
    compiled.industry = campaign.industry.trim();
  }

  // Prefer LLM Recraft prompt; fall back to Visual Compiler golden/niche prompt
  const llmPhoto = campaign.falImagePrompt?.trim();
  if (llmPhoto) {
    const lint = lintFalPrompt({ prompt: llmPhoto });
    compiled.falEnrichedPrompt = lint.prompt;
  }

  // Garage lift / interior: force wide workshop scene (never air-filter macros)
  const garageLift = resolveGarageLiftPrompt({
    postGoal: compiled.postGoal,
    industry: compiled.industry,
    businessName: compiled.businessName,
    dictionaryId: compiled.dictionaryId,
    currentPrompt: compiled.falEnrichedPrompt,
  });
  if (garageLift) {
    compiled.falEnrichedPrompt = garageLift;
    console.info(
      `[generate] garage-lift lock applied → ${GARAGE_LIFT_LOCKED_PROMPT.slice(0, 64)}…`,
    );
  }

  const unified = textEngineToUnified(campaign, {
    lockedCta: compiled.lockedCta,
    lockedWhatsappCta: compiled.lockedWhatsappCta,
    falImagePrompt: compiled.falEnrichedPrompt,
  });

  return {
    provider,
    model,
    tier,
    content: {
      ...unified,
      instagram: {
        ...unified.instagram,
        ctaText: compiled.lockedCta,
      },
      whatsapp: {
        ...unified.whatsapp,
        actionButton: compiled.lockedWhatsappCta,
      },
      falImagePrompt: compiled.falEnrichedPrompt,
      imagePrompt: compiled.falEnrichedPrompt,
    },
  };
}

/**
 * Prompt-First Deterministic Pipeline:
 *  1) Master dictionary keyword scan
 *  2) Visual Compiler (golden OR niche formula) + pre-flight lint
 *  3) LLM Hebrew copy + bannedWords linter
 *  4) FAL Recraft V3 (or local-food img2img) / clarity-upscaler (never crash)
 */
export async function POST(request: Request) {
  let compiled: CompiledPrompt | null = null;
  logLlmEnvDiagnostics("generate-route");

  try {
    const raw = await request.json().catch(() => null);
    const payload = parseGenerationPayload(raw);
    if (!payload) {
      return NextResponse.json(
        {
          error:
            "Expected JSON body with smartPrompt (or postGoal). Optional: businessName, industry.",
        },
        { status: 400 },
      );
    }

    // Steps 1–2: dictionary match + Ironclad Visual Compiler
    compiled = compileStageA(payload);

    // Step 3: LLM copy — never swallow into mock templates
    let campaign: UnifiedGenerateContent;
    try {
      const copy = await stageCopyCompiler(payload, compiled);
      campaign = copy.content;
      console.info(
        `[generate] copy served by ${copy.model} (tier ${copy.tier}, ${copy.provider})`,
      );
    } catch (llmErr) {
      const message =
        llmErr instanceof Error ? llmErr.message : String(llmErr);
      const details =
        llmErr instanceof TextEngineError
          ? llmErr.details
          : llmErr instanceof OpenRouterError
            ? llmErr.details
            : undefined;
      const bag =
        details && typeof details === "object"
          ? (details as Record<string, unknown>)
          : {};
      console.error("[generate] copy LLM failed — no mock fallback", {
        message,
        details,
      });
      return NextResponse.json(
        {
          error: true,
          message:
            message === "All cascade tiers failed"
              ? "All cascade tiers failed"
              : message,
          cascadeErrors: bag.cascadeErrors ?? null,
          togetherError: bag.togetherError ?? null,
          openRouterError: bag.openRouterError ?? null,
          details: message,
        },
        { status: 500 },
      );
    }

    // Step 4: bannedWords / CTA lock / food sanitizer
    campaign = applyDomainOutputGuard(campaign, compiled);

    // Step 5: FAL (best-effort — image may be null without failing the copy)
    let imageUrl: string | null = null;
    try {
      imageUrl = await stageFalExecution(payload, compiled);
    } catch (falErr) {
      console.error("[generate] FAL stage failed — continuing", falErr);
      imageUrl = null;
    }

    return successResponse(campaign, compiled, imageUrl, false);
  } catch (err) {
    console.error("[generate] unhandled pipeline error", err);

    const message = err instanceof Error ? err.message : String(err);
    const details =
      err instanceof TextEngineError || err instanceof OpenRouterError
        ? err.details
        : err instanceof FalError
          ? err.details
          : undefined;

    return NextResponse.json(
      { error: true, details: message, ...(details ? { meta: details } : {}) },
      { status: 500 },
    );
  }
}
