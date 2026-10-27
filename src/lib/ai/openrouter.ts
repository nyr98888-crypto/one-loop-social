import {
  MARKETING_SYSTEM_PROMPT,
  OPENROUTER_MODEL,
  OPENROUTER_URL,
} from "./constants";
import type { GeneratedPostContent, GeneratePostRequest } from "./types";

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

function getOpenRouterKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new OpenRouterError(
      "Missing OPENROUTER_API_KEY environment variable",
      500,
    );
  }
  return key;
}

function buildUserMessage(input: GeneratePostRequest): string {
  return [
    `שם העסק: ${input.businessName}`,
    `תחום: ${input.industry}`,
    `מטרת הפוסט: ${input.postGoal}`,
    "",
    "החזר אך ורק אובייקט JSON תקין (בלי markdown ובלי הסברים) עם השדות:",
    "headline, instagramCaption, facebookCaption, imagePrompt",
  ].join("\n");
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new OpenRouterError("Model response was not valid JSON", 502, raw);
    }
    return JSON.parse(match[0]);
  }
}

function assertPostContent(value: unknown): GeneratedPostContent {
  if (!value || typeof value !== "object") {
    throw new OpenRouterError("Invalid post payload shape", 502, value);
  }

  const obj = value as Record<string, unknown>;
  const required = [
    "headline",
    "instagramCaption",
    "facebookCaption",
    "imagePrompt",
  ] as const;

  for (const key of required) {
    if (typeof obj[key] !== "string" || !obj[key].trim()) {
      throw new OpenRouterError(`Missing or empty field: ${key}`, 502, value);
    }
  }

  return {
    headline: (obj.headline as string).trim(),
    instagramCaption: (obj.instagramCaption as string).trim(),
    facebookCaption: (obj.facebookCaption as string).trim(),
    imagePrompt: (obj.imagePrompt as string).trim(),
  };
}

export async function generateMarketingPost(
  input: GeneratePostRequest,
): Promise<GeneratedPostContent> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenRouterKey()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "One Loop Social",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? OPENROUTER_MODEL,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: MARKETING_SYSTEM_PROMPT },
        { role: "user", content: buildUserMessage(input) },
      ],
    }),
  });

  const data = (await res.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: unknown;
  } | null;

  if (!res.ok) {
    throw new OpenRouterError("OpenRouter request failed", res.status, data);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new OpenRouterError("Empty OpenRouter response", 502, data);
  }

  return assertPostContent(extractJsonObject(content));
}
