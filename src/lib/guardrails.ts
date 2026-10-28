import { z } from "zod";
import type {
  UnifiedGenerateContent,
  UnifiedGenerateRequest,
  UnifiedInstagramBlock,
  UnifiedWhatsAppBlock,
} from "@/lib/ai/types";
import {
  buildDictionaryCopyHints,
  dictionaryCategoryToDomain,
  findIsraeliMatch,
  type MatchResult,
} from "@/lib/israeliDictionary";
import { compileAndLintFalPrompt } from "@/lib/visualCompiler";

/* -------------------------------------------------------------------------- */
/*  Strict schemas & interfaces                                               */
/* -------------------------------------------------------------------------- */

export const ImageSourceSchema = z.enum(["ai", "upload"]);
export type ImageSource = z.infer<typeof ImageSourceSchema>;

export const DomainIntentSchema = z.enum([
  "food",
  "beauty",
  "services",
  "retail",
  "generic",
]);
export type DomainIntent = z.infer<typeof DomainIntentSchema>;

export const GenerationPayloadSchema = z.object({
  businessName: z.string().trim().min(1),
  industry: z.string().trim().min(1).default("עסק מקומי"),
  /** Unified smart prompt / offer intent (preferred single field). */
  postGoal: z.string().trim().min(1),
  /** Alias for postGoal — single spacious textarea from CreationForm. */
  smartPrompt: z.string().trim().optional(),
  marketContext: z
    .enum(["israeli_local", "global"])
    .optional()
    .default("israeli_local"),
  imageSource: ImageSourceSchema.optional(),
  needFalImagePrompt: z.boolean().optional(),
  referenceImage: z.string().trim().optional(),
  aiImageDescription: z.string().trim().optional(),
});

export type GenerationPayload = z.infer<typeof GenerationPayloadSchema>;

/** Category label hints for dictionary → industry string. */
const CATEGORY_INDUSTRY: Record<string, string> = {
  food: "מאפייה / אוכל ביתי",
  beauty: "יופי וטיפוח",
  services: "שירותים מקצועיים",
  home_services: "שיפוצים ושירותי בית",
  automotive: "מוסך ושירותי רכב",
  fitness: "כושר ואימונים",
  legal_finance: "ייעוץ משפטי / פיננסי",
  education: "חינוך ושיעורים",
  retail: "חנות / קמעונאות",
  childcare: "בייביסיטר / טיפול בילדים",
  pets: "חיות מחמד",
};

/**
 * Heuristic + dictionary structured parse of a single smart textarea.
 * Extracts businessName, industry/category, intent — never requires multi-fields.
 */
export function extractSmartPromptFields(smartPrompt: string): {
  businessName: string;
  industry: string;
  postGoal: string;
  intent?: string;
  dictionaryId?: string;
} {
  const raw = normalizeHebrewText(smartPrompt).trim();
  const dict = findIsraeliMatch(raw);

  // Business name: first clause before comma / dash / line break, or first 2–5 words
  const firstLine = raw.split(/\n+/)[0]?.trim() || raw;
  const clause =
    firstLine.split(/[, ،\-–—|]/)[0]?.trim() || firstLine;
  let businessName = clause;
  // Cap overly long "names" (likely the whole offer sentence)
  const words = businessName.split(/\s+/).filter(Boolean);
  if (words.length > 6) {
    businessName = words.slice(0, 4).join(" ");
  }
  if (!businessName || businessName.length < 2) {
    businessName = dict.matchedKeyword
      ? `${dict.matchedKeyword}`
      : "העסק שלי";
  }

  const looksLikeFood =
    dict.category === "food" ||
    /מאפי|מאפה|אוכל|מארז|ג'?חנון|מלוואח|בורקס|שקשוקה|חומוס|פלאפל|bakery|food|cafe/i.test(
      raw,
    );

  const industry = dict.isMatch
    ? CATEGORY_INDUSTRY[dict.category ?? ""] ||
      (dict.category === "food" ? "מאפייה / אוכל ביתי" : "עסק מקומי")
    : looksLikeFood
      ? "מאפייה / אוכל ביתי"
      : "עסק מקומי";

  return {
    businessName,
    industry,
    postGoal: raw,
    intent: dict.intent,
    dictionaryId: dict.id,
  };
}

