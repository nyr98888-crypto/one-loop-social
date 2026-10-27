import { NextResponse } from "next/server";
import { runHealthChecks } from "@/lib/health/checks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/health — independent diagnostics for OpenRouter, FAL.ai, and Turso/libSQL.
 */
export async function GET() {
  try {
    const report = await runHealthChecks();
    return NextResponse.json(report, {
      status: report.ok ? 200 : 503,
    });
  } catch (err) {
    console.error("[health]", err);
    return NextResponse.json(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : "Health check failed",
      },
      { status: 500 },
    );
  }
}
