/**
 * One-shot startup diagnostics for LLM API keys (never logs secrets).
 */

let logged = false;

function summarizeKey(name: string, value: string | undefined): string {
  const v = value?.trim() ?? "";
  if (!v) return `${name}=MISSING`;
  if (
    v === "..." ||
    v.includes("your-") ||
    /^sk-or-v1-\.\.\.$/.test(v) ||
    /^sk-\.\.\.$/.test(v)
  ) {
    return `${name}=PLACEHOLDER(len=${v.length})`;
  }
  const looksValid =
    (name === "TOGETHER_API_KEY" && v.length >= 20) ||
    (name === "OPENROUTER_API_KEY" && v.startsWith("sk-or-") && v.length >= 40) ||
    v.length >= 20;
  return `${name}=${looksValid ? "OK" : "SUSPECT"}(len=${v.length}, prefix=${v.slice(0, 8)}…)`;
}

/** Call once from generate route / text-engine module load. */
export function logLlmEnvDiagnostics(scope = "llm"): void {
  if (logged) return;
  logged = true;
  const together = summarizeKey(
    "TOGETHER_API_KEY",
    process.env.TOGETHER_API_KEY,
  );
  const openrouter = summarizeKey(
    "OPENROUTER_API_KEY",
    process.env.OPENROUTER_API_KEY,
  );
  console.info(
    `[${scope}] env check @ startup → ${together} | ${openrouter} | NEXT_PUBLIC_APP_URL=${process.env.NEXT_PUBLIC_APP_URL?.trim() || "unset"}`,
  );
}