export const CompiledPromptSchema = z.object({
  businessName: z.string(),
  industry: z.string(),
  postGoal: z.string(),
  domainIntent: DomainIntentSchema,
  falEnrichedPrompt: z.string().min(1),
  falNegativePrompt: z.string().min(1),
  culturalHits: z.array(z.string()),
  /** True when fal came from israeliDictionary (LLM FAL bypass). */
  usedGoldenPrompt: z.boolean(),
  /** Locked Instagram CTA — code/dictionary owned, never LLM-invented. */
  lockedCta: z.string().min(1),
  /** Locked WhatsApp action / lead CTA label. */
  lockedWhatsappCta: z.string().min(1),
  /** Dictionary entry id when matched. */
  dictionaryId: z.string().optional(),
  /** Authentic sample broadcast from dictionary (optional seed). */
  sampleWhatsapp: z.string().optional(),
  /** Entry-specific banned phrases scrubbed in Stage B. */
  bannedWords: z.array(z.string()).optional(),
  /** Dictionary WhatsApp lead template. */
  waLeadTemplate: z.string().optional(),
  /** Tone / timing hints forwarded to the LLM. */
  copyHints: z.string().optional(),
});

export type CompiledPrompt = z.infer<typeof CompiledPromptSchema>;

/** Fallback CTA enum when no dictionary hit. */
export const LOCKED_CTA = {
  food: "להזמנת מארז / משלוח",
  beauty: "קביעת תור / בדיקת זמינות",
  services: "קבלת הצעת מחיר / ייעוץ",
  retail: "בדיקת מלאי / בירור מחיר",
  generic: "שלחו הודעה בוואטסאפ לפרטים",
} as const satisfies Record<DomainIntent, string>;

export const LOCKED_WHATSAPP_CTA = {
  food: "שמור לי מארז / הזמנה",
  beauty: "בדיקת זמינות",
  services: "בקשת הצעת מחיר",
  retail: "שאלה על מוצר",
  generic: "המשך שיחה בוואטסאפ",
} as const satisfies Record<DomainIntent, string>;

export interface DomainIntentPolicy {
  intent: DomainIntent;
  forbiddenPhrases: string[];
  promptGuidance: string;
  lockedCta: string;
  lockedWhatsappCta: string;
  defaultLeadInquiry: string;
  defaultBusinessReply: string;
}

export interface GuardedCampaignOutput {
  ok: true;
  data: UnifiedGenerateContent;
  post: {
    headline: string;
    instagramCaption: string;
    facebookCaption: string;
    imagePrompt: string;
    ctaText?: string;
    whatsappLeadMessage?: string;
    whatsappBusinessReply?: string;
    whatsappActionButton?: string;
    falImagePrompt?: string;
  };
  imageUrl: string | null;
  meta?: {
    domainIntent: DomainIntent;
    usedFallback?: boolean;
    usedGoldenPrompt?: boolean;
    falEnrichedPrompt?: string;
    lockedCta?: string;
    dictionaryId?: string;
    businessName?: string;
    industry?: string;
  };
}

/* -------------------------------------------------------------------------- */
/*  Fixed defaults                                                            */
/* -------------------------------------------------------------------------- */

export const FAL_GUARDRAIL_NEGATIVE_PROMPT =
  "text, watermark, logo, deformed food, extra eggs, distorted shapes, cartoon, 3d render, dark lighting, plastic look";

const BEAUTY_PHOTO_SUFFIX =
  "Clean modern spa / clinic studio background, soft morning window light, 50mm f/2.8 lens, high-end commercial beauty photography, polished and fresh";

const SERVICES_PHOTO_SUFFIX =
  "Clean professional workshop / project site background, soft morning window light, 50mm f/2.8 lens, high-end commercial trade photography, sharp and trustworthy";

const RETAIL_PHOTO_SUFFIX =
  "Clean boutique retail / fashion display background, soft morning window light, 50mm f/2.8 lens, high-end product editorial photography, stylish and inviting";

const GENERIC_PHOTO_SUFFIX =
  "Commercial studio background, soft morning window light, 50mm f/2.8 lens, high-end commercial photography, clean presentation";

const FOOD_PHOTO_SUFFIX =
  "appetizing food photography, rustic wood table, natural light, 50mm f/2.8";

/* -------------------------------------------------------------------------- */
/*  Hebrew spell-check & normalization                                        */
/* -------------------------------------------------------------------------- */

