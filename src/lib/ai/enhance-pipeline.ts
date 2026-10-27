import {
  clarityUpscale,
  ensurePublicImageUrl,
  replaceBackground,
  relightImage,
} from "@/lib/ai/fal";
import type { EnhanceFlavor } from "@/lib/ai/types";
import { applyLogoBranding } from "@/lib/image/branding";

export interface EnhancePipelineInput {
  imageUrl: string;
  industry: string;
  /** Active social platform — drives Layer 4 aspect crop. */
  targetPlatform?: string | null;
  /** natural = clarity + soft relight; studio = full 4 layers. */
  flavor?: EnhanceFlavor;
  /** Optional user guidance (Hebrew/English) for prompts. */
  customInstruction?: string;
}

export interface EnhancePipelineResult {
  imageUrl: string;
  flavor: EnhanceFlavor;
  layers: {
    upscaled: string;
    background: string;
    relit: string;
    branded: string;
  };
}

export interface DualEnhancePipelineResult {
  /** Authenticity path — separate single image URL. */
  naturalUrl: string;
  /** Commercial studio path — separate single image URL. */
  studioUrl: string;
  natural: EnhancePipelineResult;
  studio: EnhancePipelineResult;
}

/**
 * Commercial enhancement pipeline.
 * - studio (default): clarity → BG replace → studio relight → logo
 * - natural: clarity → soft natural relight → crop only (no BG / logo)
 *
 * Each run returns ONE image URL. Never stitches flavors into a composite.
 */
export async function runEnhancePipeline(
  input: EnhancePipelineInput,
): Promise<EnhancePipelineResult> {
  const flavor: EnhanceFlavor = input.flavor === "natural" ? "natural" : "studio";
  const sourceUrl = await ensurePublicImageUrl(input.imageUrl);
  const customInstruction = input.customInstruction?.trim() || undefined;

  // Layer 1 — required
  const upscaled = await clarityUpscale({ imageUrl: sourceUrl });

  if (flavor === "natural") {
    let relit = upscaled;
    try {
      relit = await relightImage({
        imageUrl: upscaled,
        lightingStyle: "natural",
        customInstruction,
      });
    } catch (err) {
      console.warn(
        "[enhance-pipeline] Natural relight failed, using Layer 1",
        err,
      );
    }

    // Crop only — preserve setting; no BG replace / no logo branding text
    const branded = await applyLogoBranding(relit, {
      targetPlatform: input.targetPlatform,
      skipLogo: true,
    });

    return {
      imageUrl: branded,
      flavor,
      layers: {
        upscaled,
        background: upscaled,
        relit,
        branded,
      },
    };
  }

  // Layer 2 — optional fallback
  let background = upscaled;
  try {
    background = await replaceBackground({
      imageUrl: upscaled,
      industry: input.industry,
      customInstruction,
    });
  } catch (err) {
    console.warn(
      "[enhance-pipeline] Layer 2 background failed, using Layer 1",
      err,
    );
  }

  // Layer 3 — optional fallback
  let relit = background;
  try {
    relit = await relightImage({
      imageUrl: background,
      lightingStyle: "studio",
      customInstruction,
    });
  } catch (err) {
    console.warn(
      "[enhance-pipeline] Layer 3 relight failed, using Layer 2",
      err,
    );
  }

  // Layer 4 — crop + branding
  const branded = await applyLogoBranding(relit, {
    targetPlatform: input.targetPlatform,
    logoCorner: "top-right",
  });

  return {
    imageUrl: branded,
    flavor,
    layers: {
      upscaled,
      background,
      relit,
      branded,
    },
  };
}

/**
 * Run natural + studio as two independent pipelines.
 * Returns two distinct URLs — never a side-by-side composite.
 */
export async function runDualEnhancePipeline(
  input: Omit<EnhancePipelineInput, "flavor">,
): Promise<DualEnhancePipelineResult> {
  const sourceUrl = await ensurePublicImageUrl(input.imageUrl);
  const shared = {
    imageUrl: sourceUrl,
    industry: input.industry,
    targetPlatform: input.targetPlatform,
    customInstruction: input.customInstruction,
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
