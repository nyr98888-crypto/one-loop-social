/**
 * Ironclad Visual Compiler — deterministic FAL prompt assembly + pre-flight lint.
 * Engine: Recraft V3 (`realistic_image` / `natural_light`).
 * No Schnell word-window padding, no marketing buzzword bait.
 */

/** Soft negatives kept for meta / legacy callers (not baked into Recraft prompts). */
export const IRONCLAD_NEGATIVE_PROMPT =
  "text, watermark, signature, logo, logos, typography, letters, graphic stamp, round seal, circular badge, badge, sticker, stickers, emblem, crest, wax seal, rubber stamp, overlay badge, brand mark, distorted, deformed, extra elements, malformed, plastic skin, CGI, 3D render, cartoon, illustration, blurry, low quality, dark harsh lighting, oversaturated";

/**
 * Strip graphic/text requests + marketing buzzwords that bait stock watermarks.
 * Keep the positive prompt on physical, tangible subjects only.
 */
const POSITIVE_BANNED =
  /\b(text|font|watermark|logo|logos?|typography|caption|letters?|hebrew|israeli\s+word|stamp|seal|badge|sticker|emblem|crest|plaque|medal|ribbon|commercial|official|award[-\s]?winning|award|certified|masterpiece|premium|best[\s-]?in[\s-]?class|world[\s-]?class)\b/gi;

const ABSTRACT_BANNED =
  /\b(delicious|amazing|best|perfect|awesome|great|wonderful|beautiful|stunning|lovely|tasty|yummy|superb|excellent|premium-quality)\b/gi;

const HEBREW_OR_NON_LATIN = /[^\x00-\x7F]/;

/** Physical / photographic finish — tactile textures, depth of field, natural light. */
export const CLEAN_PHOTO_POSITIVE =
  "tactile surface textures, appetizing natural colors, shallow depth of field, soft natural window light, sharp subject focus, real photograph";

/**
 * Locked Jachnun golden prompt — returned EXACTLY (no cage rewrite).
 * Strictly forbid: logs, cylinder, mahogany, sausage, fried egg.
 */
export const JACHNUN_LOCKED_PROMPT =
  "Authentic Yemenite Jewish Jachnun breakfast, golden-amber baked rolled pastry with glistening flaky dough layers, served on a plain wooden board beside a small ceramic bowl of fresh bright-red grated tomato salsa with olive oil, a small dish of green chili zhug, and a whole hard-boiled brown egg sliced cleanly in half showing a firm yellow cooked yolk, natural window lighting, real food photograph, 50mm f/2.8 macro, tactile pastry texture, appetizing warm colors, shallow depth of field";

export const JACHNUN_LOCKED_NEGATIVE =
  "logs, cylinder, mahogany, sausage, fried egg, croissant, brioche, french pastry, bread bun, cinnamon roll, danish, swirl bun, bagel";

const JACHNUN_ID_RE = /^jachnun$/i;
const JACHNUN_TEXT_RE = /ג['׳']?חנון|jachnun/i;

/**
 * Locked garage interior / car-on-lift scene — physical lift contact + workers.
 * Triggered by: מוסך מבפנים, רכב על הליפט, hydraulic lift, etc.
 * Tuned for FAL Flux Pro / Recraft photorealism.
 */
export const WORKSHOP_PHYSICAL_CONTACT =
  "A passenger car firmly elevated on heavy-duty steel arms of a hydraulic two-post lift, lift rubber pads directly pressed against the vehicle underside jacking points";

export const WORKSHOP_ACTIVE_PERSONNEL =
  "Two professional mechanics in branded workwear working around the vehicle, realistic commercial workshop lighting, automotive tools, 35mm photography";

export const WORKSHOP_GROUNDING =
  "Zero floating elements, physically accurate shadows and mechanical load distribution";

export const GARAGE_LIFT_LOCKED_PROMPT = [
  "Wide-angle shot of a bright modern auto garage interior",
  WORKSHOP_PHYSICAL_CONTACT,
  WORKSHOP_ACTIVE_PERSONNEL,
  "tool carts and clean concrete floors, authentic automotive workshop",
  WORKSHOP_GROUNDING,
].join(", ");

