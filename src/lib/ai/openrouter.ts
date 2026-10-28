import {
  MARKETING_SYSTEM_PROMPT,
  OPENROUTER_MODEL,
  OPENROUTER_URL,
  REVIEW_REPLY_SYSTEM_PROMPT,
  UNIFIED_CAMPAIGN_SYSTEM_PROMPT,
  WHATSAPP_BIO_SYSTEM_PROMPT,
} from "./constants";
import { buildIndustryIntentPromptBlock } from "./industry-intent";
import type {
  GeneratedBioContent,
  GeneratedPostContent,
  GeneratedReviewReply,
  GenerateBioRequest,
  GeneratePostRequest,
  GenerateReviewReplyRequest,
  UnifiedGenerateContent,
  UnifiedGenerateRequest,
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
  const hasPhoto = Boolean(input.referenceImage?.trim());
  return [
    `שם העסק: ${input.businessName}`,
    `תחום: ${input.industry}`,
    `מטרת הפוסט: ${input.postGoal}`,
    buildIndustryIntentPromptBlock(
      input.industry,
      input.postGoal,
      input.businessName,
    ),
    hasPhoto
      ? [
          "",
          "מצורפת תמונת עסק אמיתית שהמשתמש העלה.",
          "כתוב קופי עברי חד וממיר שמתאים בדיוק למה שרואים בתמונה + למטרת הפוסט.",
          "אל תמציא פרטים ויזואליים שלא נראים בתמונה.",
          "בשדה imagePrompt כתוב באנגלית תיאור קצר ומדויק של התמונה שהועלתה (לתיעוד בלבד, לא ליצירת תמונה חדשה), והתחל ב־user_uploaded_photo:",
        ].join("\n")
      : "",
    "",
    "החזר אך ורק אובייקט JSON תקין (בלי markdown ובלי הסברים) עם השדות:",
    "headline, instagramCaption, facebookCaption, imagePrompt",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

type ChatContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

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
    // Keep concept raw — Cultural Visual Expander runs at /api/generate-image.
    imagePrompt: (obj.imagePrompt as string).trim(),
  };
}

async function openRouterJsonChat(
  system: string,
  user: ChatContent,
  temperature = 0.7,
): Promise<unknown> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenRouterKey()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "OneLoop Social",
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

function buildVisionUserContent(input: GeneratePostRequest): ChatContent {
  const text = buildUserMessage(input);
  const image = input.referenceImage?.trim();
  if (!image) return text;

  return [
    { type: "text", text },
    { type: "image_url", image_url: { url: image } },
  ];
}

export async function generateMarketingPost(
  input: GeneratePostRequest,
): Promise<GeneratedPostContent> {
  return assertPostContent(
    await openRouterJsonChat(
      MARKETING_SYSTEM_PROMPT,
      buildVisionUserContent(input),
    ),
  );
}

