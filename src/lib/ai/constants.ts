import { enrichImagePromptForGenerator } from "./cultural-food-prompts";
import {
  resolveIndustryVisualPolicy,
  stripAccidentalPeopleTokens,
} from "./industry-visual";

export const OPENROUTER_URL =
  "https://openrouter.ai/api/v1/chat/completions";

/** Default for legacy callers (bio / review / marketing post). */
export const OPENROUTER_MODEL = "openai/gpt-4o-mini";

/**
 * Cascade Tier 1A — OpenAI GPT-4o via OpenRouter (highest quality).
 */
export const OPENROUTER_GENERATE_FALLBACK_MODEL = "openai/gpt-4o";
/** Cascade Tier 1B — GPT-4o-mini (in-provider secondary). */
export const OPENROUTER_GENERATE_SECONDARY_MODEL = "openai/gpt-4o-mini";

export const TOGETHER_URL = "https://api.together.xyz/v1";
/** @deprecated Llama 70B needs a dedicated Together endpoint — not in cascade. */
export const TOGETHER_LLAMA_MODEL =
  "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo";
/** Cascade Tier 2A — Together serverless DeepSeek Flash. */
export const TOGETHER_MODEL = "deepseek-ai/DeepSeek-V4.1-Flash";
/** Cascade Tier 2B — Together serverless Qwen. */
export const TOGETHER_SECONDARY_MODEL = "Qwen/Qwen3.5-9B";

export const MARKETING_SYSTEM_PROMPT = `אתה סוכן שיווק ישראלי חד, מקצועי וממוקד לעסקים מקומיים (כגון מוסכים, קליניקות, בעלי מקצוע, בתי אוכל, מאפיות).
המטרה שלך: לכתוב פוסטים שנשמעים אותנטיים, חדים ומניעים לפעולה מהירה בוואטסאפ — עם CTA שמתאים בדיוק לסוג העסק.
חוקי ברזל:
1. בלי קלישאות שיווקיות ריקות ובלי חפירות.
2. כתיבה ישראלית טבעית, מדויקת, עם אימוג'ים במידה נכונה.
3. התאמה קולעת למטרת הפוסט ולתחום העסק.
4. כוונת תעשייה (קריטי — אל תערבב):
   - אוכל / מאפייה / בית קפה: CTA רק בסגנון «שמור לי מארז / הזמן מראש» או «תפריט משלוחים». אסור «לקבוע תור» / זימון פגישה.
   - יופי / קליניקה / טיפולים: CTA «קביעת תור / בדיקת זמינות».
   - שירותים / שיפוצים / בעלי מקצוע: CTA «קבלת הצעת מחיר / ייעוץ מהיר».
5. החזר תמיד JSON תקין עם:
   - \`headline\`: כותרת קצרה וקולעת
   - \`instagramCaption\`: גרסת אינסטגרם מהודקת עם 3-4 האשטגים רלוונטיים + CTA תואם תעשייה
   - \`facebookCaption\`: גרסת פייסבוק מפורטת עם הנעה ברורה לוואטסאפ + CTA תואם תעשייה
   - \`imagePrompt\`: תיאור ויזואלי באנגלית בלבד למחולל התמונות.
כללי imagePrompt (קריטי):
- התאם את הסצנה לתחום העסק. לאדריכלות / עיצוב פנים / נדל״ן / דקור — תאר חלל מעוצב, ריהוט ותאורה בלבד. אסור להוסיף אנשים, פנים או דיוקנאות אלא אם מטרת הפוסט מבקשת במפורש אדם/אישה/גבר/עובד/פנים.
- דוגמה לעיצוב פנים: "stunning architectural interior photograph, professionally designed modern living space, elegant furniture, high-end interior styling, warm natural daylight, magazine feature, wide angle, clean perspective".
- אם מופיע מאכל ישראלי/תרבותי בעברית (למשל גחנון / מלאווח / חומוס / פלאפל / שקשוקה / סביח / כנאפה / בורקס / שווארמה) — אל תשאיר את השם בעברית או כתעתיק בלבד. תרגם אותו לתיאור ויזואלי באנגלית מפורט: צורה, צבע, מרקם, הגשה, תאורה, צילום אוכל מקצועי.
- Prefer bright, warm, high-key lighting. Never use dim, moody, cinematic shadow, or dark desaturated modifiers.
- Do NOT include words like "award-winning", "badge", "logo", or "text" in the visual prompt to prevent fake seals or gibberish badges from appearing on the image.
- No watermarks, seals, emblems, captions, or typography baked into the scene.`;

