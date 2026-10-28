import { NextResponse } from "next/server";
import { LLM_CASCADE } from "@/lib/ai/llm-cascade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checkTogether = Boolean(process.env.TOGETHER_API_KEY);
  const checkOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);
  const checkFal = Boolean(process.env.FAL_KEY);

  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      TOGETHER_API_KEY: checkTogether ? "CONFIGURED (OK)" : "MISSING",
      OPENROUTER_API_KEY: checkOpenRouter ? "CONFIGURED (OK)" : "MISSING",
      FAL_KEY: checkFal ? "CONFIGURED (OK)" : "MISSING",
    },
    routingMap: Object.fromEntries(
      LLM_CASCADE.map((s) => [
        `tier${s.tier}`,
        `${s.provider === "openrouter" ? "OpenRouter" : "Together AI"} (${s.model})`,
      ]),
    ),
    visual: "FAL AI (fal-ai/flux-pro/v1.1 → fal-ai/recraft-v3)",
    status:
      checkTogether && checkOpenRouter && checkFal ? "HEALTHY" : "DEGRADED",
  };

  return NextResponse.json(report, { status: 200 });
}
