import { logLlmEnvDiagnostics } from "./env-debug";
import {
  CascadeExhaustedError,
  LLM_CASCADE,
  OPENROUTER_CHAT_URL,
  TIER1_TIMEOUT_MS,
  TIER2_TIMEOUT_MS,
  TOGETHER_CHAT_URL,
  runChatCascade,
  type CascadeProvider,
  type CascadeTierId,
} from "./llm-cascade";
import type { UnifiedGenerateContent } from "./types";

export {
  LLM_CASCADE,
  OPENROUTER_CHAT_URL,
  TIER1_TIMEOUT_MS,
  TIER2_TIMEOUT_MS,
  TOGETHER_CHAT_URL,
};

export const TOGETHER_MODEL = "deepseek-ai/DeepSeek-V4.1-Flash";
export const TOGETHER_BASE_URL = "https://api.together.xyz/v1";
/** @deprecated not serverless on Together — kept for reference only */
export const TOGETHER_LLAMA_MODEL =
  "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo";

export const OPENROUTER_PRIMARY_MODEL = "openai/gpt-4o";
export const OPENROUTER_SECONDARY_MODEL = "openai/gpt-4o-mini";
export const OPENROUTER_FALLBACK_MODEL = OPENROUTER_PRIMARY_MODEL;
export const OPENROUTER_FLAGSHIP_MODEL = OPENROUTER_PRIMARY_MODEL;
export const PRIMARY_TIMEOUT_MS = TIER1_TIMEOUT_MS;

logLlmEnvDiagnostics("text-engine");

export class TextEngineError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "TextEngineError";
  }
}

export interface TextEngineCampaign {
  businessName: string;
  industry: string;
  instagram: { caption: string; ctaButton: string };
  facebook: { caption: string; ctaButton: string };
  whatsappBroadcast: { message: string; ctaButton: string };
  falImagePrompt?: string;
}

export type TextEngineProvider = CascadeProvider;
export type { CascadeTierId };

export interface TextEngineResult {
  campaign: TextEngineCampaign;
  provider: TextEngineProvider;
  model: string;
  tier: CascadeTierId;
  durationMs: number;
}

const STANDARD_ENGINE_SYSTEM =
  'You are a top-tier marketing strategist and creative copywriter. Output strictly valid raw JSON without any markdown formatting. Schema: { "instagram": string, "facebook": string, "whatsapp": string, "image_prompt": string }';

/** Strip ```json / ``` fences then JSON.parse. */
export function parseResilientJson(raw: string): unknown {
  let text = raw.trim();
  text = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new TextEngineError("Model response was not valid JSON", 502, raw);
    }
    return JSON.parse(match[0]);
  }
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t ? t : null;
}

export function assertTextEngineCampaign(
  value: unknown,
  hints?: { businessName?: string; industry?: string; lockedCta?: string },
): TextEngineCampaign {
  if (!value || typeof value !== "object") {
    throw new TextEngineError("Invalid campaign payload shape", 502, value);
  }
  const root = value as Record<string, unknown>;
  const cta = hints?.lockedCta?.trim() || "לפרטים בוואטסאפ";

  let igCaption: string | null = null;
  let fbCaption: string | null = null;
  let waMessage: string | null = null;
  let igCta = cta;
  let fbCta = cta;
  let waCta = cta;

  if (typeof root.instagram === "string") {
    igCaption = asNonEmptyString(root.instagram);
  } else if (root.instagram && typeof root.instagram === "object") {
    const ig = root.instagram as Record<string, unknown>;
    igCaption = asNonEmptyString(ig.caption);
    igCta = asNonEmptyString(ig.ctaButton) ?? cta;
  }

  if (typeof root.facebook === "string") {
    fbCaption = asNonEmptyString(root.facebook);
  } else if (root.facebook && typeof root.facebook === "object") {
    const fb = root.facebook as Record<string, unknown>;
    fbCaption = asNonEmptyString(fb.caption);
    fbCta = asNonEmptyString(fb.ctaButton) ?? cta;
  }

  if (typeof root.whatsapp === "string") {
    waMessage = asNonEmptyString(root.whatsapp);
  } else if (
    root.whatsappBroadcast &&
    typeof root.whatsappBroadcast === "object"
  ) {
    const wa = root.whatsappBroadcast as Record<string, unknown>;
    waMessage = asNonEmptyString(wa.message);
    waCta = asNonEmptyString(wa.ctaButton) ?? cta;
  }

  const falImagePrompt =
    asNonEmptyString(root.image_prompt) ??
    asNonEmptyString(root.falImagePrompt) ??
    undefined;

  if (!igCaption || !fbCaption || !waMessage) {
    throw new TextEngineError(
      "Campaign JSON missing instagram/facebook/whatsapp strings",
      502,
      value,
    );
  }

  return {
    businessName:
      asNonEmptyString(root.businessName) ??
      hints?.businessName?.trim() ??
      "העסק שלי",
    industry:
      asNonEmptyString(root.industry) ??
      hints?.industry?.trim() ??
      "עסק מקומי",
    instagram: { caption: igCaption, ctaButton: igCta },
    facebook: { caption: fbCaption, ctaButton: fbCta },
    whatsappBroadcast: { message: waMessage, ctaButton: waCta },
    falImagePrompt,
  };
}

