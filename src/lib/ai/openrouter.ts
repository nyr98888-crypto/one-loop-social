import {
  MARKETING_SYSTEM_PROMPT,
  OPENROUTER_MODEL,
  OPENROUTER_URL,
  REVIEW_REPLY_SYSTEM_PROMPT,
  WHATSAPP_BIO_SYSTEM_PROMPT,
} from "./constants";
import type {
  GeneratedBioContent,
  GeneratedPostContent,
  GeneratedReviewReply,
  GenerateBioRequest,
  GeneratePostRequest,
  GenerateReviewReplyRequest,
} from "./types";
import { buildWaMeLink } from "./whatsapp";

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

async function openRouterJsonChat(
  system: string,
  user: string,
  temperature = 0.7,
): Promise<unknown> {
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
      temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
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

  return extractJsonObject(content);
}

export async function generateMarketingPost(
  input: GeneratePostRequest,
): Promise<GeneratedPostContent> {
  return assertPostContent(
    await openRouterJsonChat(MARKETING_SYSTEM_PROMPT, buildUserMessage(input)),
  );
}

function buildBioUserMessage(input: GenerateBioRequest): string {
  return [
    `שם העסק: ${input.businessName}`,
    `שירותים מובילים: ${input.services}`,
    `כתובת / אזור פעילות: ${input.serviceArea}`,
    `מספר וואטסאפ: ${input.whatsappNumber}`,
    `שעות פתיחה: ${input.openingHours}`,
    "",
    "החזר JSON עם: bio, tagline, greeting",
  ].join("\n");
}

function assertBioContent(
  value: unknown,
  whatsappNumber: string,
): GeneratedBioContent {
  if (!value || typeof value !== "object") {
    throw new OpenRouterError("Invalid bio payload shape", 502, value);
  }

  const obj = value as Record<string, unknown>;
  for (const key of ["bio", "tagline", "greeting"] as const) {
    if (typeof obj[key] !== "string" || !obj[key].trim()) {
      throw new OpenRouterError(`Missing or empty field: ${key}`, 502, value);
    }
  }

  const greeting = (obj.greeting as string).trim();
  const waMeLink = buildWaMeLink(whatsappNumber, greeting) ?? "";

  return {
    bio: (obj.bio as string).trim(),
    tagline: (obj.tagline as string).trim(),
    greeting,
    waMeLink,
  };
}

export async function generateWhatsAppBio(
  input: GenerateBioRequest,
): Promise<GeneratedBioContent> {
  return assertBioContent(
    await openRouterJsonChat(
      WHATSAPP_BIO_SYSTEM_PROMPT,
      buildBioUserMessage(input),
      0.65,
    ),
    input.whatsappNumber,
  );
}

function buildReviewReplyUserMessage(input: GenerateReviewReplyRequest): string {
  const platformLabel = input.platform === "easy" ? "איזי (easy)" : "Google";
  return [
    input.businessName?.trim()
      ? `שם העסק: ${input.businessName.trim()}`
      : null,
    `פלטפורמה: ${platformLabel}`,
    `שם הלקוח: ${input.customerName}`,
    `דירוג: ${input.rating}/5`,
    `טקסט הביקורת: ${input.reviewText}`,
    "",
    "החזר JSON עם: reply",
  ]
    .filter(Boolean)
    .join("\n");
}

function assertReviewReply(value: unknown): GeneratedReviewReply {
  if (!value || typeof value !== "object") {
    throw new OpenRouterError("Invalid review-reply payload shape", 502, value);
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj.reply !== "string" || !obj.reply.trim()) {
    throw new OpenRouterError("Missing or empty field: reply", 502, value);
  }
  return { reply: obj.reply.trim() };
}

export async function generateReviewReply(
  input: GenerateReviewReplyRequest,
): Promise<GeneratedReviewReply> {
  return assertReviewReply(
    await openRouterJsonChat(
      REVIEW_REPLY_SYSTEM_PROMPT,
      buildReviewReplyUserMessage(input),
      0.7,
    ),
  );
}
