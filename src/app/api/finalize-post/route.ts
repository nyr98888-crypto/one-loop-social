import { NextResponse } from "next/server";
import { cleanExpiredDrafts, initDb } from "@/lib/db/client";
import {
  commitDraftVariant,
  purgeDraftVariantsBySession,
} from "@/lib/db/drafts";

export const runtime = "nodejs";

export type FinalizeAction = "commit" | "discard";

export interface FinalizePostRequest {
  action: FinalizeAction;
  sessionId: string;
  selectedVariantId?: string;
  businessId?: string;
}

function parseBody(body: unknown): FinalizePostRequest | null {
  if (!body || typeof body !== "object") return null;
  const { action, sessionId, selectedVariantId, businessId } = body as Record<
    string,
    unknown
  >;

  if (action !== "commit" && action !== "discard") return null;
  if (typeof sessionId !== "string" || !sessionId.trim()) return null;

  const parsed: FinalizePostRequest = {
    action,
    sessionId: sessionId.trim(),
  };

  if (typeof selectedVariantId === "string" && selectedVariantId.trim()) {
    parsed.selectedVariantId = selectedVariantId.trim();
  }
  if (typeof businessId === "string" && businessId.trim()) {
    parsed.businessId = businessId.trim();
  }

  return parsed;
}

/**
 * Commit a winning draft variant to permanent `posts` (and purge drafts),
 * or discard the whole session's temporary drafts.
 */
export async function POST(request: Request) {
  try {
    const body = parseBody(await request.json().catch(() => null));
    if (!body) {
      return NextResponse.json(
        {
          error:
            "Expected JSON with action ('commit'|'discard') and sessionId",
        },
        { status: 400 },
      );
    }

    await initDb();
    await cleanExpiredDrafts();

    if (body.action === "discard") {
      await purgeDraftVariantsBySession(body.sessionId);
      return NextResponse.json({ success: true, discarded: true });
    }

    // action === 'commit'
    if (!body.selectedVariantId) {
      return NextResponse.json(
        { error: "selectedVariantId is required when action is 'commit'" },
        { status: 400 },
      );
    }

    try {
      const { savedPostId } = await commitDraftVariant({
        sessionId: body.sessionId,
        selectedVariantId: body.selectedVariantId,
        businessId: body.businessId,
      });

      return NextResponse.json({ success: true, savedPostId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Commit failed";
      const status =
        message.includes("not found") || message.includes("does not belong")
          ? 404
          : 400;
      return NextResponse.json({ error: message }, { status });
    }
  } catch (err) {
    console.error("[finalize-post]", err);
    return NextResponse.json(
      { error: "Failed to finalize post" },
      { status: 500 },
    );
  }
}
