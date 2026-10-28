/**
 * Heuristics for truncated / noisy / incomplete STT transcripts.
 * When unclear, the Marketing Agent asks the user to repeat.
 */
export function isAmbiguousTranscript(
  text: string,
  opts?: { confidence?: number | null },
): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return true;

  if (typeof opts?.confidence === "number" && opts.confidence < 0.55) {
    return true;
  }

  // Too short to be a useful refinement / prompt
  if (t.length < 4) return true;

  // Hebrew / Latin letter count too low relative to noise
  const letters = (t.match(/[\u0590-\u05FFa-zA-Z]/g) ?? []).length;
  if (letters < 3) return true;

  // Ends with dangling connector / mid-thought Hebrew particles
  if (/(?:\s|^)(ו|של|את|עם|על|ב|ל|מ|כ|ש|אני|רוצה|תעשה|תוסיף)\s*$/i.test(t)) {
    return true;
  }

  // Truncation ellipsis / cut-off patterns
  if (/(\.\.\.|…|—|-)\s*$/.test(t) && t.length < 40) return true;

  // Heavy repeated characters (noise garble)
  if (/(.)\1{5,}/.test(t)) return true;

  // Mostly non-word symbols
  const symbols = (t.match(/[^\u0590-\u05FFa-zA-Z0-9\s.,!?'"״׳\-]/g) ?? [])
    .length;
  if (symbols > letters) return true;

  return false;
}