function extractHashtags(caption: string): string[] {
  const matches = caption.match(/#[\w\u0590-\u05FF]+/g) ?? [];
  return [...new Set(matches.map((t) => t.trim()))].slice(0, 6);
}

function firstHookLine(caption: string, fallback: string): string {
  const line = caption
    .split(/\n+/)
    .map((l) => l.trim())
    .find(Boolean);
  if (!line) return fallback;
  return line.length > 64 ? `${line.slice(0, 61)}…` : line;
}

export function textEngineToUnified(
  campaign: TextEngineCampaign,
  opts?: {
    lockedCta?: string;
    lockedWhatsappCta?: string;
    falImagePrompt?: string;
  },
): UnifiedGenerateContent {
  const hashtags = extractHashtags(campaign.instagram.caption);
  const fal =
    campaign.falImagePrompt?.trim() ||
    opts?.falImagePrompt?.trim() ||
    "physical subject, tactile textures, natural window light, shallow depth of field, sharp focus, real photograph";

  return {
    instagram: {
      headline: firstHookLine(
        campaign.instagram.caption,
        campaign.businessName,
      ),
      caption: campaign.instagram.caption,
      hashtags,
      ctaText: opts?.lockedCta?.trim() || campaign.instagram.ctaButton,
    },
    facebook: { caption: campaign.facebook.caption },
    whatsapp: {
      broadcastMessage: campaign.whatsappBroadcast.message,
      leadIncomingMessage: "",
      businessAutoReply: "",
      actionButton:
        opts?.lockedWhatsappCta?.trim() ||
        campaign.whatsappBroadcast.ctaButton,
    },
    falImagePrompt: fal,
    imagePrompt: fal,
  };
}

function buildUserPrompt(
  rawInput: string,
  hints?: {
    businessName?: string;
    industry?: string;
    lockedCta?: string;
  },
): string {
  return [
    "Create elite Hebrew social copy + English image_prompt from this free-form brief.",
    "Keep every concrete business detail (city, brands, specialties, offers).",
    "Never paste the brief verbatim as a caption.",
    "",
    "BRIEF:",
    rawInput.trim(),
    hints?.businessName ? `Hint businessName: ${hints.businessName}` : "",
    hints?.industry ? `Hint industry: ${hints.industry}` : "",
    hints?.lockedCta ? `Prefer CTA near: ${hints.lockedCta}` : "",
    "",
    'Return ONLY raw JSON: { "instagram": string, "facebook": string, "whatsapp": string, "image_prompt": string }',
  ]
    .filter((l) => l !== "")
    .join("\n");
}

/**
 * Generate campaign copy via the shared cascade.
 * Continues to the next model on timeout / HTTP / empty / bad JSON.
 * Throws only when every tier is exhausted — never mock copy.
 */
export async function generateCampaignCopy(input: {
  rawInput: string;
  businessName?: string;
  industry?: string;
  lockedCta?: string;
}): Promise<TextEngineResult> {
  logLlmEnvDiagnostics("text-engine");

  const userPrompt = buildUserPrompt(input.rawInput, {
    businessName: input.businessName,
    industry: input.industry,
    lockedCta: input.lockedCta,
  });
  const hints = {
    businessName: input.businessName,
    industry: input.industry,
    lockedCta: input.lockedCta,
  };

  let campaign: TextEngineCampaign | null = null;

  try {
    const served = await runChatCascade({
      system: STANDARD_ENGINE_SYSTEM,
      user: userPrompt,
      temperature: 0.7,
      maxTokens: 2000,
      accept: (content) => {
        campaign = assertTextEngineCampaign(
          parseResilientJson(content),
          hints,
        );
      },
    });

    if (!campaign) {
      throw new TextEngineError("Cascade returned without campaign", 500);
    }

    return {
      campaign,
      provider: served.provider,
      model: served.model,
      tier: served.tier,
      durationMs: served.durationMs,
    };
  } catch (err) {
    if (err instanceof CascadeExhaustedError) {
      throw new TextEngineError("All cascade tiers failed", 500, {
        cascadeErrors: err.failures,
        openRouterError:
          err.failures.find((e) => e.model.startsWith("openai/")) ?? null,
        togetherError:
          err.failures.find((e) => !e.model.startsWith("openai/")) ?? null,
      });
    }
    throw err;
  }
}
