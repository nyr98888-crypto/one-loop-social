import "server-only";

import {
  cleanExpiredDrafts,
  getVariantsBySession,
} from "@/lib/db/client";
import type { PostDraftVariantRow } from "@/lib/db/schema";
import {
  DraftSessionLimitError,
  MAX_VARIANTS_PER_SESSION,
} from "./draft-constants";

export {
  MAX_VARIANTS_PER_SESSION,
  MAX_VARIANTS_ERROR_HE,
  DraftSessionLimitError,
} from "./draft-constants";

/**
 * Run 24h draft cleanup, then assert the session can accept another variant.
 * Returns current variants so callers can compute nextIndex = length + 1.
 */
export async function prepareDraftSession(
  sessionId: string,
): Promise<PostDraftVariantRow[]> {
  await cleanExpiredDrafts();
  const existing = await getVariantsBySession(sessionId);
  if (existing.length >= MAX_VARIANTS_PER_SESSION) {
    throw new DraftSessionLimitError();
  }
  return existing;
}
