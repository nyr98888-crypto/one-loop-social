import { readFile } from "fs/promises";
import path from "path";
import { fal } from "@fal-ai/client";
import {
  ENHANCE_ENVIRONMENT_NEGATIVE,
  ENHANCE_NATURAL_NEGATIVE,
  FAL_FLAGSHIP_IMAGE_MODEL,
  FAL_MODELS,
  RECRAFT_REFERENCE_STRENGTH,
  resolveIndustryBackgroundPrompt,
} from "./constants";
import { detectAndResolveLocalFoodReference } from "./food-reference";
import { injectWorkshopPhysicality } from "@/lib/visualCompiler";

export class FalError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "FalError";
  }
}

function ensureFalConfigured(): void {
  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    throw new FalError("Missing FAL_KEY environment variable", 500);
  }
  fal.config({ credentials: key });
}

interface FalImage {
  url: string;
  width?: number;
  height?: number;
  content_type?: string;
}

interface FalImageResponse {
  images?: FalImage[];
  image?: FalImage;
  seed?: number;
  prompt?: string;
}

/** Recraft V3 needs more headroom than Schnell. */
const FAL_DEFAULT_TIMEOUT_MS = 45_000;

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new FalError(`FAL timeout after ${ms}ms (${label})`, 504));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/** Run a FAL model and wait for the result (default 10s timeout). */
export async function falRun<TInput extends Record<string, unknown>>(
  modelId: string,
  input: TInput,
  opts?: { timeoutMs?: number },
): Promise<FalImageResponse> {
  ensureFalConfigured();
  const timeoutMs = opts?.timeoutMs ?? FAL_DEFAULT_TIMEOUT_MS;

  try {
    const result = await withTimeout(
      fal.subscribe(modelId, {
        input,
        logs: false,
      }),
      timeoutMs,
      modelId,
    );
    return result.data as FalImageResponse;
  } catch (err) {
    if (err instanceof FalError) throw err;
    const message = err instanceof Error ? err.message : "FAL request failed";
    throw new FalError(`FAL request failed (${modelId}): ${message}`, 502, err);
  }
}

export function extractImageUrl(result: FalImageResponse): string {
  const url = result.images?.[0]?.url ?? result.image?.url;
  if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) {
    throw new FalError("FAL returned no usable image URL", 502, result);
  }
  return url;
}

function isUsableHttpsUrl(url: unknown): url is string {
  return typeof url === "string" && /^https?:\/\//i.test(url.trim());
}

/** Upload bytes / Blob to fal CDN; returns a public URL. */
export async function uploadToFalStorage(
  data: Buffer | Blob,
  fileName: string,
  contentType: string,
): Promise<string> {
  ensureFalConfigured();

  const blob =
    data instanceof Blob
      ? data
      : new Blob([new Uint8Array(data)], { type: contentType });
  const file = new File([blob], fileName, { type: contentType });

  try {
    return await fal.storage.upload(file);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    throw new FalError(`FAL storage upload failed: ${message}`, 502, err);
  }
}

/**
 * Ensure the input is a fetchable https URL for FAL models.
 * Data URIs are uploaded to fal CDN first.
 */
export async function ensurePublicImageUrl(imageRef: string): Promise<string> {
  const trimmed = imageRef.trim();
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return trimmed;
  }

  if (!trimmed.startsWith("data:image/")) {
    throw new FalError(
      "imageUrl must be an https URL or data:image URI",
      400,
    );
  }

  const marker = ";base64,";
  const markerIndex = trimmed.indexOf(marker);
  const header = markerIndex >= 0 ? trimmed.slice(0, markerIndex) : "";
  const contentType = header.startsWith("data:")
    ? header.slice("data:".length)
    : "";
  const base64 = markerIndex >= 0 ? trimmed.slice(markerIndex + marker.length) : "";

  if (!contentType.startsWith("image/") || !base64) {
    throw new FalError("Invalid data:image URI", 400);
  }

  const buffer = Buffer.from(base64, "base64");
  const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  return uploadToFalStorage(buffer, `upload.${ext}`, contentType);
}

function mimeFromExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".jpeg":
    case ".jpg":
    default:
      return "image/jpeg";
  }
}

/** Upload a local reference file to fal CDN for img2img. */
export async function uploadLocalReferenceImage(
  absolutePath: string,
): Promise<string> {
  const buffer = await readFile(absolutePath);
  const ext = path.extname(absolutePath) || ".jpg";
  const base = path.basename(absolutePath);
  return uploadToFalStorage(buffer, base, mimeFromExt(ext));
}

export type FalImageEngine =
  | "flux-pro-v1.1"
  | "recraft-v3"
  | "recraft-v3-img2img";

export async function generateFluxImage(input: {
  /** Must be the LLM-enriched commercial prompt (`falImagePrompt`). */
  prompt: string;
  /** @deprecated Ignored — generate always uses FAL Flux Pro (flagship). */
  model?: "schnell" | "pro" | "recraft";
  /**
   * FAL size: locked to `square_hd` (1024²) for generate pipeline.
   */
  imageSize?: string | { width: number; height: number };
  /** Optional negative — Flux Pro accepts it; Recraft ignores. */
  negativePrompt?: string;
  numInferenceSteps?: number;
  /** Soft timeout (default 45s). */
  timeoutMs?: number;
  /**
   * Optional public https URL for Recraft image-to-image
   * (local food reference / geometry lock) — still FAL-only.
   */
  imageUrl?: string;
  /** Img2img strength when `imageUrl` is set (default ~0.6). */
  strength?: number;
  /** Recraft base style (default realistic_image). */
  style?: string;
  /** Recraft lighting sub-style (default natural_light). */
  subStyle?: string;
}): Promise<{
  imageUrl: string;
  seed?: number;
  prompt?: string;
  engine: FalImageEngine;
}> {
  const tunedPrompt = injectWorkshopPhysicality(input.prompt.trim());
  if (!tunedPrompt) {
    throw new FalError("FAL prompt must be a non-empty falImagePrompt string", 400);
  }

  const style = input.style?.trim() || "realistic_image";
  const subStyle = input.subStyle?.trim() || "natural_light";
  const falStyle =
    style.includes("/") || !subStyle ? style : `${style}/${subStyle}`;
  const refUrl = input.imageUrl?.trim();
  const timeoutMs = input.timeoutMs ?? FAL_DEFAULT_TIMEOUT_MS;

  console.log("🎨 Generating image via FAL AI (Flux Pro / Recraft V3)...");

  // Optional image-to-image when a food reference URL is available (FAL Recraft)
  if (refUrl && isUsableHttpsUrl(refUrl)) {
    const strength =
      typeof input.strength === "number" && Number.isFinite(input.strength)
        ? Math.min(1, Math.max(0, input.strength))
        : RECRAFT_REFERENCE_STRENGTH;

    const result = await falRun(
      FAL_MODELS.recraftImg2Img,
      {
        prompt: tunedPrompt,
        image_url: refUrl,
        strength,
        style: falStyle,
        sub_style: subStyle,
      },
      { timeoutMs },
    );
    const imageUrl = extractImageUrl(result);
    console.log("✅ FAL AI generated image URL:", imageUrl);
    return {
      imageUrl,
      seed: result.seed,
      prompt: result.prompt ?? tunedPrompt,
      engine: "recraft-v3-img2img",
    };
  }

  // 1) Exclusive flagship: fal-ai/flux-pro/v1.1
  try {
    const result = await falRun(
      FAL_FLAGSHIP_IMAGE_MODEL,
      {
        prompt: tunedPrompt,
        image_size: "square_hd",
        num_images: 1,
        enable_safety_checker: true,
        ...(input.negativePrompt?.trim()
          ? { negative_prompt: input.negativePrompt.trim() }
          : {}),
      },
      { timeoutMs },
    );
    const imageUrl = extractImageUrl(result);
    console.log("✅ FAL AI generated image URL:", imageUrl);
    return {
      imageUrl,
      seed: result.seed,
      prompt: result.prompt ?? tunedPrompt,
      engine: "flux-pro-v1.1",
    };
  } catch (fluxErr) {
    console.warn(
      "[fal] Flux Pro v1.1 failed — in-FAL fallback to Recraft V3 realistic_image",
      fluxErr instanceof Error ? fluxErr.message : fluxErr,
    );
  }

  // 2) In-FAL secondary: Recraft V3 full realistic_image mode
  const result = await falRun(
    FAL_MODELS.recraft,
    {
      prompt: tunedPrompt,
      style: "realistic_image",
      sub_style: "natural_light",
      image_size: "square_hd",
    },
    { timeoutMs },
  );

  const imageUrl = extractImageUrl(result);
  console.log("✅ FAL AI generated image URL:", imageUrl);
  return {
    imageUrl,
    seed: result.seed,
    prompt: result.prompt ?? tunedPrompt,
    engine: "recraft-v3",
  };
}

