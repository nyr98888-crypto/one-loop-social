/**
 * Draft-variant constants shared between server helpers and client components.
 * This file must stay free of any database / server-only imports so it can be
 * safely bundled into client chunks.
 */

export const MAX_VARIANTS_PER_SESSION = 4;

export const MAX_VARIANTS_ERROR_HE =
  "הגעת למקסימום 4 גרסאות לפוסט זה. בחר גרסה או אפס.";

export class DraftSessionLimitError extends Error {
  readonly status = 400;

  constructor(message = MAX_VARIANTS_ERROR_HE) {
    super(message);
    this.name = "DraftSessionLimitError";
  }
}