const HEBREW_SPELL_FIXES: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /גחנון/g, replacement: "ג'חנון" },
  { pattern: /ג׳חנון/g, replacement: "ג'חנון" },
  { pattern: /מלאווח/g, replacement: "מלוואח" },
  { pattern: /מלווח/g, replacement: "מלוואח" },
  { pattern: /קורסון/g, replacement: "קרואסון" },
  { pattern: /קרוסון/g, replacement: "קרואסון" },
  { pattern: /שקשוקא/g, replacement: "שקשוקה" },
  { pattern: /שכשוקה/g, replacement: "שקשוקה" },
  { pattern: /בורקסס/g, replacement: "בורקס" },
  { pattern: /רוגלח/g, replacement: "רוגלך" },
  { pattern: /רוגעלך/g, replacement: "רוגלך" },
  { pattern: /חומום/g, replacement: "חומוס" },
  { pattern: /פלאפלל/g, replacement: "פלאפל" },
  { pattern: /סביך/g, replacement: "סביח" },
  { pattern: /שוורמה/g, replacement: "שווארמה" },
  { pattern: /שאוורמה/g, replacement: "שווארמה" },
  { pattern: /מארזז/g, replacement: "מארז" },
  { pattern: /\s{2,}/g, replacement: " " },
];

function cleanVoiceArtifacts(text: string): string {
  return text
    .replace(/[.]{3,}/g, "…")
    .replace(/[!?]{3,}/g, "!")
    .replace(/(.)\1{4,}/g, "$1$1")
    .replace(/\u200f|\u200e/g, "")
    .trim();
}

export function normalizeHebrewText(input: string): string {
  let out = cleanVoiceArtifacts(input);
  for (const { pattern, replacement } of HEBREW_SPELL_FIXES) {
    out = out.replace(pattern, replacement);
  }
  return out.trim();
}

export function normalizeGenerationFields(payload: {
  businessName: string;
  industry: string;
  postGoal: string;
  aiImageDescription?: string;
}): {
  businessName: string;
  industry: string;
  postGoal: string;
  aiImageDescription?: string;
} {
  return {
    businessName: normalizeHebrewText(payload.businessName),
    industry: normalizeHebrewText(payload.industry),
    postGoal: normalizeHebrewText(payload.postGoal),
    aiImageDescription: payload.aiImageDescription
      ? normalizeHebrewText(payload.aiImageDescription)
      : undefined,
  };
}

/* -------------------------------------------------------------------------- */
/*  Domain intent lock (fallback when no dictionary hit)                      */
/* -------------------------------------------------------------------------- */

const FOOD_KEYS =
  /מאפי|מאפה|בייקרי|bakery|cafe|קפה|בית.?קפה|מסעד|אוכל|מזון|קונדיטור|פטיסרי|פיצה|המבורגר|שווארמה|פלאפל|חומוס|באר|pub|food|restaurant|חלבי|בשרי|קייטרינג|מארז|משלוח.?אוכל|ג'?חנון|מלוואח|בורקס|שקשוקה|רוגלך|קרואסון|סביח/i;

const BEAUTY_KEYS =
  /יופי|קוסמטי|מספר|סלון|ציפורנ|לק|spa|ספא|קליניק|רפוא|רופא|טיפול|עיסוי|שיער|ברבר|beauty|clinic|dental|שיניי|אורתוד|פיזיותרפ|פסיכולוג|נטורופ|כושר|אימון/i;

const SERVICES_KEYS =
  /שיפוצ|בני|קבלנ|שיפוץ|אינסטל|חשמל|מיזוג|הובל|ניקיון|גינון|אדריכל|עיצוב.?פנים|נדל|renovat|contractor|שירות|ייעוץ|הצעת.?מחיר|מוסך|רכב|טכנאי|תיקון|trades?/i;

const RETAIL_KEYS =
  /אופנה|בוטיק|חנות|קמעונ|retail|fashion|בגדים|נעליים|אקססור|מלאי|מוצר|חנות.?בגדים|יודאיקה|מתנות/i;

export function resolveDomainIntent(
  industry?: string | null,
  postGoal?: string | null,
  businessName?: string | null,
): DomainIntent {
  const blob = `${industry ?? ""} ${postGoal ?? ""} ${businessName ?? ""}`;
  const dict = findIsraeliMatch(blob);
  if (dict.isMatch) {
    return dictionaryCategoryToDomain(dict.category, dict.intent);
  }
  if (FOOD_KEYS.test(blob)) return "food";
  if (BEAUTY_KEYS.test(blob)) return "beauty";
  if (RETAIL_KEYS.test(blob)) return "retail";
  if (SERVICES_KEYS.test(blob)) return "services";
  return "generic";
}

