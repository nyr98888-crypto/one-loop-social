import { NextResponse } from "next/server";
import { OpenRouterError, generateWhatsAppBio } from "@/lib/ai/openrouter";
import type { GenerateBioRequest } from "@/lib/ai/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** All card fields are optional — fill gentle defaults for the model. */
function parseBody(body: unknown): GenerateBioRequest | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;

  const businessName = asString(o.businessName) || asString(o.headline) || "העסק שלי";
  const services =
    asString(o.services) || asString(o.slogan) || asString(o.headline) || "שירותים מקצועיים";
  const serviceArea = asString(o.serviceArea) || "ישראל";
  const whatsappNumber = asString(o.whatsappNumber) || "0500000000";
  const openingHours = asString(o.openingHours) || "לפי תיאום מראש";

  return {
    businessName,
    services,
    serviceArea,
    whatsappNumber,
    openingHours,
  };
}

export async function POST(request: Request) {
  try {
    const body = parseBody(await request.json().catch(() => null));
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const bio = await generateWhatsAppBio(body);

    return NextResponse.json({
      ok: true,
      success: true,
      bio,
    });
  } catch (err) {
    if (err instanceof OpenRouterError) {
      return NextResponse.json(
        { error: err.message, details: err.details },
        { status: err.status },
      );
    }

    console.error("[generate-bio]", err);
    return NextResponse.json(
      { error: "Failed to generate WhatsApp bio" },
      { status: 500 },
    );
  }
}
