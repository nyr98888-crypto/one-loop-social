import {
  OPENROUTER_MODEL,
  OPENROUTER_URL,
} from "@/lib/ai/constants";
import { enrichImagePromptForGenerator } from "@/lib/ai/cultural-food-prompts";
import {
  INTERIOR_DESIGN_PHOTO_PREFIX,
  isInteriorDesignIndustry,
  resolveIndustryVisualPolicy,
  stripAccidentalPeopleTokens,
} from "@/lib/ai/industry-visual";
import type { MarketContext } from "@/lib/ai/types";
import { buildPrioritizedImageConcept } from "@/lib/ai/visual-priority";

export {
  parseMarketContext,
  resolveLockedPostImageSize,
  toFalImageSize,
  type LockedPostImageSize,
} from "@/lib/ai/image-aspect";

export class VisualExpandError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "VisualExpandError";
  }
}

export function buildVisualExpanderSystemPrompt(
  marketContext: MarketContext = "israeli_local",
  industry?: string | null,
  allowPeople = false,
): string {
  const interior = isInteriorDesignIndustry(industry);
  const categoryRules = interior
    ? `CATEGORY LOCK (Architecture / Interior Design / Décor / Real Estate):
- Default scene MUST be an empty professionally designed interior or architectural space.
- NEVER invent people, faces, portraits, models, or human figures unless AllowPeople=true.
- Preferred style tokens: ${INTERIOR_DESIGN_PHOTO_PREFIX}`
    : `CATEGORY: Match the business industry. Do not invent unrelated portraits or random people unless AllowPeople=true.`;

  return `You are an expert commercial photographer and prompt engineer.
Target Market Context: ${marketContext}
AllowPeople: ${allowPeople ? "true" : "false"}

TASK: Convert the user's post concept into a descriptive, realistic English visual prompt for an image generation model.

RULES:
1. User Visual Priority: If the input includes a "PRIMARY VISUAL SUBJECT" or any explicit scene description from the user, treat that as the main subject. Expand and refine it — do not replace it with a generic marketing scene.
2. Cultural & Regional Translation: If the concept mentions regional/cultural foods (Jachnun, Sabich, Shakshuka, etc.), describe physical appearance — never transliteration alone.
3. Zero Badge / Zero Text Policy: Never include 'award', 'medal', 'badge', 'logo', 'masterpiece', or 'stamp'.
4. Photography Specs: Bright, warm, high-key lighting; crisp detail. Never dim, moody, cinematic, or desaturated looks.
5. ${categoryRules}
6. Output: Return ONLY the final English photographic prompt string, nothing else.`;
}

function getOpenRouterKey(): string {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    throw new VisualExpandError(
      "Missing OPENROUTER_API_KEY environment variable",
      500,
    );
  }
  return key;
}

function stripWrappingQuotes(raw: string): string {
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  // Drop accidental markdown fences
  s = s.replace(/^```[\w]*\n?/i, "").replace(/\n?```$/i, "").trim();
  return s;
}

/**
 * Dedicated Cultural Visual Expander — LLM step before the image model.
 * Falls back to deterministic cultural enrichment if the LLM call fails.
 */
export async function expandVisualPrompt(input: {
  concept: string;
  /** Original post-goal text — used to prioritize user visual notes. */
  postGoal?: string;
  marketContext?: MarketContext;
  businessName?: string;
  industry?: string;
}): Promise<{ prompt: string; expanded: boolean; source: "llm" | "fallback" }> {
  const concept = buildPrioritizedImageConcept({
    prompt: input.concept,
    postGoal: input.postGoal,
    businessName: input.businessName,
  }).trim();
  const marketContext = input.marketContext ?? "israeli_local";
  if (!concept) {
    return { prompt: "", expanded: false, source: "fallback" };
  }

  const policy = resolveIndustryVisualPolicy({
    industry: input.industry,
    postGoal: input.postGoal,
    prompt: concept,
  });
  const allowPeople = policy.allowPeople;

  try {
    const userParts = [
      concept,
      input.businessName?.trim()
        ? `Business name: ${input.businessName.trim()}`
        : null,
      input.industry?.trim() ? `Industry: ${input.industry.trim()}` : null,
      `Market context: ${marketContext}`,
      `AllowPeople: ${allowPeople}`,
      "",
      "Prioritize any PRIMARY VISUAL SUBJECT above marketing copy.",
      policy.isInterior && !allowPeople
        ? `Use this visual style: ${INTERIOR_DESIGN_PHOTO_PREFIX}. Do NOT include any people or faces.`
        : `Apply style: ${policy.photoPrefix}`,
      "Avoid dim, moody, underexposed, or desaturated looks.",
      "Return ONLY the English photographic prompt.",
    ].filter(Boolean);

    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getOpenRouterKey()}`,
        "Content-Type": "application/json",
        // Headers must be Latin-1 ByteStrings — no em dashes / Hebrew here.
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "OneLoop Social",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL ?? OPENROUTER_MODEL,
        temperature: 0.55,
        messages: [
          {
            role: "system",
            content: buildVisualExpanderSystemPrompt(
              marketContext,
              input.industry,
              allowPeople,
            ),
          },
          { role: "user", content: userParts.join("\n") },
        ],
      }),
    });

    const data = (await res.json().catch(() => null)) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: unknown;
    } | null;

    if (!res.ok) {
      throw new VisualExpandError(
        "Visual expander request failed",
        res.status,
        data,
      );
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content?.trim()) {
      throw new VisualExpandError("Empty visual expander response", 502, data);
    }

    const expanded = stripWrappingQuotes(content);
    let sanitized = enrichImagePromptForGenerator(expanded);
    if (policy.isInterior && !allowPeople) {
      sanitized = stripAccidentalPeopleTokens(sanitized);
    }
    return {
      prompt: sanitized || expanded,
      expanded: true,
      source: "llm",
    };
  } catch (err) {
    console.warn("[visual-prompt-expander] falling back", err);
    let fallback = enrichImagePromptForGenerator(concept);
    if (policy.isInterior && !allowPeople) {
      fallback = [
        INTERIOR_DESIGN_PHOTO_PREFIX,
        stripAccidentalPeopleTokens(fallback),
      ]
        .filter(Boolean)
        .join(". ");
    }
    return {
      prompt: fallback,
      expanded: true,
      source: "fallback",
    };
  }
}