const DOMAIN_POLICIES: Record<DomainIntent, DomainIntentPolicy> = {
  food: {
    intent: "food",
    forbiddenPhrases: [
      "קביעת תור",
      "לקבוע תור",
      "קבע תור",
      "פגישת ייעוץ",
      "זימון פגישה",
    ],
    promptGuidance: [
      "DOMAIN LOCK: Food / Bakery / Café.",
      "ALLOWED: order, reserve package (מארז), delivery, pickup ONLY.",
      "FORBIDDEN: קביעת תור, פגישת ייעוץ.",
      `CTA MUST be exactly: «${LOCKED_CTA.food}» (or dictionary CTA if provided).`,
      "WhatsApp lead MUST be an order/reserve inquiry — never an appointment.",
    ].join("\n"),
    lockedCta: LOCKED_CTA.food,
    lockedWhatsappCta: LOCKED_WHATSAPP_CTA.food,
    defaultLeadInquiry:
      "היי, ראיתי את הפוסט — אפשר לשריין לי מארז / הזמנה לאיסוף?",
    defaultBusinessReply: "בטח! 🥐 לאיזו שעה נוח לך? נשמור לך חם וטרי.",
  },
  beauty: {
    intent: "beauty",
    forbiddenPhrases: ["שמור לי מארז", "תפריט משלוחים", "הזמנה למשלוח אוכל"],
    promptGuidance: [
      "DOMAIN LOCK: Beauty / Clinic / Salon / Fitness.",
      "ALLOWED: appointment booking, availability check.",
      `CTA MUST be exactly: «${LOCKED_CTA.beauty}» (or dictionary CTA).`,
    ].join("\n"),
    lockedCta: LOCKED_CTA.beauty,
    lockedWhatsappCta: LOCKED_WHATSAPP_CTA.beauty,
    defaultLeadInquiry:
      "היי, ראיתי את הפוסט שלכם — אפשר לבדוק זמינות ולקבוע תור?",
    defaultBusinessReply: "בשמחה 😊 לאיזה יום ושעה נוח לך? נבדוק זמינות.",
  },
  services: {
    intent: "services",
    forbiddenPhrases: ["קביעת תור", "שמור לי מארז", "תפריט משלוחים"],
    promptGuidance: [
      "DOMAIN LOCK: Home Services / Trades / Automotive.",
      "ALLOWED: fast quote, direct consultation.",
      `CTA MUST be exactly: «${LOCKED_CTA.services}» (or dictionary CTA).`,
    ].join("\n"),
    lockedCta: LOCKED_CTA.services,
    lockedWhatsappCta: LOCKED_WHATSAPP_CTA.services,
    defaultLeadInquiry:
      "היי, ראיתי את העבודה שלכם בפוסט — אפשר לקבל הצעת מחיר / ייעוץ?",
    defaultBusinessReply:
      "בשמחה! ספרו בקצרה מה צריך ונחזור עם הצעה מסודרת.",
  },
  retail: {
    intent: "retail",
    forbiddenPhrases: ["קביעת תור", "שמור לי מארז"],
    promptGuidance: [
      "DOMAIN LOCK: Retail / Fashion.",
      `CTA MUST be exactly: «${LOCKED_CTA.retail}».`,
    ].join("\n"),
    lockedCta: LOCKED_CTA.retail,
    lockedWhatsappCta: LOCKED_WHATSAPP_CTA.retail,
    defaultLeadInquiry:
      "היי, ראיתי את המוצר בפוסט — אפשר לבדוק מלאי ומחיר?",
    defaultBusinessReply: "בשמחה! איזה מידה/דגם מעניין אותך? נבדוק במלאי.",
  },
  generic: {
    intent: "generic",
    forbiddenPhrases: [],
    promptGuidance: [
      "DOMAIN LOCK: Generic.",
      "Never use «קביעת תור» for food; never use food packages for clinics.",
    ].join("\n"),
    lockedCta: LOCKED_CTA.generic,
    lockedWhatsappCta: LOCKED_WHATSAPP_CTA.generic,
    defaultLeadInquiry: "היי! ראיתי את הפוסט שלכם — אפשר לקבל פרטים נוספים?",
    defaultBusinessReply: "בשמחה 😊 נשמח לעזור. מה תרצו לדעת?",
  },
};

export function getDomainIntentPolicy(
  industry?: string | null,
  postGoal?: string | null,
  businessName?: string | null,
): DomainIntentPolicy {
  return DOMAIN_POLICIES[
    resolveDomainIntent(industry, postGoal, businessName)
  ];
}

