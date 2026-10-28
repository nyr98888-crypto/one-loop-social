import {
  clarityUpscale,
  ensurePublicImageUrl,
  replaceBackground,
  relightImage,
} from "@/lib/ai/fal";
import { resolveIndustryIntent } from "@/lib/ai/industry-intent";
import type { EnhanceFlavor } from "@/lib/ai/types";
import { applyLogoBranding } from "@/lib/image/branding";

export interface EnhancePipelineInput {
  imageUrl: string;
  industry: string;
  /** Active social platform — drives Layer 4 / framing aspect crop. */
  targetPlatform?: string | null;
  /** natural = clarity + soft relight; studio = full commercial path. */
  flavor?: EnhanceFlavor;
  /** Optional user guidance (Hebrew/English) for prompts. */
  customInstruction?: string;
  /** Homepage uploads — skip logo stamp so product/food stays clean. */
  skipLogo?: boolean;
}

export interface EnhancePipelineResult {
  imageUrl: string;
  flavor: EnhanceFlavor;
  layers: {
    framed: string;
    upscaled: string;
    graded: string;
    final: string;
    /** @deprecated aliases for older callers */
    background: string;
    relit: string;
    branded: string;
  };
}

export interface DualEnhancePipelineResult {
  naturalUrl: string;
  studioUrl: string;
  natural: EnhancePipelineResult;
  studio: EnhancePipelineResult;
}

/** Niche-aware Layer 3 color / lighting guidance. */
export function resolveNicheColorGrade(
  industry?: string | null,
  postGoal?: string | null,
): string {
  const intent = resolveIndustryIntent(industry, postGoal, industry);
  switch (intent) {
    case "food":
      return "appetizing warm color grade, golden morning bakery light, mouth-watering food photography vibrancy, soft highlights, rich crust tones, never cold or clinical";
    case "beauty":
      return "crisp modern spa lighting, clean luminous skin-safe contrast, bright high-key clinic aesthetic, polished and fresh";
    case "services":
      return "sharp commercial contrast, clean workshop daylight, professional project photography, modern clarity";
    default:
      return "balanced commercial color grade, warm softbox luminosity, vibrant natural colors, crisp focus";
  }
}

/**
 * 4-layer FAL enhancement for user uploads:
 * 1. Framing / smart crop (center, platform aspect)
 * 2. Super-resolution (clarity upscaler — denoise + detail)
 * 3. Commercial color grade (niche-aware relight; studio may also refine BG)
 * 4. Quality guard (high-fidelity JPEG export, optional logo)
 */
export async function runEnhancePipeline(
  input: EnhancePipelineInput,
): Promise<EnhancePipelineResult> {
  const flavor: EnhanceFlavor = input.flavor === "natural" ? "natural" : "studio";
  const sourceUrl = await ensurePublicImageUrl(input.imageUrl);
  const nicheGrade = resolveNicheColorGrade(input.industry);
  const customInstruction = [nicheGrade, input.customInstruction?.trim()]
    .filter(Boolean)
    .join(". ");
  const skipLogo = input.skipLogo === true || flavor === "natural";

  // Layer 1 — Framing / smart crop (centered, balanced aspect)
  const framed = await applyLogoBranding(sourceUrl, {
    targetPlatform: input.targetPlatform ?? "instagram",
    skipLogo: true,
  });

  // Layer 2 — Super-resolution / denoise (clarity-upscaler)
  let upscaled = framed;
  try {
    upscaled = await clarityUpscale({ imageUrl: framed });
  } catch (err) {
    console.warn(
      "[enhance-pipeline] Layer 2 clarity failed, using framed source",
      err,
    );
  }

  // Layer 3 — Commercial color grade (relight). Studio may also swap environment.
  // Homepage `skipLogo` path skips BG replace — it often adds 60–120s and can fail.
  let graded = upscaled;
  if (flavor === "studio" && !skipLogo) {
    try {
      graded = await replaceBackground({
        imageUrl: upscaled,
        industry: input.industry,
        customInstruction,
      });
    } catch (err) {
      console.warn(
        "[enhance-pipeline] Layer 3 environment failed, continuing with grade-only",
        err,
      );
    }
  }

  try {
    graded = await relightImage({
      imageUrl: graded,
      lightingStyle: flavor === "natural" || skipLogo ? "natural" : "studio",
      customInstruction,
    });
  } catch (err) {
    console.warn(
      "[enhance-pipeline] Layer 3 relight failed, using previous layer",
      err,
    );
  }

  // Layer 4 — Quality guard export (higher-fidelity JPEG than source)
  const finalUrl = await applyLogoBranding(graded, {
    targetPlatform: input.targetPlatform ?? "instagram",
    logoCorner: "top-right",
    skipLogo,
  });

  return {
    imageUrl: finalUrl,
    flavor,
    layers: {
      framed,
      upscaled,
      graded,
      final: finalUrl,
      background: graded,
      relit: graded,
      branded: finalUrl,
    },
  };
}

export async function runDualEnhancePipeline(
  input: Omit<EnhancePipelineInput, "flavor">,
): Promise<DualEnhancePipelineResult> {
  const sourceUrl = await ensurePublicImageUrl(input.imageUrl);
  const shared = {
    imageUrl: sourceUrl,
    industry: input.industry,
    targetPlatform: input.targetPlatform,
    customInstruction: input.customInstruction,
    skipLogo: input.skipLogo,
  };

  const [natural, studio] = await Promise.all([
    runEnhancePipeline({ ...shared, flavor: "natural" }),
    runEnhancePipeline({ ...shared, flavor: "studio" }),
  ]);

  return {
    naturalUrl: natural.imageUrl,
    studioUrl: studio.imageUrl,
    natural,
    studio,
  };
}
