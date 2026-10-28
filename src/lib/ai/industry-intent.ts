/**
 * Context-aware industry CTAs & lead-inquiry copy.
 * Prevents mismatched intents (e.g. "קביעת תור" for a bakery).
 */

export type IndustryIntent =
  | "food"
  | "beauty"
  | "services"
  | "generic";

export type IndustryCtaBundle = {
  intent: IndustryIntent;
  /** Primary CTA phrase for captions / posts */
  ctaPrimary: string;
  /** Alternate CTA */
  ctaAlt: string;
  /** Incoming WhatsApp lead inquiry (Hebrew) */
  leadInquiry: string;
  /** Business reply seed */
  businessReply: string;
  /** Follow-up from lead */
  leadFollowUp: string;
  /** Prompt block injected into the marketing generator */
  promptGuidance: string;
};

const FOOD_KEYS =
  /מאפי|מאפה|בייקרי|bakery|cafe|קפה|בית.?קפה|מסעד|אוכל|מזון|קונדיטור|פטיסרי|פיצה|המבורגר|שווארמה|פלאפל|חומוס|באר|pub|food|restaurant|חלבי|בשרי|קייטרינג|מארז|משלוח.?אוכל/i;

const BEAUTY_KEYS =
  /יופי|קוסמטי|מספר|סלון|ציפורנ|לק|spa|ספא|קליניק|רפוא|רופא|טיפול|עיסוי|שיער|ברבר|beauty|clinic|dental|שיניי|אורתוד|פיזיותרפ|פסיכולוג|נטורופ/i;

const SERVICES_KEYS =
  /שיפוצ|בני|קבלנ|שיפוץ|אינסטל|חשמל|מיזוג|הובל|ניקיון|גינון|אדריכל|עיצוב.?פנים|נדל|renovat|contractor|שירות|ייעוץ|הצעת.?מחיר|מוסך|רכב|טכנאי|תיקון/i;

export function resolveIndustryIntent(
  industry?: string | null,
  postGoal?: string | null,
  businessName?: string | null,
): IndustryIntent {
  const blob = `${industry ?? ""} ${postGoal ?? ""} ${businessName ?? ""}`;
  if (FOOD_KEYS.test(blob)) return "food";
  if (BEAUTY_KEYS.test(blob)) return "beauty";
  if (SERVICES_KEYS.test(blob)) return "services";
  return "generic";
}