export function buildDomainIntentPromptBlock(
  industry?: string | null,
  postGoal?: string | null,
  businessName?: string | null,
  lockedCta?: string,
  copyHints?: string,
): string {
  const policy = getDomainIntentPolicy(industry, postGoal, businessName);
  const cta = lockedCta ?? policy.lockedCta;
  return [
    "",
    "=== DOMAIN INTENT LOCK (mandatory — do NOT invent CTAs) ===",
    policy.promptGuidance,
    `LOCKED ctaText (copy verbatim into instagram.ctaText): «${cta}»`,
    `Preferred WhatsApp lead: «${policy.defaultLeadInquiry}»`,
    policy.forbiddenPhrases.length
      ? `Never use: ${policy.forbiddenPhrases.map((p) => `«${p}»`).join(", ")}`
      : "",
    copyHints?.trim() || "",
  ]
    .filter(Boolean)
    .join("\n");
}

/* -------------------------------------------------------------------------- */
/*  Stage A — dictionary-first FAL + CTA compiler                             */
/* -------------------------------------------------------------------------- */

function photoSuffixForIntent(intent: DomainIntent): string {
  switch (intent) {
    case "food":
      return FOOD_PHOTO_SUFFIX;
    case "beauty":
      return BEAUTY_PHOTO_SUFFIX;
    case "services":
      return SERVICES_PHOTO_SUFFIX;
    case "retail":
      return RETAIL_PHOTO_SUFFIX;
    default:
      return GENERIC_PHOTO_SUFFIX;
  }
}

export function matchPayloadDictionary(opts: {
  businessName: string;
  industry: string;
  postGoal: string;
}): MatchResult {
  // Prefer postGoal (offer-specific), then industry, then full blob
  const goalHit = findIsraeliMatch(opts.postGoal);
  if (goalHit.isMatch) return goalHit;

  const industryHit = findIsraeliMatch(opts.industry);
  if (industryHit.isMatch) return industryHit;

  return findIsraeliMatch(
    `${opts.postGoal} ${opts.industry} ${opts.businessName}`,
  );
}

/**
 * Build falEnrichedPrompt via Ironclad Visual Compiler.
 * Dictionary match → golden subject cage; else niche 4-anchor formula.
 */
export function buildFalEnrichedPrompt(opts: {
  postGoal: string;
  industry: string;
  businessName: string;
  domainIntent: DomainIntent;
  aiImageDescription?: string;
  llmVisualHint?: string;
  dictionaryMatch?: MatchResult;
}): {
  falEnrichedPrompt: string;
  falNegativePrompt: string;
  culturalHits: string[];
  usedGoldenPrompt: boolean;
} {
  const dict =
    opts.dictionaryMatch ??
    matchPayloadDictionary({
      businessName: opts.businessName,
      industry: opts.industry,
      postGoal: opts.postGoal,
    });

  const compiled = compileAndLintFalPrompt({
    businessName: opts.businessName,
    industry: opts.industry,
    postGoal: opts.postGoal,
    dictionaryMatch: dict.isMatch ? dict : undefined,
    customDetails: opts.aiImageDescription,
  });

  return {
    falEnrichedPrompt: compiled.prompt,
    falNegativePrompt: compiled.negativePrompt,
    culturalHits: dict.isMatch
      ? dict.matchedKeyword
        ? [dict.matchedKeyword]
        : dict.keywords?.slice(0, 1) ?? [dict.id ?? "dictionary"]
      : [],
    usedGoldenPrompt: compiled.usedDictionary,
  };
}

export function compileStageA(payload: GenerationPayload): CompiledPrompt {
  const normalized = normalizeGenerationFields(payload);
  const dict = matchPayloadDictionary(normalized);
  const domainIntent = dict.isMatch
    ? dictionaryCategoryToDomain(dict.category, dict.intent)
    : resolveDomainIntent(
        normalized.industry,
        normalized.postGoal,
        normalized.businessName,
      );

  const policy = DOMAIN_POLICIES[domainIntent];
  const lockedCta = dict.cta?.instagram ?? policy.lockedCta;
  const lockedWhatsappCta = dict.cta?.whatsapp ?? policy.lockedWhatsappCta;

  const fal = buildFalEnrichedPrompt({
    ...normalized,
    domainIntent,
    dictionaryMatch: dict,
  });

  return CompiledPromptSchema.parse({
    businessName: normalized.businessName,
    industry: normalized.industry,
    postGoal: normalized.postGoal,
    domainIntent,
    falEnrichedPrompt: fal.falEnrichedPrompt,
    falNegativePrompt: fal.falNegativePrompt,
    culturalHits: fal.culturalHits,
    usedGoldenPrompt: fal.usedGoldenPrompt,
    lockedCta,
    lockedWhatsappCta,
    dictionaryId: dict.id,
    sampleWhatsapp: dict.sampleWhatsapp,
    bannedWords: dict.bannedWords,
    waLeadTemplate: dict.waLeadTemplate,
    copyHints: buildDictionaryCopyHints(dict) || undefined,
  });
}

