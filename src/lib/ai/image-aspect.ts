import type { MarketContext } from "@/lib/ai/types";

/** Only allow 1:1 or 4:5 for post image generation. */
export type LockedPostImageSize = "square_hd" | "portrait_4_5";

/**
 * Lock post image generation to 1:1 (`square_hd`) or 4:5 (`portrait_4_5`).
 * Instagram → 1:1; other platforms / explicit 4:5 → portrait.
 */
export function resolveLockedPostImageSize(
  requested?: string | null,
  platform?: string | null,
): LockedPostImageSize {
  const size = (requested ?? "").trim().toLowerCase();
  const p = (platform ?? "").trim().toLowerCase();

  if (
    size === "portrait_4_5" ||
    size === "4:5" ||
    size === "portrait"
  ) {
    return "portrait_4_5";
  }
  if (size === "square_hd" || size === "square" || size === "1:1") {
    return "square_hd";
  }
  if (p === "instagram") return "square_hd";
  if (
    p === "facebook" ||
    p === "google" ||
    p === "easy" ||
    p === "linkedin" ||
    p === "whatsapp"
  ) {
    return "portrait_4_5";
  }
  return "square_hd";
}

/** FAL image_size payload — enum or custom WH for 4:5. */
export function toFalImageSize(
  locked: LockedPostImageSize,
): string | { width: number; height: number } {
  if (locked === "portrait_4_5") {
    return { width: 1080, height: 1350 };
  }
  return "square_hd";
}

export function parseMarketContext(value: unknown): MarketContext {
  if (value === "global") return "global";
  return "israeli_local";
}