const BUNDLES: Record<IndustryIntent, IndustryCtaBundle> = {
  food: {
    intent: "food",
    ctaPrimary: "שמור לי מארז / הזמן מראש",
    ctaAlt: "תפריט משלוחים",
    leadInquiry:
      "היי, ראיתי את המאפים הטריים של הבוקר, אפשר לשמור לי מארז לאיסוף?",
    businessReply: "בטח! 🥐 לאיזו שעה נוח לך לאסוף? נשמור לך חם וטרי.",
    leadFollowUp: "מעולה, בסביבות 11:00. תודה רבה! 🙌",
    promptGuidance: [
      "קטגוריית כוונה: אוכל / מאפייה / בית קפה.",
      "CTA מותרים בלבד: «שמור לי מארז / הזמן מראש» או «תפריט משלוחים» / הזמנה לאיסוף או משלוח.",
      "אסור לחלוטין: קביעת תור, זימון פגישה, «לקבוע תור למאפייה», או שפת קליניקה/סלון.",
      "הנעה לפעולה בוואטסאפ: שמירת מארז, הזמנה מראש, תפריט, איסוף/משלוח.",
    ].join("\n"),
  },
  beauty: {
    intent: "beauty",
    ctaPrimary: "קביעת תור / בדיקת זמינות",
    ctaAlt: "בדיקת זמינות בוואטסאפ",
    leadInquiry:
      "היי, ראיתי את הפוסט שלכם — אפשר לבדוק זמינות ולקבוע תור?",
    businessReply: "בשמחה 😊 לאיזה יום ושעה נוח לך? נבדוק זמינות.",
    leadFollowUp: "מחר בבוקר מושלם. תודה רבה! 🙌",
    promptGuidance: [
      "קטגוריית כוונה: יופי / קליניקה / טיפולים.",
      "CTA מותרים: «קביעת תור / בדיקת זמינות».",
      "הימנע משפת הזמנת מארזים/משלוחי אוכל אלא אם העסק באמת מוכר מוצרים.",
    ].join("\n"),
  },
  services: {
    intent: "services",
    ctaPrimary: "קבלת הצעת מחיר / ייעוץ מהיר",
    ctaAlt: "ייעוץ מהיר בוואטסאפ",
    leadInquiry:
      "היי, ראיתי את העבודה שלכם בפוסט — אפשר לקבל הצעת מחיר / ייעוץ מהיר?",
    businessReply: "בשמחה! ספרו בקצרה מה צריך ונחזור עם הצעה מסודרת.",
    leadFollowUp: "אשלח פרטים היום. תודה! 🙌",
    promptGuidance: [
      "קטגוריית כוונה: שירותים / שיפוצים / בעלי מקצוע.",
      "CTA מותרים: «קבלת הצעת מחיר / ייעוץ מהיר».",
      "אסור: קביעת תור רפואי/יופי או הזמנת מארזי אוכל — אלא אם רלוונטי במפורש.",
    ].join("\n"),
  },
  generic: {
    intent: "generic",
    ctaPrimary: "שלחו הודעה בוואטסאפ לפרטים",
    ctaAlt: "לפרטים נוספים",
    leadInquiry:
      "היי! ראיתי את הפוסט שלכם — אפשר לקבל פרטים נוספים?",
    businessReply: "בשמחה 😊 נשמח לעזור. מה תרצו לדעת?",
    leadFollowUp: "אשמח שיחזרו אליי. תודה! 🙌",
    promptGuidance: [
      "קטגוריית כוונה: כללית — התאם את ה-CTA לאופי העסק ולמטרת הפוסט.",
      "לעולם אל תשתמש ב«קביעת תור» לעסקי אוכל/מאפייה/בית קפה.",
      "לעולם אל תשתמש בהזמנת מארזים לעסקי יופי/קליניקה אלא אם מוכרים מוצר פיזי.",
    ].join("\n"),
  },
};

export function getIndustryCtaBundle(
  industry?: string | null,
  postGoal?: string | null,
  businessName?: string | null,
): IndustryCtaBundle {
  return BUNDLES[resolveIndustryIntent(industry, postGoal, businessName)];
}

/** Build a lead inquiry that references the actual post item when available. */
export function buildContextualLeadInquiry(opts: {
  industry?: string | null;
  postGoal?: string | null;
  businessName?: string | null;
  headline?: string | null;
  isGenerated?: boolean;
}): string {
  const bundle = getIndustryCtaBundle(
    opts.industry,
    opts.postGoal,
    opts.businessName,
  );
  const item = (opts.headline || opts.postGoal || "").trim();

  if (bundle.intent === "food") {
    if (opts.isGenerated && item) {
      return `היי, ראיתי את ${item} בפוסט — אפשר לשמור לי מארז לאיסוף?`;
    }
    return bundle.leadInquiry;
  }

  if (opts.isGenerated && item) {
    if (bundle.intent === "beauty") {
      return `היי, ראיתי את הפוסט על ${item} — אפשר לבדוק זמינות ולקבוע תור?`;
    }
    if (bundle.intent === "services") {
      return `היי, ראיתי את ${item} בפוסט — אפשר לקבל הצעת מחיר / ייעוץ מהיר?`;
    }
    return `היי! ראיתי את הפוסט על ${item} — אפשר לקבל פרטים?`;
  }

  return bundle.leadInquiry;
}

/** Hebrew block appended to the marketing user prompt. */
export function buildIndustryIntentPromptBlock(
  industry?: string | null,
  postGoal?: string | null,
  businessName?: string | null,
): string {
  const bundle = getIndustryCtaBundle(industry, postGoal, businessName);
  return [
    "",
    "=== התאמת כוונת תעשייה (חובה) ===",
    bundle.promptGuidance,
    `CTA מומלץ לשימוש בקופי: «${bundle.ctaPrimary}» (או «${bundle.ctaAlt}»).`,
    `דוגמת פניית לקוח בוואטסאפ שצריכה להרגיש טבעית אחרי הפוסט: «${bundle.leadInquiry}»`,
    "שלב את ה-CTA באופן טבעי בכיתובים (instagramCaption / facebookCaption).",
  ].join("\n");
}
