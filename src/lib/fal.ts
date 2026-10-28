/**
 * Re-export FAL helpers at `@/lib/fal` for route imports.
 * Exclusive AI engine: Flux Pro v1.1 (`fal-ai/flux-pro/v1.1`),
 * with in-FAL Recraft V3 realistic_image as secondary.
 */
export {
  FalError,
  clarityUpscale,
  clarityUpscaleSafe,
  ensurePublicImageUrl,
  extractImageUrl,
  falRun,
  generateFluxImage,
  generateFluxImageSafe,
  relightImage,
  replaceBackground,
  uploadLocalReferenceImage,
  uploadToFalStorage,
  upscaleImage,
} from "@/lib/ai/fal";

export {
  detectAndResolveLocalFoodReference,
  detectSpecificFoodSlug,
  resolveLocalFoodReferencePath,
} from "@/lib/ai/food-reference";

export {
  IRONCLAD_NEGATIVE_PROMPT,
  compileAndLintFalPrompt,
  compileFalPrompt,
  lintFalPrompt,
} from "@/lib/visualCompiler";

/** @deprecated prefer IRONCLAD_NEGATIVE_PROMPT */
export { FAL_GUARDRAIL_NEGATIVE_PROMPT } from "@/lib/guardrails";
