import { NextResponse } from "next/server";
import {
  cleanExpiredDrafts,
  getVariantsBySession,
} from "@/lib/db/client";
import { purgeDraftVariantsBySession } from "@/lib/db/drafts";

export const runtime = "nodejs";

function readSessionId(request: Request, body?: unknown): string | null {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("sessionId")?.trim();
  if (fromQuery) return fromQuery;

  if (body && typeof body === "object") {
    const sessionId = (body as Record<string, unknown>).sessionId;
    if (typeof sessionId === "string" && sessionId.trim()) {
      return sessionId.trim();
    }
  }

  return null;
}

/** Fetch active draft variants for a session. */
export async function GET(request: Request) {
  try {
    await cleanExpiredDrafts();
    const sessionId = readSessionId(request);
    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId query param is required" },
        { status: 400 },
      );
    }

    const variants = await getVariantsBySession(sessionId);
    return NextResponse.json({ ok: true, sessionId, variants });
  } catch (err) {
    console.error("[draft-variants GET]", err);
    return NextResponse.json(
      { error: "Failed to load draft variants" },
      { status: 500 },
    );
  }
}

/** Purge all draft variants for a session (מחק והתחל מחדש). */
export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const sessionId = readSessionId(request, body);
    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 },
      );
    }

    const deleted = await purgeDraftVariantsBySession(sessionId);
    return NextResponse.json({ ok: true, sessionId, deleted });
  } catch (err) {
    console.error("[draft-variants DELETE]", err);
    return NextResponse.json(
      { error: "Failed to purge draft variants" },
      { status: 500 },
    );
  }
}
