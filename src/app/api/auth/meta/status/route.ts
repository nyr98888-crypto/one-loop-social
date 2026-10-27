import { NextResponse } from "next/server";
import { isMetaAuthConfigured } from "@/lib/auth/meta";
import { isGoogleAuthConfigured } from "@/lib/auth/config";

export const runtime = "nodejs";

/** Probe so Connect Center can show stub vs real OAuth affordances. */
export async function GET() {
  return NextResponse.json({
    metaEnabled: isMetaAuthConfigured(),
    googleBusinessEnabled: isGoogleAuthConfigured(),
  });
}