/** Unified Instagram + Facebook + WhatsApp + FAL — homepage Smile Grid generator. */
export const UNIFIED_CAMPAIGN_SYSTEM_PROMPT = `You are an expert Israeli social marketing manager writing authentic Hebrew copy for local businesses.

CRITICAL — NEVER echo the user's raw input verbatim. Rewrite into fresh marketing voice. Paraphrase facts; invent natural hooks. Do NOT paste postGoal / smartPrompt as the caption.

CTAs and FAL prompts are LOCKED by the server — copy locked ctaText verbatim when provided. Never invent appointment language for food/bakery.

Domain rules (code will also enforce):
- Food / bakery / café → order / reserve package / delivery ONLY. NEVER «קביעת תור».
- Beauty / clinic / salon → appointment / availability.
- Services / trades / garage → quote / consult.

Platform voice (mandatory):
- Instagram: compelling hook headline; caption = 2 engaging body paragraphs with emojis + line breaks; clear CTA line; 5–6 hashtags (hashtags array only — not inside caption).
- Facebook: friendly conversational community story (not the IG caption copy-paste); end with an engaging question that invites comments.
- WhatsApp broadcastMessage: authentic 1-to-many community announcement with a direct «ענו / שלחו הודעה» reply instruction. Separately fill leadIncomingMessage + businessAutoReply for the chat simulation.

Return STRICT JSON only (no markdown) with this shape:
{
  "instagram": {
    "headline": "short Hebrew hook with light emoji",
    "caption": "2 Hebrew paragraphs with emojis + line breaks, ending with clear CTA (NO hashtags here)",
    "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6"],
    "ctaText": "LOCKED CTA from user message — copy verbatim"
  },
  "facebook": {
    "caption": "friendly Hebrew community story + engaging question for comments"
  },
  "whatsapp": {
    "broadcastMessage": "1-to-many Hebrew announcement with reply instruction",
    "leadIncomingMessage": "natural Hebrew customer inquiry matching the offer",
    "businessAutoReply": "warm Hebrew business reply continuing that conversation",
    "actionButton": "short Hebrew WhatsApp action label"
  },
  "falImagePrompt": "English visual stub (server may overwrite with golden dictionary prompt)",
  "imagePrompt": "same as falImagePrompt"
}

=== FEW-SHOT 1 (food / order_reserve) ===
INPUT: businessName="ג'חנון הבוסתן", industry="מאפייה תימנית", postGoal="ג'חנון, מארזים חמים לשבת...", locked ctaText="לשריון מארז לשבת"
OUTPUT:
{
  "instagram": {
    "headline": "הג'חנון של שבת כבר בתנור ☀️",
    "caption": "ריח של בצק חם ממלא את השכונה — שכבות זהובות, רסק טרי וביצה חומה בדיוק כמו שצריך.\\n\\nנשארו מארזים אחרונים לאיסוף או משלוח. לשריון מארז לשבת — ענו כאן 👇",
    "hashtags": ["#גחנון", "#מאפייה", "#שבת", "#אוכלתימני", "#מארזים", "#ישראל"],
    "ctaText": "לשריון מארז לשבת"
  },
  "facebook": {
    "caption": "חברים, מי כבר מתכנן את שולחן השבת? 🥐\\nהיום יצאו מהתנור מארזים חמים עם רסק וביצה — בדיוק כמו פעם.\\nמי בא לקחת, ומי מעדיף משלוח? ספרו לנו בתגובות 💬"
  },
  "whatsapp": {
    "broadcastMessage": "שבת שלום! ☀️ הג'חנון החם מהתנור עם רסק וסחוג מוכן.\\nנשארו מארזים אחרונים — ענו להודעה הזו כדי לשריין איסוף או משלוח 👇",
    "leadIncomingMessage": "היי, ראיתי את הג'חנון בפוסט — אפשר לשמור לי מארז לשבת?",
    "businessAutoReply": "בטח! 🥐 לאיזו שעה נוח לך לאסוף? נשמור לך חם וטרי.",
    "actionButton": "שמור לי ג'חנון לשבת"
  },
  "falImagePrompt": "GOLDEN_LOCKED:jachnun",
  "imagePrompt": "GOLDEN_LOCKED:jachnun"
}

=== FEW-SHOT 2 (beauty / book_appointment) ===
INPUT: businessName="ברבר רחובות", industry="מספרת גברים", postGoal="תספורת ועיצוב זקן לסופ״ש", locked ctaText="לקביעת תור מהירה"
OUTPUT:
{
  "instagram": {
    "headline": "2 מקומות אחרונים לסופ״ש 💈",
    "caption": "תספורת וסידור זקן מדויק לפני שהיומן נסגר.\\n\\nאל תחכו לרגע האחרון — שריינו תור בוואטסאפ בלחיצה אחת 👇",
    "hashtags": ["#ברבר", "#תספורת", "#עיצובזקן", "#גברים", "#סופש", "#רחובות"],
    "ctaText": "לקביעת תור מהירה"
  },
  "facebook": {
    "caption": "סופ״ש בפתח ואתם עדיין בלי תספורת? 😄\\nפתחנו שני מקומות אחרונים לעיצוב שיער וזקן.\\nמי כבר קבע ומי עוד מתלבט? כתבו לנו בתגובות!"
  },
  "whatsapp": {
    "broadcastMessage": "💈 נשארו 2 מקומות לסופ״ש — תספורת + עיצוב זקן.\\nענו להודעה הזו ונשמור לכם תור.",
    "leadIncomingMessage": "היי, ראיתי את הפוסט — אפשר לבדוק תורים פנויים לתספורת?",
    "businessAutoReply": "בשמחה 😊 איזה יום ושעה נוחים לך? נבדוק ונשמור.",
    "actionButton": "בדיקת תורים פנויים"
  },
  "falImagePrompt": "GOLDEN_LOCKED:barbershop",
  "imagePrompt": "GOLDEN_LOCKED:barbershop"
}

When needFalImagePrompt is false, still return falImagePrompt/imagePrompt as short English docs (prefix user_uploaded_photo: if a photo is attached).
Hebrew only in instagram / facebook / whatsapp text fields.`;

