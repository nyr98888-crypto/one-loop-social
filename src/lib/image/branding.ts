import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { EnhanceAspectRatio } from "@/lib/ai/constants";
import { resolveEnhanceAspectRatio } from "@/lib/ai/constants";
import { FalError, uploadToFalStorage } from "@/lib/ai/fal";

const LOGO_PADDING_RATIO = 0.035;
const LOGO_WIDTH_RATIO = 0.14;
const LOGO_OPACITY = 0.92;
const OUTPUT_LONG_EDGE = 1600;

async function loadLogoBuffer(): Promise<Buffer> {
  const logoPath = path.join(process.cwd(), "public", "logo.png");
  try {
    return await readFile(logoPath);
  } catch {
    throw new FalError(
      "Branding logo missing — expected public/logo.png",
      500,
    );
  }
}

async function fetchImageBuffer(imageUrl: string): Promise<Buffer> {
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new FalError(
      `Failed to fetch image for branding (${res.status})`,
      502,
    );
  }
  return Buffer.from(await res.arrayBuffer());
}

function aspectToPixels(
  ratio: EnhanceAspectRatio,
  longEdge: number,
): { width: number; height: number } {
  switch (ratio) {
    case "16:9":
      return { width: longEdge, height: Math.round((longEdge * 9) / 16) };
    case "4:5":
      return {
        width: Math.round((longEdge * 4) / 5),
        height: longEdge,
      };
    case "1:1":
    default:
      return { width: longEdge, height: longEdge };
  }
}

async function applyLogoOpacity(
  logoPng: Buffer,
  opacity: number,
): Promise<Buffer> {
  const { data, info } = await sharp(logoPng)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 3; i < data.length; i += 4) {
    data[i] = Math.round(data[i] * opacity);
  }

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}

/**
 * Layer 4 — crop to platform aspect, optionally composite logo,
 * export web-optimized JPEG. Returns a fal CDN URL.
 */
export async function applyLogoBranding(
  imageUrl: string,
  options?: {
    targetPlatform?: string | null;
    logoCorner?: "top-left" | "top-right";
    /** Natural flavor — aspect crop only, no logo composite. */
    skipLogo?: boolean;
    /** Softer logo when branding is kept (0–1). Default full opacity. */
    logoOpacity?: number;
  },
): Promise<string> {
  const baseBuffer = await fetchImageBuffer(imageUrl);

  const aspect = resolveEnhanceAspectRatio(options?.targetPlatform);
  const { width, height } = aspectToPixels(aspect, OUTPUT_LONG_EDGE);
  const corner = options?.logoCorner ?? "top-right";

  const cropped = await sharp(baseBuffer)
    .rotate()
    .resize(width, height, {
      fit: "cover",
      position: "centre",
      withoutEnlargement: false,
    })
    .toBuffer();

  if (options?.skipLogo) {
    const output = await sharp(cropped)
      .jpeg({
        quality: 90,
        mozjpeg: true,
        chromaSubsampling: "4:4:4",
      })
      .toBuffer();
    return uploadToFalStorage(output, "enhanced-natural.jpg", "image/jpeg");
  }

  const logoBuffer = await loadLogoBuffer();
  const padding = Math.max(14, Math.round(width * LOGO_PADDING_RATIO));
  const logoWidth = Math.max(44, Math.round(width * LOGO_WIDTH_RATIO));
  const opacity = options?.logoOpacity ?? LOGO_OPACITY;

  const logoResized = await sharp(logoBuffer)
    .resize({
      width: logoWidth,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();

  const logoFaded = await applyLogoOpacity(logoResized, opacity);
  const logoMeta = await sharp(logoFaded).metadata();
  const logoW = logoMeta.width ?? logoWidth;
  const left =
    corner === "top-left"
      ? padding
      : Math.max(0, width - logoW - padding);
  const top = padding;

  const output = await sharp(cropped)
    .composite([
      {
        input: logoFaded,
        top,
        left,
        blend: "over",
      },
    ])
    .jpeg({
      quality: 90,
      mozjpeg: true,
      chromaSubsampling: "4:4:4",
    })
    .toBuffer();

  return uploadToFalStorage(output, "enhanced-branded.jpg", "image/jpeg");
}