/**
 * Safe FAL-only image call (Flux Pro → Recraft) — never throws to callers.
 * Optionally resolves a local food reference for Recraft img2img.
 * No third-party image providers and no mock URLs.
 */
export async function generateFluxImageSafe(input: {
  prompt: string;
  negativePrompt?: string;
  timeoutMs?: number;
  /** Dictionary id / free text used to look up `public/assets/reference/`. */
  dictionaryId?: string | null;
  foodHintText?: string | null;
  /** Explicit reference URL (skips local file lookup when set). */
  imageUrl?: string;
  strength?: number;
}): Promise<{
  imageUrl: string | null;
  error?: string;
  engine?: FalImageEngine;
  referenceSlug?: string;
}> {
  try {
    let referenceUrl = input.imageUrl?.trim();
    let referenceSlug: string | undefined;

    if (!referenceUrl) {
      const local = detectAndResolveLocalFoodReference({
        dictionaryId: input.dictionaryId,
        text: input.foodHintText,
      });
      if (local) {
        referenceSlug = local.slug;
        try {
          referenceUrl = await uploadLocalReferenceImage(local.absolutePath);
          console.info(
            `[fal] local food reference uploaded: ${local.slug} → img2img`,
          );
        } catch (uploadErr) {
          console.warn(
            "[fal] food reference upload failed — falling back to txt2img",
            uploadErr,
          );
          referenceUrl = undefined;
        }
      }
    }

    const result = await generateFluxImage({
      prompt: input.prompt,
      imageSize: "square_hd",
      style: "realistic_image",
      subStyle: "natural_light",
      negativePrompt: input.negativePrompt,
      timeoutMs: input.timeoutMs ?? FAL_DEFAULT_TIMEOUT_MS,
      imageUrl: referenceUrl,
      strength: input.strength ?? RECRAFT_REFERENCE_STRENGTH,
    });
    if (!isUsableHttpsUrl(result.imageUrl)) {
      return { imageUrl: null, error: "invalid_image_url" };
    }
    return {
      imageUrl: result.imageUrl,
      engine: result.engine,
      referenceSlug,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "fal_image_failed";
    console.warn("[fal] generateFluxImageSafe:", message);
    return { imageUrl: null, error: message };
  }
}

/** Layer 1 — Clarity upscale & de-noise (compression artifact removal). */
export async function clarityUpscale(input: {
  imageUrl: string;
  upscaleFactor?: number;
  timeoutMs?: number;
}): Promise<string> {
  const result = await falRun(
    FAL_MODELS.clarity,
    {
      image_url: input.imageUrl,
      upscale_factor: input.upscaleFactor ?? 2,
      scale: input.upscaleFactor ?? 2,
      creativity: 0.25,
      resemblance: 0.7,
      prompt: "masterpiece, best quality, highres, sharp commercial photo",
      negative_prompt:
        "(worst quality, low quality, normal quality:2), blurry, artifacts, noise",
      enable_safety_checker: true,
    },
    { timeoutMs: input.timeoutMs ?? FAL_DEFAULT_TIMEOUT_MS },
  );
  return extractImageUrl(result);
}

/** Safe clarity upscale — returns null instead of throwing. */
export async function clarityUpscaleSafe(input: {
  imageUrl: string;
  upscaleFactor?: number;
  timeoutMs?: number;
}): Promise<{ imageUrl: string | null; error?: string }> {
  try {
    const url = await clarityUpscale(input);
    if (!isUsableHttpsUrl(url)) {
      return { imageUrl: null, error: "invalid_image_url" };
    }
    return { imageUrl: url };
  } catch (err) {
    const message = err instanceof Error ? err.message : "clarity_failed";
    console.warn("[fal] clarityUpscaleSafe:", message);
    return { imageUrl: null, error: message };
  }
}

function appendCustomInstruction(
  base: string,
  customInstruction?: string,
): string {
  const extra = customInstruction?.trim();
  if (!extra) return base;
  return `${base}. User guidance: ${extra}`;
}

/** Layer 2 — niche commercial background / environment enhancement. */
export async function replaceBackground(input: {
  imageUrl: string;
  industry: string;
  customInstruction?: string;
}): Promise<string> {
  const bgPrompt = appendCustomInstruction(
    resolveIndustryBackgroundPrompt(input.industry),
    input.customInstruction,
  );
  const result = await falRun(FAL_MODELS.background, {
    image_url: input.imageUrl,
    prompt: bgPrompt,
    negative_prompt: ENHANCE_ENVIRONMENT_NEGATIVE,
    refine_prompt: true,
    fast: true,
    num_images: 1,
  });
  return extractImageUrl(result);
}

/**
 * Layer 3 — soft commercial or natural relighting.
 * Prefers IC-Light v2; falls back to image-apps relighting.
 * Always returns a single image URL (never a side-by-side composite).
 */
export async function relightImage(input: {
  imageUrl: string;
  lightingStyle?: string;
  customInstruction?: string;
}): Promise<string> {
  const natural = input.lightingStyle === "natural";
  const basePrompt = natural
    ? "bright natural daylight, soft window light, preserve original scene, clean luminous exposure, vibrant natural skin tones, sharp focus, single photo only, no studio backdrop, no text overlays, no dim or moody shadows"
    : "professional commercial photography, high-key warm softbox lighting, luminous clean background, crisp sharp focus, 8k resolution, even exposure, no harsh shadows, no dim moody or desaturated look, single photo only";
  const prompt = appendCustomInstruction(basePrompt, input.customInstruction);
  const negative = natural
    ? ENHANCE_NATURAL_NEGATIVE
    : ENHANCE_ENVIRONMENT_NEGATIVE;

  try {
    const result = await falRun(FAL_MODELS.iclight, {
      image_url: input.imageUrl,
      prompt,
      negative_prompt: negative,
      initial_latent: natural ? "None" : "Top",
      num_inference_steps: natural ? 18 : 24,
      num_images: 1,
      output_format: "jpeg",
      enable_safety_checker: true,
    });
    return extractImageUrl(result);
  } catch (primaryErr) {
    console.warn(
      "[fal] IC-Light failed, falling back to image-apps relighting",
      primaryErr,
    );
    const result = await falRun(FAL_MODELS.relight, {
      image_url: input.imageUrl,
      lighting_style: natural ? "natural" : (input.lightingStyle ?? "studio"),
    });
    return extractImageUrl(result);
  }
}

/** Legacy Topaz upscale (non-pipeline callers). */
export async function upscaleImage(input: {
  imageUrl: string;
  upscaleFactor?: number;
}): Promise<string> {
  const result = await falRun(FAL_MODELS.upscale, {
    image_url: input.imageUrl,
    model: "Standard V2",
    upscale_factor: input.upscaleFactor ?? 2,
    output_format: "jpeg",
    face_enhancement: false,
    sharpen: 0.4,
    denoise: 0.25,
  });
  return extractImageUrl(result);
}