/** Standard negative prompt attached to FAL Flux calls from unified generate. */
export const FAL_STANDARD_NEGATIVE_PROMPT =
  "blurry, distorted, low quality, deformed, text, overlay, messy, watermark, logo stamp, badge, seal, gibberish typography, caption overlay";

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

/** Prepended when no stronger category prefix applies — no portrait/skin bias. */
export const COMMERCIAL_PHOTO_PREFIX =
  "real photograph, high-key warm softbox lighting, luminous clean background, crisp sharp focus, tactile textures, vibrant natural colors, shallow depth of field";

/** Strict negative constraints (baked into Flux prompts; Flux has no native negative_prompt). */
export const COMMERCIAL_NEGATIVE_PROMPT =
  "dim lighting, moody shadows, cinematic darkness, dark desaturated colors, underexposed, murky atmosphere, distorted faces, extra limbs, weird masks, welding mask, pregnancy, cartoon, 3d render, creepy eyes, blurry, amateur photo, dirty clutter, stock watermark, badge, seal, emblem, logo stamp, award ribbon, gibberish text, fake typography, caption overlay, award-winning plaque";

export const COMMERCIAL_FOCUS_HINT =
  "Focus on the real subject matching the business category: interiors, products, food, vehicles, tools, or finished work. No logos, badges, seals, or readable text in the frame.";

