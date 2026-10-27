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
  relight: "fal-ai/image-apps-v2/relighting",
  upscale: "fal-ai/topaz/upscale/image",
} as const;

export function buildCommercialPrompt(userPrompt: string): string {
  const cleaned = userPrompt.trim();
  return [
    COMMERCIAL_PHOTO_PREFIX,
    cleaned,
    COMMERCIAL_FOCUS_HINT,
    `Strictly avoid: ${COMMERCIAL_NEGATIVE_PROMPT}.`,
  ].join(" ");
}
