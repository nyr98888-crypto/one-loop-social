const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export function isAcceptedImageFile(file: File): boolean {
  if (ACCEPTED_TYPES.has(file.type)) return true;
  // Some browsers omit type — fall back to extension.
  return /\.(jpe?g|png|webp)$/i.test(file.name);
}

/**
 * Read a local image file into a compressed data URL suitable for
 * live preview + OpenRouter vision (keeps localStorage / payloads lean).
 */
export async function fileToCompressedDataUrl(
  file: File,
  maxEdge = 1280,
  quality = 0.85,
): Promise<string> {
  if (!isAcceptedImageFile(file)) {
    throw new Error("נא להעלות JPG, PNG או WebP בלבד");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("הקובץ גדול מדי (מקסימום 12MB)");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, maxEdge);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("לא ניתן לעבד את התמונה");
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function fitWithin(w: number, h: number, maxEdge: number) {
  if (w <= maxEdge && h <= maxEdge) return { width: w, height: h };
  const scale = maxEdge / Math.max(w, h);
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("קריאת התמונה נכשלה"));
    img.src = src;
  });
}