export const FAL_MODELS = {
  /**
   * Exclusive flagship photorealism engine for AI generate (txt2img).
   * All studio generate calls go through FAL only — never third-party / mocks.
   */
  fluxPro: "fal-ai/flux-pro/v1.1",
  /** In-FAL secondary — Recraft V3 realistic_image (used if Flux Pro fails). */
  recraft: "fal-ai/recraft-v3",
  /** Optional food reference path — Recraft V3 image-to-image (still FAL). */
  recraftImg2Img: "fal-ai/recraft/v3/image-to-image",
  /** @deprecated alias → Flux Pro */
  schnell: "fal-ai/flux-pro/v1.1",
  /** @deprecated alias → Flux Pro */
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

/** Hardcoded exclusive AI image model id for generate. */
export const FAL_FLAGSHIP_IMAGE_MODEL = FAL_MODELS.fluxPro;

/** Recraft img2img strength when a local food reference is available. */
export const RECRAFT_REFERENCE_STRENGTH = 0.6;

/** Strict negatives for Layer 2 commercial environment enhancement. */
export const ENHANCE_ENVIRONMENT_NEGATIVE =
  "distorted faces, extra limbs, weird masks, cartoon, blurry, clutter, watermark, side-by-side comparison, split screen, before and after collage, dual faces, diptych, montage, baked-in text overlay, caption text, watermark logo text";

/** Negatives for natural enhance — no BG swap, no marketing text baked in. */
export const ENHANCE_NATURAL_NEGATIVE =
  "background replacement, studio backdrop, green screen, side-by-side comparison, split screen, before and after, dual faces, collage, montage, heavy text overlay, marketing slogan, watermark, logo stamp";

/** Safe commercial niche presets for Layer 2 background replacement. */
export const INDUSTRY_BACKGROUND_PRESETS: Record<string, string> = {
  automotive:
    "Pristine modern garage showroom, polished epoxy floor, organized tool chest in background, bright commercial showroom lighting, sleek aesthetic.",
  cosmetics:
    "Luxury marble aesthetic counter, soft natural greenery background, bright spa softbox lighting, luminous clean setting.",
  beauty:
    "Luxury marble aesthetic counter, soft natural greenery background, bright spa softbox lighting, luminous clean setting.",
  interior:
    "Professionally designed modern living space, elegant furniture, high-end interior styling, warm natural daylight, empty of people, magazine feature architecture.",
  general:
    "Clean architectural workshop, bright even commercial lighting, organized professional environment, luminous background.",
  default:
    "Clean architectural workshop, bright even commercial lighting, organized professional environment, luminous background.",
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
  if (
    key.includes("אדריכל") ||
    key.includes("עיצוב") ||
    key.includes("interior") ||
    key.includes("architect") ||
    key.includes("נדל") ||
    key.includes("decor") ||
    key.includes("ריהוט")
  ) {
    return INDUSTRY_BACKGROUND_PRESETS.interior;
  }

  return INDUSTRY_BACKGROUND_PRESETS.general;
}

export function buildCommercialPrompt(
  userPrompt: string,
  opts?: { industry?: string | null; postGoal?: string | null },
): string {
  const policy = resolveIndustryVisualPolicy({
    industry: opts?.industry,
    postGoal: opts?.postGoal,
    prompt: userPrompt,
  });

  let cleaned = enrichImagePromptForGenerator(userPrompt);
  if (policy.isInterior && !policy.allowPeople) {
    cleaned = stripAccidentalPeopleTokens(cleaned);
  }

  const focusHint =
    policy.isInterior && !policy.allowPeople
      ? "Focus strictly on the architectural interior / designed space. Empty of people. No faces, portraits, or human figures."
      : COMMERCIAL_FOCUS_HINT;

  // Recraft V3 — clean positive prompt only (no Schnell negative baking)
  return [policy.photoPrefix, cleaned, focusHint].filter(Boolean).join(" ");
}
