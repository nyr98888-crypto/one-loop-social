/**
 * Shared 2-tier LLM cascade — every outbound chat call walks this list until
 * one model returns usable content. In-provider first, then cross-provider.
 *
 * Tier 1 (OpenRouter OpenAI):
 *   1A gpt-4o → 1B gpt-4o-mini → 1C gpt-4.1-mini
 * Tier 2 (Together serverless only):
 *   2A DeepSeek-V4.1-Flash → 2B Qwen3.5-9B
 *
 * Note: meta-llama/*-70B-Instruct-Turbo requires a dedicated Together endpoint
 * and returns 400 on this account — do not use it in the cascade.
 */

export type CascadeProvider = "openrouter" | "together";
export type CascadeTierId = "1A" | "1B" | "1C" | "2A" | "2B";

export const OPENROUTER_CHAT_URL =
  "https://openrouter.ai/api/v1/chat/completions";
export const TOGETHER_CHAT_URL =
  "https://api.together.xyz/v1/chat/completions";

export const TIER1_TIMEOUT_MS = 8_000;
export const TIER2_TIMEOUT_MS = 12_000;

export const LLM_CASCADE: ReadonlyArray<{
  tier: CascadeTierId;
  provider: CascadeProvider;
  model: string;
  timeoutMs: number;
  label: string;
}> = [
  {
    tier: "1A",
    provider: "openrouter",
    model: "openai/gpt-4o",
    timeoutMs: TIER1_TIMEOUT_MS,
    label: "Tier 1A OpenAI GPT-4o",
  },
  {
    tier: "1B",
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    timeoutMs: TIER1_TIMEOUT_MS,
    label: "Tier 1B OpenAI GPT-4o-mini",
  },
  {
    tier: "1C",
    provider: "openrouter",
    model: "openai/gpt-4.1-mini",
    timeoutMs: TIER1_TIMEOUT_MS,
    label: "Tier 1C OpenAI GPT-4.1-mini",
  },
  {
    tier: "2A",
    provider: "together",
    model: "deepseek-ai/DeepSeek-V4.1-Flash",
    timeoutMs: TIER2_TIMEOUT_MS,
    label: "Tier 2A DeepSeek-V4.1-Flash",
  },
  {
    tier: "2B",
    provider: "together",
    model: "Qwen/Qwen3.5-9B",
    timeoutMs: TIER2_TIMEOUT_MS,
    label: "Tier 2B Qwen3.5-9B",
  },
] as const;

export type CascadeFailure = {
  kind:
    | "timeout"
    | "network"
    | "http5xx"
    | "http4xx"
    | "parse"
    | "empty"
    | "missing_key";
  status?: number;
  message: string;
  body?: unknown;
  tier: CascadeTierId;
  model: string;
};

export class CascadeExhaustedError extends Error {
  constructor(
    message: string,
    public failures: CascadeFailure[],
  ) {
    super(message);
    this.name = "CascadeExhaustedError";
  }
}

export interface CascadeChatResult {
  content: string;
  provider: CascadeProvider;
  model: string;
  tier: CascadeTierId;
  durationMs: number;
}

/**
 * Walk every cascade step until one returns content.
 * Optional `accept` may throw to reject bad JSON/shape and continue the cascade.
 */
export async function runChatCascade(opts: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  /** Return true / void to accept; throw to reject and try next model. */
  accept?: (content: string) => void;
}): Promise<CascadeChatResult> {
  const temperature = opts.temperature ?? 0.7;
  const maxTokens = opts.maxTokens ?? 2000;
  const failures: CascadeFailure[] = [];

  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim() || null;
  const togetherKey = process.env.TOGETHER_API_KEY?.trim() || null;

  for (const step of LLM_CASCADE) {
    const apiKey =
      step.provider === "openrouter" ? openRouterKey : togetherKey;

    if (!apiKey) {
      failures.push({
        kind: "missing_key",
        message:
          step.provider === "openrouter"
            ? "Missing OPENROUTER_API_KEY"
            : "Missing TOGETHER_API_KEY",
        tier: step.tier,
        model: step.model,
      });
      console.warn(`[llm-cascade] skip ${step.label} — missing key`);
      continue;
    }

    console.log(
      `[llm-cascade] trying ${step.label} (${step.model}, ${step.timeoutMs}ms)…`,
    );

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), step.timeoutMs);
    const started = Date.now();

    try {
      const res = await fetch(
        step.provider === "openrouter"
          ? OPENROUTER_CHAT_URL
          : TOGETHER_CHAT_URL,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            ...(step.provider === "openrouter"
              ? {
                  "HTTP-Referer":
                    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
                  "X-Title": "OneLoop Social",
                }
              : {}),
          },
          body: JSON.stringify({
            model: step.model,
            messages: [
              { role: "system", content: opts.system },
              { role: "user", content: opts.user },
            ],
            temperature,
            max_tokens: maxTokens,
          }),
          signal: controller.signal,
        },
      );

      const durationMs = Date.now() - started;
      const rawBody = await res.text();
      let parsed: unknown = null;
      try {
        parsed = rawBody ? JSON.parse(rawBody) : null;
      } catch {
        parsed = rawBody;
      }

      if (!res.ok) {
        failures.push({
          kind: res.status >= 500 ? "http5xx" : "http4xx",
          status: res.status,
          message: `HTTP ${res.status}`,
          body: parsed,
          tier: step.tier,
          model: step.model,
        });
        console.error(
          `[llm-cascade] ${step.label} failed (HTTP ${res.status})`,
        );
        continue;
      }

      const data = parsed as {
        choices?: Array<{ message?: { content?: string | null } }>;
      } | null;
      const content = data?.choices?.[0]?.message?.content;
      if (!content?.trim()) {
        failures.push({
          kind: "empty",
          message: "Empty model content",
          body: parsed,
          tier: step.tier,
          model: step.model,
        });
        console.error(`[llm-cascade] ${step.label} empty content`);
        continue;
      }

      try {
        opts.accept?.(content);
      } catch (acceptErr) {
        failures.push({
          kind: "parse",
          message:
            acceptErr instanceof Error
              ? acceptErr.message
              : String(acceptErr),
          tier: step.tier,
          model: step.model,
        });
        console.error(
          `[llm-cascade] ${step.label} rejected content — next model`,
        );
        continue;
      }

      console.log("✅ Served by:", step.model, "in", durationMs, "ms");
      return {
        content,
        provider: step.provider,
        model: step.model,
        tier: step.tier,
        durationMs,
      };
    } catch (err) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      failures.push({
        kind: isAbort ? "timeout" : "network",
        message: isAbort
          ? `Timed out after ${step.timeoutMs}ms`
          : err instanceof Error
            ? err.message
            : String(err),
        tier: step.tier,
        model: step.model,
      });
      console.error(
        `[llm-cascade] ${step.label} failed:`,
        failures[failures.length - 1]?.message,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  throw new CascadeExhaustedError("All cascade tiers failed", failures);
}
