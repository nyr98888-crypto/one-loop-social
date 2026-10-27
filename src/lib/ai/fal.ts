import { fal } from "@fal-ai/client";
import {
  ENHANCE_ENVIRONMENT_NEGATIVE,
  ENHANCE_NATURAL_NEGATIVE,
  FAL_MODELS,
  resolveIndustryBackgroundPrompt,
} from "./constants";

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

/** Run a FAL model and wait for the result. */
export async function falRun<TInput extends Record<string, unknown>>(
  modelId: string,
  input: TInput,
): Promise<FalImageResponse> {
  ensureFalConfigured();

  try {
    const result = await fal.subscribe(modelId, {
      input,
      logs: false,
    });
    return result.data as FalImageResponse;
  } catch (err) {
    const message = err instanceof Error ? err.message : "FAL request failed";
    throw new FalError(`FAL request failed (${modelId}): ${message}`, 502, err);
  }
}

export function extractImageUrl(result: FalImageResponse): string {
  const url = result.images?.[0]?.url ?? result.image?.url;
  if (!url) {
    throw new FalError("FAL returned no image URL", 502, result);
  }
  return url;
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

export async function generateFluxImage(input: {
  prompt: string;
  model?: "schnell" | "pro";
  imageSize?: string;
}): Promise<{ imageUrl: string; seed?: number; prompt?: string }> {
  const modelKey = input.model === "pro" ? "pro" : "schnell";
  const modelId = FAL_MODELS[modelKey];

  const payload: Record<string, unknown> = {
    prompt: input.prompt,
    image_size: input.imageSize ?? "square_hd",
    num_images: 1,
    output_format: "jpeg",
  };

  if (modelKey === "schnell") {
    payload.num_inference_steps = 4;
    payload.enable_safety_checker = true;
  }

  const result = await falRun(modelId, payload);
  return {
    imageUrl: extractImageUrl(result),
    seed: result.seed,
    prompt: result.prompt,
  };
}

/** Layer 1 — Clarity upscale & de-noise (compression artifact removal). */
export async function clarityUpscale(input: {
  imageUrl: string;
  upscaleFactor?: number;
}): Promise<string> {
  const result = await falRun(FAL_MODELS.clarity, {
    image_url: input.imageUrl,
    upscale_factor: input.upscaleFactor ?? 2,
    creativity: 0.25,
    resemblance: 0.7,
    prompt: "masterpiece, best quality, highres, sharp commercial photo",
    negative_prompt:
      "(worst quality, low quality, normal quality:2), blurry, artifacts, noise",
    enable_safety_checker: true,
  });
  return extractImageUrl(result);
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
    ? "gentle natural daylight, soft window light, preserve original scene and ambiance, clean exposure, subtle clarity, single photo only, no studio backdrop, no text overlays"
    : "soft balanced commercial studio lighting, softbox key light, gentle fill, clean product photography, even exposure, no harsh shadows, single photo only";
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
