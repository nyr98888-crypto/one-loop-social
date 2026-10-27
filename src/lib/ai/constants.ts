export const OPENROUTER_URL =
  "https://openrouter.ai/api/v1/chat/completions";

export const OPENROUTER_MODEL = "openai/gpt-4o-mini";

export const MARKETING_SYSTEM_PROMPT = `אתה סוכן שיווק ישראלי חד, מקצועי וממוקד לעסקים מקומיים (כגון מוסכים, קליניקות, בעלי מקצוע).
המטרה שלך: לכתוב פוסטים שנשמעים אותנטיים, חדים ומניעים לפעולה מהירה בוואטסאפ.
חוקי ברזל:
1. בלי קלישאות שיווקיות ריקות ובלי חפירות.
2. כתיבה ישראלית טבעית, מדויקת, עם אימוג'ים במידה נכונה.
3. התאמה קולעת למטרת הפוסט ולתחום העסק.
4. החזר תמיד JSON תקין עם:
   - \`headline\`: כותרת קצרה וקולעת
   - \`instagramCaption\`: גרסת אינסטגרם מהודקת עם 3-4 האשטגים רלוונטיים
   - \`facebookCaption\`: גרסת פייסבוק מפורטת עם הנעה ברורה לוואטסאפ
   - \`imagePrompt\`: תיאור באנגלית לצילום מסחרי נקי עבור מחולל התמונות.`;

export const WHATSAPP_BIO_SYSTEM_PROMPT = `אתה קופירייטר ישראלי ל־WhatsApp Business Profile.
צור ביו עסקי חד, מסודר ומוכן להדבקה בפרופיל — עברית טבעית, אימוג'ים במידה, נקודות bullet, בלי קלישאות.
מגבלות:
- הביו עד ~500 תווים (WhatsApp About).
- כלול שירותים מובילים, אזור פעילות ושעות פתיחה כשיש נתונים.
- צור הודעת פתיחה קצרה ללקוח (greeting) בעברית.
החזר JSON תקין בלבד עם השדות: bio, tagline, greeting.`;

export const REVIEW_REPLY_SYSTEM_PROMPT = `אתה מנהל מוניטין ישראלי לעסקים מקומיים.
כתוב תגובה חמה, מקצועית ואנושית לביקורת לקוח — בעברית טבעית.
חוקים:
1. פנה בשם הלקוח כשיש שם.
2. הודה על המשוב; בביקורת נמוכה הכר בבעיה והצע פתרון בלי להתנצל יתר על המידה.
3. בלי קלישאות ריקות, בלי אימוג'ים מוגזמים (עד 1–2).
4. אורך: 2–4 משפטים, מוכן להדבקה ב־Google / איזי.
החזר JSON תקין בלבד עם השדה: reply.`;

/** Prepended to every image generation prompt. */
export const COMMERCIAL_PHOTO_PREFIX =
  "Award-winning commercial product/service photography, high-end commercial advertising lighting, shot on 35mm lens, 8k resolution, crisp photorealistic, pristine professional setting.";

/** Strict negative constraints (baked into Flux prompts; Flux has no native negative_prompt). */
export const COMMERCIAL_NEGATIVE_PROMPT =
  "distorted faces, extra limbs, weird masks, welding mask, pregnancy, cartoon, 3d render, creepy eyes, blurry, amateur photo, dirty clutter, stock watermark";

export const COMMERCIAL_FOCUS_HINT =
  "Focus on the environment, vehicles, tools, aesthetic products, and pristine finished work. No grotesque or distorted human anatomy.";

export const FAL_MODELS = {
  schnell: "fal-ai/flux/schnell",
  pro: "fal-ai/flux-pro/v1.1",
  /** Layer 1 — upscale & de-noise */
  clarity: "fal-ai/clarity-upscaler",
  /** Legacy Topaz upscale (kept for callers outside the 4-layer pipeline) */
  upscale: "fal-ai/topaz/upscale/image",
  /** Layer 2 — commercial background replacement */
  background: "fal-ai/bria/background/replace",
  /** Layer 3 — IC-Light studio relighting (primary) */
  iclight: "fal-ai/iclight-v2",
  /** Layer 3 fallback — simpler relighting app */
  relight: "fal-ai/image-apps-v2/relighting",
} as const;

/** Strict negatives for Layer 2 commercial environment enhancement. */
export const ENHANCE_ENVIRONMENT_NEGATIVE =
  "distorted faces, extra limbs, weird masks, cartoon, blurry, clutter, watermark, side-by-side comparison, split screen, before and after collage, dual faces, diptych, montage, baked-in text overlay, caption text, watermark logo text";

/** Negatives for natural enhance — no BG swap, no marketing text baked in. */
export const ENHANCE_NATURAL_NEGATIVE =
  "background replacement, studio backdrop, green screen, side-by-side comparison, split screen, before and after, dual faces, collage, montage, heavy text overlay, marketing slogan, watermark, logo stamp";

/** Safe commercial niche presets for Layer 2 background replacement. */
export const INDUSTRY_BACKGROUND_PRESETS: Record<string, string> = {
  automotive:
    "Pristine modern garage showroom, polished epoxy floor, organized tool chest in background, sleek aesthetic.",
  cosmetics:
    "Luxury marble aesthetic counter, soft natural greenery background, spa lighting.",
  beauty:
    "Luxury marble aesthetic counter, soft natural greenery background, spa lighting.",
  general:
    "Clean architectural workshop, soft depth of field, organized professional environment.",
  default:
    "Clean architectural workshop, soft depth of field, organized professional environment.",
};

export type EnhanceAspectRatio = "1:1" | "16:9" | "4:5";

/** Map active social platform → Layer 4 crop ratio. */
export function resolveEnhanceAspectRatio(
  targetPlatform?: string | null,
): EnhanceAspectRatio {
  const p = (targetPlatform ?? "").trim().toLowerCase();
  if (p === "instagram") return "1:1";
  if (p === "facebook" || p === "linkedin") return "16:9";
  // Feed / WhatsApp / easy / Google / default
  return "4:5";
}

export function resolveIndustryBackgroundPrompt(industry: string): string {
  const key = industry.trim().toLowerCase();
  if (!key) return INDUSTRY_BACKGROUND_PRESETS.general;

  if (
    key.includes("auto") ||
    key.includes("garage") ||
    key.includes("מוסך") ||
    key.includes("רכב") ||
    key === "automotive"
  ) {
    return INDUSTRY_BACKGROUND_PRESETS.automotive;
  }
  if (
    key.includes("cosmetic") ||
    key.includes("beauty") ||
    key.includes("spa") ||
    key.includes("קוסמט") ||
    key.includes("יופי")
  ) {
    return INDUSTRY_BACKGROUND_PRESETS.cosmetics;
  }

  return INDUSTRY_BACKGROUND_PRESETS.general;
}

export function buildCommercialPrompt(userPrompt: string): string {
  const cleaned = userPrompt.trim();
  return [
    COMMERCIAL_PHOTO_PREFIX,
    cleaned,
    COMMERCIAL_FOCUS_HINT,
    `Strictly avoid: ${COMMERCIAL_NEGATIVE_PROMPT}.`,
  ].join(" ");
}
