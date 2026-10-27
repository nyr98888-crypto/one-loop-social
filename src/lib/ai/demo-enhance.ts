/** Distinctive high-res demo URLs for dual-flavor toggle in test/dev mode. */
export const DEMO_ENHANCE_NATURAL_URL =
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85";

export const DEMO_ENHANCE_STUDIO_URL =
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=85";

/**
 * True when FAL is unavailable / explicitly in demo — skip live calls.
 * Keys named `test`, `test_*`, or empty, or `FAL_DEMO=1`.
 */
export function isFalDemoMode(): boolean {
  if (process.env.FAL_DEMO === "1" || process.env.FAL_DEMO === "true") {
    return true;
  }
  const key = process.env.FAL_KEY?.trim() ?? "";
  if (!key) return true;
  const lower = key.toLowerCase();
  return (
    lower === "test" ||
    lower.startsWith("test_") ||
    lower.startsWith("sk-test") ||
    lower.includes("demo")
  );
}