/* -------------------------------------------------------------------------- */
/*  Stage B — Post-processing sanitizer + CTA lock                            */
/* -------------------------------------------------------------------------- */

const FOOD_APPOINTMENT_RE =
  /קביעת\s*תור|לקבוע\s*תור|קבע(ו)?\s*תור|זימון\s*פגישה|פגישת\s*ייעוץ/g;

const FOOD_TOR_WORD_RE = /(?<![א-ת])תור(?![א-ת])/g;

/** Food-domain sanitizer: תור / לקבוע תור → להזמין / לשריין מארז */
export function sanitizeFoodCopy(text: string): string {
  return text
    .replace(FOOD_APPOINTMENT_RE, "לשריין מארז")
    .replace(FOOD_TOR_WORD_RE, "להזמין")
    .replace(/לשריין מארז מארז/g, "לשריין מארז")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function containsForbidden(text: string, phrases: string[]): string | null {
  for (const p of phrases) {
    if (text.includes(p)) return p;
  }
  return null;
}

/** Strip entry-specific banned words/phrases from copy. */
export function stripBannedWords(text: string, banned?: string[]): string {
  if (!banned?.length) return text;
  let out = text;
  // Longer phrases first to avoid partial leftovers
  const sorted = [...banned].sort((a, b) => b.length - a.length);
  for (const phrase of sorted) {
    if (!phrase.trim()) continue;
    out = out.split(phrase).join("");
  }
  return out
    .replace(/\s+ו\s+/g, " ")
    .replace(/^[,\s־–-]+|[,\s־–-]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Always overwrite CTA fields from locked enum/dictionary.
 * Sanitize food appointment language + entry bannedWords before frontend.
 */
/** Reject captions that are near-verbatim echoes of the user smart prompt. */
function isVerbatimEcho(candidate: string, source: string): boolean {
  const a = candidate.replace(/\s+/g, " ").trim();
  const b = source.replace(/\s+/g, " ").trim();
  if (!a || !b || a.length < 20) return false;
  if (a === b) return true;
  // >80% overlap of the shorter into the longer
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  return longer.includes(shorter) && shorter.length / longer.length > 0.8;
}

export function applyDomainOutputGuard(
  content: UnifiedGenerateContent,
  compiled: CompiledPrompt,
): UnifiedGenerateContent {
  const policy = DOMAIN_POLICIES[compiled.domainIntent];
  const isFood = compiled.domainIntent === "food";
  const banned = [
    ...policy.forbiddenPhrases,
    ...(compiled.bannedWords ?? []),
  ];

  let caption = normalizeHebrewText(content.instagram.caption);
  let headline = normalizeHebrewText(content.instagram.headline);
  let lead = normalizeHebrewText(content.whatsapp.leadIncomingMessage);
  let reply = normalizeHebrewText(content.whatsapp.businessAutoReply);
  let fbCaption = normalizeHebrewText(
    content.facebook?.caption || content.instagram.caption,
  );
  let broadcast = normalizeHebrewText(
    content.whatsapp.broadcastMessage ||
      compiled.sampleWhatsapp ||
      reply,
  );

  // Never ship verbatim echo of the user's raw smart prompt
  if (isVerbatimEcho(caption, compiled.postGoal)) {
    caption = compiled.sampleWhatsapp || "";
  }
  if (isVerbatimEcho(fbCaption, compiled.postGoal)) {
    fbCaption = "";
  }
  if (isVerbatimEcho(broadcast, compiled.postGoal)) {
    broadcast = compiled.sampleWhatsapp || "";
  }

  if (isFood) {
    caption = sanitizeFoodCopy(caption);
    headline = sanitizeFoodCopy(headline);
    lead = sanitizeFoodCopy(lead);
    reply = sanitizeFoodCopy(reply);
    fbCaption = sanitizeFoodCopy(fbCaption);
    broadcast = sanitizeFoodCopy(broadcast);

    // Lead must remain an order/reserve inquiry
    if (/תור|פגיש|זמינות/.test(lead) || !/(מארז|הזמנ|שריין|משלוח|איסוף)/.test(lead)) {
      lead = compiled.waLeadTemplate || policy.defaultLeadInquiry;
    }
  } else {
    for (const phrase of banned) {
      if (caption.includes(phrase)) caption = caption.split(phrase).join("");
      if (lead.includes(phrase)) {
        lead = compiled.waLeadTemplate || policy.defaultLeadInquiry;
      }
    }
  }

  caption = stripBannedWords(caption, banned);
  headline = stripBannedWords(headline, banned);
  lead = stripBannedWords(lead, banned);
  reply = stripBannedWords(reply, banned);
  fbCaption = stripBannedWords(fbCaption, banned);
  broadcast = stripBannedWords(broadcast, banned);

  // Prefer dictionary sample as Instagram caption when LLM output is empty/weak
  if (!caption.trim() && compiled.sampleWhatsapp) {
    caption = compiled.sampleWhatsapp;
  }
  if (!caption.trim()) {
    caption = `${headline || compiled.businessName}\n\n${compiled.lockedCta}`;
  }
  if (!fbCaption.trim()) {
    fbCaption = [
      caption.split("\n")[0] || compiled.businessName,
      "מה דעתכם? ספרו לנו בתגובות 💬",
    ].join("\n\n");
  }
  if (!broadcast.trim()) {
    broadcast =
      compiled.sampleWhatsapp ||
      `${compiled.businessName}\n${compiled.lockedCta}\nענו להודעה הזו לפרטים 👇`;
  }
  if (!lead.trim()) {
    lead = compiled.waLeadTemplate || policy.defaultLeadInquiry;
  }
  if (!reply.trim()) reply = policy.defaultBusinessReply;
  if (!headline.trim()) headline = compiled.businessName;

  // Strip accidental forbidden leftovers
  const forbiddenHit = containsForbidden(caption, banned);
  if (forbiddenHit) {
    caption = caption.split(forbiddenHit).join("").replace(/\s{2,}/g, " ").trim();
  }

  // Ensure 5–6 hashtags when possible
  let hashtags = [...(content.instagram.hashtags ?? [])];
  if (hashtags.length < 5) {
    const extras = ["#עסקמקומי", "#ישראל", `#${compiled.domainIntent}`, "#פרסום", "#וואטסאפ"];
    for (const t of extras) {
      if (hashtags.length >= 6) break;
      if (!hashtags.includes(t)) hashtags.push(t);
    }
  }
  hashtags = hashtags.slice(0, 6);

  return {
    ...content,
    instagram: {
      ...content.instagram,
      headline: headline.trim(),
      caption: caption.trim(),
      hashtags,
      // HARD LOCK — never trust LLM CTA
      ctaText: compiled.lockedCta,
    },
    facebook: {
      caption: fbCaption.trim(),
    },
    whatsapp: {
      broadcastMessage: broadcast.trim(),
      leadIncomingMessage: lead.trim(),
      businessAutoReply: reply.trim(),
      actionButton: compiled.lockedWhatsappCta,
    },
    falImagePrompt: compiled.falEnrichedPrompt,
    imagePrompt: compiled.falEnrichedPrompt,
  };
}

/* -------------------------------------------------------------------------- */
/*  Deterministic fallback templates (zero-crash)                             */
/* -------------------------------------------------------------------------- */

export function buildFallbackCampaign(
  compiled: CompiledPrompt,
): UnifiedGenerateContent {
  const policy = DOMAIN_POLICIES[compiled.domainIntent];
  const shortHook = compiled.businessName;

  const caption =
    compiled.sampleWhatsapp?.trim() ||
    [
      `${shortHook} מזמינים אתכם לעדכון חם מהעסק.`,
      "",
      compiled.lockedCta,
    ].join("\n");

  const instagram: UnifiedInstagramBlock = {
    headline: `${shortHook} ✨`,
    caption,
    hashtags: [
      "#עסקמקומי",
      "#ישראל",
      `#${compiled.domainIntent}`,
      "#פרסום",
      "#וואטסאפ",
    ],
    ctaText: compiled.lockedCta,
  };

  const whatsapp: UnifiedWhatsAppBlock = {
    broadcastMessage:
      compiled.sampleWhatsapp?.trim() ||
      `${shortHook}\n${compiled.lockedCta}\nענו להודעה הזו לפרטים 👇`,
    leadIncomingMessage: policy.defaultLeadInquiry,
    businessAutoReply: policy.defaultBusinessReply,
    actionButton: compiled.lockedWhatsappCta,
  };

  return {
    instagram,
    facebook: {
      caption: [
        `${shortHook} משתפים אתכם עדכון מהשטח.`,
        "מה דעתכם? ספרו לנו בתגובות 💬",
      ].join("\n\n"),
    },
    whatsapp,
    falImagePrompt: compiled.falEnrichedPrompt,
    imagePrompt: compiled.falEnrichedPrompt,
  };
}

export function toLegacyPost(unified: UnifiedGenerateContent) {
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
    whatsappBroadcastMessage: unified.whatsapp.broadcastMessage,
    falImagePrompt: unified.falImagePrompt,
  };
}

export function toUnifiedGenerateRequest(
  payload: GenerationPayload,
  compiled: CompiledPrompt,
): UnifiedGenerateRequest {
  return {
    businessName: compiled.businessName,
    industry: compiled.industry,
    postGoal: compiled.postGoal,
    marketContext: payload.marketContext ?? "israeli_local",
    referenceImage: payload.referenceImage,
    aiImageDescription: payload.aiImageDescription,
    needFalImagePrompt:
      payload.needFalImagePrompt !== false &&
      payload.imageSource !== "upload" &&
      !payload.referenceImage,
  };
}

/** Parse raw body into GenerationPayload or null. */
export function parseGenerationPayload(
  body: unknown,
): GenerationPayload | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;

  let imageSource: ImageSource | undefined;
  if (o.imageSource === "ai" || o.imageSource === "upload") {
    imageSource = o.imageSource;
  } else if (typeof o.referenceImage === "string" && o.referenceImage.trim()) {
    imageSource = "upload";
  } else if (o.needFalImagePrompt === false) {
    imageSource = "upload";
  } else {
    imageSource = "ai";
  }

  // Prefer single smart textarea: smartPrompt | prompt | postGoal
  const smartRaw =
    (typeof o.smartPrompt === "string" && o.smartPrompt.trim()) ||
    (typeof o.prompt === "string" && o.prompt.trim()) ||
    (typeof o.postGoal === "string" && o.postGoal.trim()) ||
    "";

  const hasExplicitName =
    typeof o.businessName === "string" && o.businessName.trim().length > 0;
  const hasExplicitIndustry =
    typeof o.industry === "string" && o.industry.trim().length > 0;
  const hasExplicitGoal =
    typeof o.postGoal === "string" && o.postGoal.trim().length > 0;

  // Resilient: single smart field OR legacy multi-field
  if (!smartRaw && !hasExplicitGoal) return null;

  let businessName =
    hasExplicitName ? (o.businessName as string).trim() : "";
  let industry = hasExplicitIndustry
    ? (o.industry as string).trim()
    : "עסק מקומי";
  let postGoal = hasExplicitGoal
    ? (o.postGoal as string).trim()
    : smartRaw;

  if (smartRaw && (!hasExplicitName || !hasExplicitIndustry || !hasExplicitGoal)) {
    const extracted = extractSmartPromptFields(smartRaw);
    if (!hasExplicitName) businessName = extracted.businessName;
    if (!hasExplicitIndustry) industry = extracted.industry;
    if (!hasExplicitGoal) postGoal = extracted.postGoal;
  }

  if (!businessName.trim() || !postGoal.trim()) return null;

  const result = GenerationPayloadSchema.safeParse({
    businessName,
    industry: industry.trim() || "עסק מקומי",
    postGoal,
    smartPrompt: smartRaw || undefined,
    marketContext: o.marketContext === "global" ? "global" : "israeli_local",
    imageSource,
    needFalImagePrompt: o.needFalImagePrompt,
    referenceImage:
      typeof o.referenceImage === "string" ? o.referenceImage : undefined,
    aiImageDescription:
      typeof o.aiImageDescription === "string"
        ? o.aiImageDescription
        : undefined,
  });

  if (!result.success) return null;

  const data = result.data;
  if (
    data.referenceImage &&
    !data.referenceImage.startsWith("data:image/") &&
    !data.referenceImage.startsWith("https://") &&
    !data.referenceImage.startsWith("http://")
  ) {
    return { ...data, referenceImage: undefined };
  }

  return data;
}