export const GARAGE_LIFT_LOCKED_NEGATIVE =
  "air filter close-up, handheld OBD scanner, tablet macro, extreme close-up parts, dirty oil spills, floating car, levitating vehicle, cartoon, text, logo, watermark, stamp";

const GARAGE_LIFT_TEXT_RE =
  /ליפט|על\s*הליפט|מוסך\s*מבפנים|רכב\s*על|hydraulic\s*lift|car\s*on\s*(a\s*)?lift|garage\s*interior|workshop\s*interior/i;

const AUTOMOTIVE_SCENE_RE =
  /מוסך|garage|automotive|workshop|hydraulic\s*lift|two-post\s*lift|רכב\s*על|mechanic/i;

/**
 * For any automotive / workshop FAL prompt, enforce lift physicality + workers.
 * Idempotent — skips clauses already present.
 */
export function injectWorkshopPhysicality(prompt: string): string {
  const base = prompt.trim();
  if (!base || !AUTOMOTIVE_SCENE_RE.test(base)) return base;

  const clauses = [
    WORKSHOP_PHYSICAL_CONTACT,
    WORKSHOP_ACTIVE_PERSONNEL,
    WORKSHOP_GROUNDING,
  ];
  const missing = clauses.filter(
    (c) => !base.toLowerCase().includes(c.slice(0, 40).toLowerCase()),
  );
  if (missing.length === 0) return base;
  return `${base}, ${missing.join(", ")}`;
}

/** Photographic lighting cage — physical subjects only. */
const CAGE_SUFFIX =
  `soft diffused natural morning window light, authentic photographic realism, real food photograph, shot on 50mm f/2.8 lens, shallow depth of field, sharp crisp focus, ${CLEAN_PHOTO_POSITIVE}`;

/** Deterministic niche → 4 physical visual anchors (English only). */
const NICHE_ANCHORS: Array<{ test: RegExp; niche: string; anchors: string[] }> =
  [
    {
      test: /מוסך|רכב|בלמ|צמיג|פחח|דיטייל|שטיפ.?רכב|garage|auto|tire|vag|סיאט|סקודה|אאודי/i,
      niche: "automotive workshop",
      anchors: [
        WORKSHOP_PHYSICAL_CONTACT,
        WORKSHOP_ACTIVE_PERSONNEL,
        WORKSHOP_GROUNDING,
        "bright modern garage interior, tool carts, clean concrete floor",
      ],
    },
    {
      test: /מאפי|מאפה|ג'?חנון|בורקס|שקשוק|חומוס|פלאפל|קובה|חמין|חריימ|עוג|bakery|food|cafe|קפה|מסעד/i,
      niche: "food bakery cafe",
      anchors: [
        "golden flaky pastry crust",
        "rustic wooden serving board",
        "fresh crushed tomato dip bowl",
        "hard-boiled brown egg",
      ],
    },
    {
      test: /יופי|ציפורנ|מספר|ברבר|גבות|ריסים|פדיקור|beauty|salon|clinic|nail/i,
      niche: "beauty clinic",
      anchors: [
        "polished stainless steel tools tray",
        "soft spa chair",
        "clean pastel clinic wall",
        "ring-light reflection",
      ],
    },
    {
      test: /אינסטל|שיפוצ|חשמל|מזגן|הנדימן|צבע|מנעול|הדבר|ניקיון|plumber|renovat|paint|clean/i,
      niche: "home services trade",
      anchors: [
        "organized professional toolkit",
        "polished chrome fixtures",
        "clean marble countertop",
        "digital multimeter",
      ],
    },
    {
      test: /וטרינר|כלב|חתול|פנסיון|דוגווקר|pet|dog|vet|groom/i,
      niche: "pet care",
      anchors: [
        "happy golden retriever",
        "stainless clinic exam table",
        "soft leash and collar",
        "sunny green park grass",
      ],
    },
    {
      test: /בייבי|מטפלת|שמרטפ|אומנת|child|nanny|babysit/i,
      niche: "childcare playroom",
      anchors: [
        "wooden scandinavian toys",
        "colorful soft cushions",
        "sunlit playroom shelves",
        "safe cozy rug",
      ],
    },
    {
      test: /חנות|טמבור|פרח|צעצוע|פיצוח|סלולר|retail|shop|store/i,
      niche: "retail boutique",
      anchors: [
        "organized wooden display shelves",
        "bright product packaging",
        "clean polished floor",
        "soft retail spotlight",
      ],
    },
    {
      test: /עורך.?דין|רואה.?חשבון|יועץ.?מס|lawyer|account|tax|legal/i,
      niche: "legal finance office",
      anchors: [
        "polished walnut conference table",
        "leather document portfolio",
        "gold executive pen",
        "sunlit city skyline window",
      ],
    },
    {
      test: /מורה|בגרות|מתמטיק|tutor|math|lesson/i,
      niche: "education study desk",
      anchors: [
        "spiral notebook with diagrams",
        "graphite pencil",
        "scientific calculator",
        "sunlit wood desk",
      ],
    },
  ];