function buildUnifiedUserMessage(input: UnifiedGenerateRequest): string {
  const hasPhoto = Boolean(input.referenceImage?.trim());
  const needFal = input.needFalImagePrompt !== false && !hasPhoto;
  return [
    `businessName: ${input.businessName}`,
    `industry: ${input.industry}`,
    `postGoal (facts only — NEVER echo verbatim as caption): ${input.postGoal}`,
    `needFalImagePrompt: ${needFal ? "true" : "false"}`,
    input.aiImageDescription?.trim()
      ? `aiImageDescription (user visual hint): ${input.aiImageDescription.trim()}`
      : "",
    buildIndustryIntentPromptBlock(
      input.industry,
      input.postGoal,
      input.businessName,
    ),
    "",
    "COPY RULES:",
    "- NEVER paste postGoal / smartPrompt as Instagram, Facebook, or WhatsApp text.",
    "- Rewrite into authentic platform-native voice (IG hook+2 paragraphs, FB community story+question, WA broadcast with reply CTA).",
    "- Instagram hashtags: 5–6 items in the hashtags array only.",
    hasPhoto
      ? [
          "",
          "A real business photo is attached. Tailor Hebrew copy to what is visible.",
          "Do not invent unseen visual details.",
          "falImagePrompt / imagePrompt: short English documentation starting with user_uploaded_photo:",
        ].join("\n")
      : [
          "",
          "No upload — falImagePrompt stub only (server injects locked visual).",
          "Forbid text/watermarks/logos/stamps in any visual description.",
        ].join("\n"),
    "",
    "Return the strict JSON object described in the system prompt.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function buildUnifiedVisionContent(
  input: UnifiedGenerateRequest,
): ChatContent {
  const text = buildUnifiedUserMessage(input);
  const image = input.referenceImage?.trim();
  if (!image) return text;
  return [
    { type: "text", text },
    { type: "image_url", image_url: { url: image } },
  ];
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t ? t : null;
}

function assertUnifiedContent(value: unknown): UnifiedGenerateContent {
  if (!value || typeof value !== "object") {
    throw new OpenRouterError("Invalid unified campaign payload", 502, value);
  }
  const root = value as Record<string, unknown>;
  const ig = root.instagram;
  const wa = root.whatsapp;

  if (!ig || typeof ig !== "object" || !wa || typeof wa !== "object") {
    throw new OpenRouterError(
      "Missing instagram or whatsapp blocks",
      502,
      value,
    );
  }

  const igObj = ig as Record<string, unknown>;
  const waObj = wa as Record<string, unknown>;

  const headline = asNonEmptyString(igObj.headline) ?? "";
  const caption = asNonEmptyString(igObj.caption);
  const ctaText = asNonEmptyString(igObj.ctaText);
  const lead = asNonEmptyString(waObj.leadIncomingMessage);
  const reply = asNonEmptyString(waObj.businessAutoReply);
  const action =
    asNonEmptyString(waObj.actionButton) ?? "המשך שיחה בוואטסאפ";
  const broadcast =
    asNonEmptyString(waObj.broadcastMessage) ??
    asNonEmptyString(waObj.businessAutoReply) ??
    "";

  const fbRoot = root.facebook;
  const fbCaption =
    fbRoot && typeof fbRoot === "object"
      ? asNonEmptyString((fbRoot as Record<string, unknown>).caption)
      : asNonEmptyString(root.facebookCaption);

  if (!caption || !ctaText || !lead || !reply) {
    throw new OpenRouterError(
      "Unified campaign missing required string fields",
      502,
      value,
    );
  }

  const hashtagsRaw = igObj.hashtags;
  const hashtags = Array.isArray(hashtagsRaw)
    ? hashtagsRaw
        .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
        .map((t) => (t.trim().startsWith("#") ? t.trim() : `#${t.trim()}`))
        .slice(0, 6)
    : [];

  const falImagePrompt =
    asNonEmptyString(root.falImagePrompt) ??
    asNonEmptyString(root.imagePrompt) ??
    "clean photograph, unbranded product photography, bright natural light, no stamps, no stickers, no watermarks, no graphic overlays";

  return {
    instagram: {
      headline: headline || caption.slice(0, 48),
      caption,
      hashtags,
      ctaText,
    },
    facebook: {
      caption: fbCaption || caption,
    },
    whatsapp: {
      broadcastMessage: broadcast || reply,
      leadIncomingMessage: lead,
      businessAutoReply: reply,
      actionButton: action,
    },
    falImagePrompt,
    imagePrompt: falImagePrompt,
  };
}

/** Homepage Smile Grid — one JSON with Instagram + WhatsApp + falImagePrompt. */
export async function generateUnifiedCampaign(
  input: UnifiedGenerateRequest,
): Promise<UnifiedGenerateContent> {
  return assertUnifiedContent(
    await openRouterJsonChat(
      UNIFIED_CAMPAIGN_SYSTEM_PROMPT,
      buildUnifiedVisionContent(input),
      0.75,
    ),
  );
}

/** Map unified payload → legacy GeneratedPostContent for older callers. */
export function unifiedToLegacyPost(
  unified: UnifiedGenerateContent,
): GeneratedPostContent {
  const tags = unified.instagram.hashtags.join(" ");
  const igBody = [unified.instagram.caption, tags].filter(Boolean).join("\n\n");
  return {
    headline: unified.instagram.headline,
    instagramCaption: igBody,
    facebookCaption:
      unified.facebook?.caption?.trim() ||
      [unified.instagram.caption, unified.instagram.ctaText]
        .filter(Boolean)
        .join("\n\n"),
    imagePrompt: unified.imagePrompt,
    ctaText: unified.instagram.ctaText,
    whatsappLeadMessage: unified.whatsapp.leadIncomingMessage,
    whatsappBusinessReply: unified.whatsapp.businessAutoReply,
    whatsappActionButton: unified.whatsapp.actionButton,
    falImagePrompt: unified.falImagePrompt,
  };
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
