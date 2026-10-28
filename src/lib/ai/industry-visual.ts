/**
 * Category-aware visual prompt rules — prevent random face/portrait hallucinations
 * for architecture, interior design, décor, and real-estate businesses.
 */

export const INTERIOR_DESIGN_PHOTO_PREFIX =
  "stunning architectural interior photograph, professionally designed modern living space, elegant furniture, high-end interior styling, warm natural daylight, magazine feature, 8k resolution, crisp detail, wide angle, clean perspective";

export const INTERIOR_NO_PEOPLE_NEGATIVE =
  "person, people, human, humans, face, faces, portrait, model, woman, man, child, crowd, silhouette of a person, hands holding, selfie, headshot, body, group photo";

const INTERIOR_INDUSTRY =
  /אדריכל|עיצוב\s*פנים|עיצוב|interior|architect|décor|decor|נדל.?ן|נדלן|real\s*estate|property|furniture|ריהוט|דירה|חלל|הום.?סטיילינג|home\s*stag|staging|עיצובי/i;

const PEOPLE_REQUEST =
  /אדם|אנשים|אישה|גבר|עובד|עובדים|פנים|לקוח|לקוחה|מודל|צוות|בעלים|portrait|person|people|woman|man|face|faces|worker|team|customer|client|selfie|headshot/i;

const PEOPLE_STRIP =
  /\b(person|people|human|humans|man|woman|men|women|child|children|face|faces|portrait|headshot|model|models|crowd|silhouette|body|bodies|worker|workers|customer|client|team|people\s+standing|smiling\s+(?:woman|man|person))\b/gi;

/** Default commercial look — no portrait/skin language (avoids random faces). */
export const SAFE_COMMERCIAL_PHOTO_PREFIX =
  "professional commercial photography, high-key warm softbox lighting, luminous clean background, crisp sharp focus, 8k resolution, vibrant natural colors";

export function isInteriorDesignIndustry(industry?: string | null): boolean {
  const key = (industry ?? "").trim();
  if (!key) return false;
  return INTERIOR_INDUSTRY.test(key);
}

/** True only when the user explicitly asked for people/faces in מטרת הפוסט. */
export function postGoalRequestsPeople(
  postGoal?: string | null,
  extraText?: string | null,
): boolean {
  const blob = `${postGoal ?? ""}\n${extraText ?? ""}`;
  return PEOPLE_REQUEST.test(blob);
}

export function stripAccidentalPeopleTokens(prompt: string): string {
  return prompt
    .replace(PEOPLE_STRIP, "")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Resolve the category-aware photo prefix + whether people are allowed.
 */
export function resolveIndustryVisualPolicy(input: {
  industry?: string | null;
  postGoal?: string | null;
  prompt?: string | null;
}): {
  isInterior: boolean;
  allowPeople: boolean;
  photoPrefix: string;
  extraNegatives: string;
} {
  const isInterior = isInteriorDesignIndustry(input.industry);
  const allowPeople = postGoalRequestsPeople(input.postGoal, input.prompt);

  if (isInterior && !allowPeople) {
    return {
      isInterior: true,
      allowPeople: false,
      photoPrefix: INTERIOR_DESIGN_PHOTO_PREFIX,
      extraNegatives: INTERIOR_NO_PEOPLE_NEGATIVE,
    };
  }

  return {
    isInterior,
    allowPeople,
    photoPrefix: SAFE_COMMERCIAL_PHOTO_PREFIX,
    extraNegatives: allowPeople
      ? ""
      : "random stranger portrait, unrelated face, stock model headshot",
  };
}