const DEFAULT_ANCHORS = [
  "clean product subject",
  "organized professional workspace",
  "natural window highlight",
  "crisp photographic detail",
];

export type DictionaryMatchLike = {
  isMatch?: boolean;
  falPrompt?: string;
  falNegative?: string;
  cameraAngle?: string;
  category?: string;
  id?: string;
} | null;

export interface CompileFalPromptInput {
  businessName: string;
  industry: string;
  postGoal: string;
  dictionaryMatch?: DictionaryMatchLike;
  /** Optional user visual notes — appended as English descriptive details only. */
  customDetails?: string;
}

export interface CompiledFalPrompt {
  prompt: string;
  negativePrompt: string;
  imageSize: "square_hd";
  usedDictionary: boolean;
  wordCount: number;
  anchors: string[];
  nicheContext: string;
}

export interface PreflightResult {
  ok: boolean;
  prompt: string;
  negativePrompt: string;
  imageSize: "square_hd";
  wordCount: number;
  errors: string[];
}

function wordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function stripNonEnglish(text: string): string {
  return text
    .replace(/[^\x00-\x7F]/g, " ")
    .replace(ABSTRACT_BANNED, " ")
    .replace(POSITIVE_BANNED, " ")
    .replace(/[^\w\s.,\-_/']/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function purgeStampTriggers(prompt: string): string {
  return prompt
    .replace(POSITIVE_BANNED, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/,\s*,/g, ",")
    .trim();
}

function ensureCleanPhotoSuffix(prompt: string): string {
  if (
    /tactile|shallow depth of field|natural window light|real (food )?photograph/i.test(
      prompt,
    )
  ) {
    return prompt;
  }
  return `${prompt.replace(/[,\s]+$/, "")}, ${CLEAN_PHOTO_POSITIVE}`;
}

function isJachnunLock(match: DictionaryMatchLike, blob: string): boolean {
  if (match?.id && JACHNUN_ID_RE.test(match.id)) return true;
  return JACHNUN_TEXT_RE.test(blob);
}

/** True when user asks for garage interior / car on lift (not part macros). */
export function isGarageLiftScene(text: string): boolean {
  return GARAGE_LIFT_TEXT_RE.test(text);
}

/**
 * Prefer locked wide garage prompt when user asks for lift/interior,
 * or when a garage dictionary match would otherwise zoom into diagnostics.
 */
export function resolveGarageLiftPrompt(opts: {
  postGoal?: string;
  industry?: string;
  businessName?: string;
  dictionaryId?: string | null;
  currentPrompt?: string;
}): string | null {
  const blob = [
    opts.postGoal,
    opts.industry,
    opts.businessName,
    opts.dictionaryId,
    opts.currentPrompt,
  ]
    .filter(Boolean)
    .join(" ");

  const wantsLift =
    isGarageLiftScene(blob) ||
    (/garage|מוסך/i.test(blob) &&
      !/air\s*filter|obd|scanner|tablet|דיאגנוסט/i.test(opts.postGoal ?? ""));

  // Explicit lift / interior request always wins
  if (isGarageLiftScene(blob)) return GARAGE_LIFT_LOCKED_PROMPT;

  // Generic garage without explicit macro request → wide lift scene
  if (
    wantsLift &&
    /מוסך|garage|automotive|workshop/i.test(blob) &&
    !/פילטר|air\s*filter|מחשב\s*יד|handheld/i.test(opts.postGoal ?? "")
  ) {
    return GARAGE_LIFT_LOCKED_PROMPT;
  }

  // Dictionary garage falPrompt that wrongly zooms into tablets/filters
  if (
    opts.currentPrompt &&
    /garage|workshop|hydraulic|מוסך/i.test(opts.currentPrompt) &&
    /air filter|diagnostic tablet|handheld|obd|scanner close/i.test(
      opts.currentPrompt,
    ) &&
    !/air\s*filter|tablet|scanner|דיאגנוסט/i.test(opts.postGoal ?? "")
  ) {
    return GARAGE_LIFT_LOCKED_PROMPT;
  }

  return null;
}

function resolveNicheAnchors(
  industry: string,
  postGoal: string,
  businessName: string,
): { niche: string; anchors: string[] } {
  const blob = `${industry} ${postGoal} ${businessName}`;
  for (const row of NICHE_ANCHORS) {
    if (row.test.test(blob)) {
      return { niche: row.niche, anchors: row.anchors.slice(0, 4) };
    }
  }
  return { niche: "local business", anchors: DEFAULT_ANCHORS };
}

/**
 * Compile a FAL-ready prompt using dictionary golden subject OR niche anchors.
 * No arbitrary word-count windows — Recraft handles long physical descriptions.
 */
export function compileFalPrompt(
  input: CompileFalPromptInput,
): CompiledFalPrompt {
  const match = input.dictionaryMatch?.isMatch
    ? input.dictionaryMatch
    : input.dictionaryMatch?.falPrompt
      ? { ...input.dictionaryMatch, isMatch: true }
      : null;

  const blob = `${input.industry} ${input.postGoal} ${input.businessName}`;
  const nicheInfo = resolveNicheAnchors(
    input.industry,
    input.postGoal,
    input.businessName,
  );

  // ── Jachnun ironclad lock: exact string, no cage rewrite ──
  if (isJachnunLock(match, blob)) {
    const negativePrompt = [
      IRONCLAD_NEGATIVE_PROMPT,
      JACHNUN_LOCKED_NEGATIVE,
      match?.falNegative ? stripNonEnglish(match.falNegative) : "",
    ]
      .filter(Boolean)
      .join(", ");
    return {
      prompt: JACHNUN_LOCKED_PROMPT,
      negativePrompt,
      imageSize: "square_hd",
      usedDictionary: true,
      wordCount: wordCount(JACHNUN_LOCKED_PROMPT),
      anchors: JACHNUN_LOCKED_PROMPT.split(/,\s*/).slice(0, 8),
      nicheContext: "jachnun breakfast",
    };
  }

  // ── Garage lift / interior lock: wide workshop, never part macros ──
  if (isGarageLiftScene(blob) || resolveGarageLiftPrompt({
    postGoal: input.postGoal,
    industry: input.industry,
    businessName: input.businessName,
    dictionaryId: match?.id,
  })) {
    const negativePrompt = [
      IRONCLAD_NEGATIVE_PROMPT,
      GARAGE_LIFT_LOCKED_NEGATIVE,
      match?.falNegative ? stripNonEnglish(match.falNegative) : "",
    ]
      .filter(Boolean)
      .join(", ");
    return {
      prompt: GARAGE_LIFT_LOCKED_PROMPT,
      negativePrompt,
      imageSize: "square_hd",
      usedDictionary: Boolean(match?.falPrompt),
      wordCount: wordCount(GARAGE_LIFT_LOCKED_PROMPT),
      anchors: GARAGE_LIFT_LOCKED_PROMPT.split(/,\s*/).slice(0, 8),
      nicheContext: "automotive garage lift",
    };
  }

  let negativePrompt = IRONCLAD_NEGATIVE_PROMPT;

  if (match?.falPrompt?.trim()) {
    let prompt = stripNonEnglish(match.falPrompt);
    prompt = purgeStampTriggers(prompt);
    prompt = ensureCleanPhotoSuffix(prompt);
    if (match.falNegative?.trim()) {
      negativePrompt = `${IRONCLAD_NEGATIVE_PROMPT}, ${stripNonEnglish(match.falNegative)}`;
    }
    const nicheContext =
      stripNonEnglish(match.category || nicheInfo.niche) || nicheInfo.niche;
    return {
      prompt,
      negativePrompt,
      imageSize: "square_hd",
      usedDictionary: true,
      wordCount: wordCount(prompt),
      anchors: prompt.split(/,\s*/).slice(0, 8),
      nicheContext,
    };
  }

  const custom = stripNonEnglish(input.customDetails || "");
  const subject = [
    nicheInfo.anchors.join(", "),
    custom ? `user visual details: ${custom}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  let prompt = [subject, `${nicheInfo.niche} setting`, CAGE_SUFFIX]
    .join(", ")
    .replace(/\s{2,}/g, " ")
    .trim();

  prompt = purgeStampTriggers(stripNonEnglish(prompt));
  prompt = ensureCleanPhotoSuffix(prompt);
  prompt = purgeStampTriggers(prompt);

  return {
    prompt,
    negativePrompt,
    imageSize: "square_hd",
    usedDictionary: false,
    wordCount: wordCount(prompt),
    anchors: nicheInfo.anchors,
    nicheContext: nicheInfo.niche,
  };
}

/**
 * Pre-flight linter before FAL subscribe.
 * - Zero non-English characters
 * - No marketing / watermark-bait tokens
 * - No arbitrary word-count truncation
 * - image_size locked to square_hd
 */
export function lintFalPrompt(opts: {
  prompt: string;
  negativePrompt?: string;
}): PreflightResult {
  const errors: string[] = [];
  let prompt = opts.prompt.trim();
  const negativePrompt = (
    opts.negativePrompt?.trim() || IRONCLAD_NEGATIVE_PROMPT
  ).trim();

  if (
    prompt === JACHNUN_LOCKED_PROMPT ||
    prompt === GARAGE_LIFT_LOCKED_PROMPT
  ) {
    return {
      ok: true,
      prompt,
      negativePrompt,
      imageSize: "square_hd",
      wordCount: wordCount(prompt),
      errors: [],
    };
  }

  if (HEBREW_OR_NON_LATIN.test(prompt)) {
    errors.push("non_english_characters");
    prompt = stripNonEnglish(prompt);
  }

  if (POSITIVE_BANNED.test(prompt)) {
    errors.push("banned_positive_tokens");
    prompt = purgeStampTriggers(prompt);
    POSITIVE_BANNED.lastIndex = 0;
  }

  prompt = ensureCleanPhotoSuffix(prompt);

  if (!prompt || wordCount(prompt) < 6) {
    errors.push("prompt_too_short");
    prompt = purgeStampTriggers(
      ensureCleanPhotoSuffix(
        `${DEFAULT_ANCHORS.join(", ")}, local business setting, ${CAGE_SUFFIX}`,
      ),
    );
  }

  return {
    ok: errors.length === 0,
    prompt,
    negativePrompt,
    imageSize: "square_hd",
    wordCount: wordCount(prompt),
    errors,
  };
}

/** Compile + lint in one shot for the generate pipeline. */
export function compileAndLintFalPrompt(
  input: CompileFalPromptInput,
): CompiledFalPrompt & { lint: PreflightResult } {
  const compiled = compileFalPrompt(input);
  const lint = lintFalPrompt({
    prompt: compiled.prompt,
    negativePrompt: compiled.negativePrompt,
  });
  return {
    ...compiled,
    prompt: lint.prompt,
    negativePrompt: lint.negativePrompt,
    wordCount: lint.wordCount,
    lint,
  };
}
