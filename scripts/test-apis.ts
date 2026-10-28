/**
 * Standalone API verification (Together → OpenRouter GPT-4o → FAL).
 *
 * Run: npm run test:apis
 *  or: npx tsx --env-file=.env.local scripts/test-apis.ts
 *  or: npx tsx scripts/test-apis.ts   (loads .env.local itself)
 *
 * Does NOT import Next.js "server-only" modules.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal(): void {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvLocal();
  await import("./diagnostic-apis");
}

main().catch((err: unknown) => {
  console.error("Diagnostic failed:", err);
  process.exit(1);
});
