import { FAL_MODELS } from "./constants";

const FAL_RUN = "https://fal.run";

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

function getFalKey(): string {
  const key = process.env.FAL_KEY;
  if (!key) {
    throw new FalError("Missing FAL_KEY environment variable", 500);
  }
  return key;
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

/** Synchronous FAL run — blocks until the model returns. */
export async function falRun<TInput extends Record<string, unknown>>(
  modelId: string,
  input: TInput,
): Promise<FalImageResponse> {
  const res = await fetch(`${FAL_RUN}/${modelId}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${getFalKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    throw new FalError(
      `FAL request failed (${modelId})`,
      res.status,
      data,
    );
  }

  return data as FalImageResponse;
}

export function extractImageUrl(result: FalImageResponse): string {
  const url = result.images?.[0]?.url ?? result.image?.url;
  if (!url) {
    throw new FalError("FAL returned no image URL", 502, result);
  }
  return url;
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

export async function relightImage(input: {
  imageUrl: string;
  lightingStyle?: string;
}): Promise<string> {
  const result = await falRun(FAL_MODELS.relight, {
    image_url: input.imageUrl,
    lighting_style: input.lightingStyle ?? "studio",
  });
  return extractImageUrl(result);
}

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
