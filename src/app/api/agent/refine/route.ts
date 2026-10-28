import { NextResponse } from "next/server";
import {
  refineCampaignInPlace,
  type CampaignSnapshot,
} from "@/lib/ai/agent-refine";
import { TextEngineError } from "@/lib/ai/text-engine";

export const runtime = "nodejs";
export const maxDuration = 90;

function parseSnapshot(raw: unknown): CampaignSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const str = (k: string) =>
    typeof o[k] === "string" ? (o[k] as string) : "";
  return {
    businessName: str("businessName"),
    industry: str("industry"),
    headline: str("headline"),
    instagramCaption: str("instagramCaption"),
    facebookCaption: str("facebookCaption"),
    waBroadcastMessage: str("waBroadcastMessage"),
    igCtaText: str("igCtaText") || undefined,
    waActionButton: str("waActionButton") || undefined,
    imagePrompt: str("imagePrompt"),
    generatedImage: str("generatedImage"),
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      instruction?: unknown;
      snapshot?: unknown;
    } | null;

    const instruction =
      typeof body?.instruction === "string" ? body.instruction.trim() : "";
    const snapshot = parseSnapshot(body?.snapshot);

    if (!instruction || !snapshot) {
      return NextResponse.json(
        { error: "Expected instruction + campaign snapshot" },
        { status: 400 },
      );
    }

    const result = await refineCampaignInPlace(snapshot, instruction);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof TextEngineError) {
      return NextResponse.json(
        { error: err.message, details: err.details },
        { status: err.status },
      );
    }
    console.error("[agent/refine]", err);
    return NextResponse.json({ error: "Refine failed" }, { status: 500 });
  }
}
