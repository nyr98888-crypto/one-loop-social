/**
 * Extract & prioritize user-provided visual descriptions from post-goal text
 * (parentheticals, "תמונה:" / "לתאר את התמונה:" markers, etc.).
 */

const VISUAL_LABEL =
  /(?:מומלץ\s*לתאר\s*את\s*התמונה|לתאר\s*את\s*התמונה|תיאור\s*(?:את\s*)?התמונה|תיאור\s*ויזואלי|מה\s*שתרצה\s*לראות\s*בתמונה|visual(?:\s*description)?|describe(?:\s+the\s+image)?|image\s*desc(?:ription)?)\s*[:：\-–]\s*/i;

const VISUAL_HINT =
  /גחנון|מגש|צלחת|שולחן|ביצה|רסק|צילום|תמונה|עץ|חום|אפוי|מאפה|אוכל|מנה|קערה|מחבת|board|plate|tray|wooden|egg|tomato|pastry|food|photo|served|dish|bowl|skillet|table|steam|rustic/i;

export interface PrioritizedVisualConcept {
  /** Marketing / campaign wording with visual chunks removed when possible. */
  marketingGoal: string;
  /** Explicit scene details the user asked to see in the photo. */
  visualFocus: string | null;
  /**
   * Concept string for the Cultural Visual Expander —
   * visual details first, then marketing context.
   */
  conceptForExpand: string;
}

function cleanWhitespace(s: string): string {
  return s.replace(/\s{2,}/g, " ").trim();
}

function pushUnique(list: string[], value: string) {
  const v = cleanWhitespace(value);
  if (v.length < 4) return;
  if (!list.some((x) => x === v || x.includes(v) || v.includes(x))) {
    list.push(v);
  }
}

/**
 * Pull visual focus from free-text post goals so the image pipeline
 * prioritizes what the user wants to *see*, not only the promo copy.
 */
export function prioritizeUserVisualDetails(
  raw: string,
): PrioritizedVisualConcept {
  const text = raw.trim();
  if (!text) {
    return { marketingGoal: "", visualFocus: null, conceptForExpand: "" };
  }

  const focuses: string[] = [];
  let remainder = text;

  // 1) Parenthetical notes — common form: "מבצע … (מומלץ לתאר את התמונה: …)"
  remainder = remainder.replace(/\(([^)]{4,})\)/g, (_m, inner: string) => {
    const labeled = inner.match(
      new RegExp(`${VISUAL_LABEL.source}(.+)$`, "i"),
    );
    if (labeled?.[1]) {
      pushUnique(focuses, labeled[1]);
      return " ";
    }
    if (VISUAL_LABEL.test(inner) || VISUAL_HINT.test(inner)) {
      pushUnique(focuses, inner.replace(VISUAL_LABEL, ""));
      return " ";
    }
    return ` (${inner}) `;
  });

  // 2) Inline labeled visual clause outside parentheses
  const inline = remainder.match(
    new RegExp(`${VISUAL_LABEL.source}(.+)$`, "i"),
  );
  if (inline?.[1]) {
    pushUnique(focuses, inline[1].replace(/[)\]]+$/, ""));
    remainder = remainder.slice(0, inline.index).trim();
  }

  const visualFocus = focuses.length ? focuses.join(". ") : null;
  const marketingGoal = cleanWhitespace(
    remainder.replace(/\(\s*\)/g, ""),
  );

  if (visualFocus) {
    return {
      marketingGoal: marketingGoal || text,
      visualFocus,
      conceptForExpand: [
        `PRIMARY VISUAL SUBJECT (user-specified — prioritize this scene): ${visualFocus}`,
        marketingGoal
          ? `Post / marketing context: ${marketingGoal}`
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  return {
    marketingGoal: text,
    visualFocus: null,
    conceptForExpand: text,
  };
}

/**
 * Merge AI `imagePrompt` with the user's post goal, prioritizing any
 * explicit visual description the user wrote into the goal field.
 */
export function buildPrioritizedImageConcept(input: {
  prompt?: string | null;
  postGoal?: string | null;
  businessName?: string | null;
}): string {
  const postGoal = (input.postGoal ?? "").trim();
  const prompt = (input.prompt ?? "").trim();
  const businessName = (input.businessName ?? "").trim();

  const fromGoal = postGoal ? prioritizeUserVisualDetails(postGoal) : null;
  const fromPrompt = prompt ? prioritizeUserVisualDetails(prompt) : null;

  const visualFocus =
    fromGoal?.visualFocus || fromPrompt?.visualFocus || null;

  const parts: string[] = [];

  if (visualFocus) {
    parts.push(
      `PRIMARY VISUAL SUBJECT (user-specified — prioritize this scene): ${visualFocus}`,
    );
  }

  if (fromGoal?.marketingGoal) {
    parts.push(`Post goal: ${fromGoal.marketingGoal}`);
  } else if (postGoal && !visualFocus) {
    parts.push(`Post goal: ${postGoal}`);
  }

  // AI-drafted image concept is secondary to the user's visual notes
  if (prompt && prompt !== postGoal) {
    const aiConcept = fromPrompt?.marketingGoal || prompt;
    if (aiConcept && aiConcept !== fromGoal?.marketingGoal) {
      parts.push(`Supporting visual concept: ${aiConcept}`);
    }
  }

  if (!parts.length && businessName) {
    parts.push(`Brand commercial photograph for ${businessName}`);
  }

  return parts.join("\n") || prompt || postGoal;
}

/** Universal demo placeholders — accessible to any business niche. */
export const BUSINESS_NAME_PLACEHOLDER =
  "שם העסק שלך (למשל: סטודיו עיצוב, קליניקה, מספרה...)";

export const INDUSTRY_PLACEHOLDER = "תחום העיסוק";

export const POST_GOAL_PLACEHOLDER =
  "לדוגמה: שיתוף פרויקט אחרון, מבצע מיוחד לשבוע הקרוב, או הצגת שירות הדגל...";

export const AI_IMAGE_DESCRIPTION_PLACEHOLDER =
  "לדוגמה: צילום נקי ומואר של המוצר או חלל העבודה, בסגנון מקצועי ומזמין...";

export const POST_GOAL_VISUAL_TIP =
  "💡 טיפ: ציין את מטרת הפוסט, ואם יש אווירה או אלמנט שחשוב שיופיעו בתמונה – תאר אותם בקצרה כדי שה-AI יתאים אותה במדויק.";
