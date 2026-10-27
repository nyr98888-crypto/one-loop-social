import { NextResponse } from "next/server";
import { isGoogleAuthConfigured } from "@/lib/auth/config";

export const runtime = "nodejs";

/** Lightweight probe so the login modal can show Google vs pending state. */
export async function GET() {
  return NextResponse.json({
    googleEnabled: isGoogleAuthConfigured(),
  });
}
