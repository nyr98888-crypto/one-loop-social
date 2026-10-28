import { existsSync } from "fs";
import path from "path";

/**
 * Highly-specific Israeli / cultural foods where geometry benefits from a
 * local base photo under `public/assets/reference/`.
 * Keys are dictionary IDs or canonical slugs; values are filename stems to try.
 */
const FOOD_REFERENCE_ALIASES: Record<string, string[]> = {
  jachnun: ["jachnun", "jachnoon"],
  home_food_kubbeh: ["kubbeh", "kubeh", "home_food_kubbeh"],
  kubbeh: ["kubbeh", "kubeh", "home_food_kubbeh"],
  malawach: ["malawach", "malawah"],
  hummus: ["hummus", "humus"],
  falafel: ["falafel"],
  shakshuka: ["shakshuka"],
  sabich: ["sabich"],
  bourekas: ["bourekas", "burekas"],
  shawarma: ["shawarma"],
  knafeh: ["knafeh", "kanafeh"],
  home_food_chraime: ["chraime", "home_food_chraime"],
  home_food_chamin: ["chamin", "cholent", "home_food_chamin"],
  challah_schnitzel: ["challah_schnitzel", "schnitzel"],
  rugelach: ["rugelach"],
};

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp"] as const;

function referenceDir(): string {
  return path.join(process.cwd(), "public", "assets", "reference");
}

function stemsForSlug(slug: string): string[] {
  const key = slug.trim().toLowerCase();
  if (!key) return [];
  const aliases = FOOD_REFERENCE_ALIASES[key];
  if (aliases?.length) return [...new Set(aliases)];
  // Strip home_food_ prefix for opportunistic filename match
  const stripped = key.replace(/^home_food_/, "");
  return [...new Set([key, stripped].filter(Boolean))];
}

/**
 * Detect a specific food slug from dictionary id + free text (Hebrew/English).
 */
export function detectSpecificFoodSlug(opts: {
  dictionaryId?: string | null;
  text?: string | null;
}): string | null {
  const id = opts.dictionaryId?.trim().toLowerCase();
  if (id && (FOOD_REFERENCE_ALIASES[id] || id.startsWith("home_food_"))) {
    return id;
  }

  const blob = (opts.text ?? "").toLowerCase();
  if (!blob.trim()) return null;

  const patterns: Array<{ slug: string; re: RegExp }> = [
    { slug: "jachnun", re: /ג['׳']?חנון|jachnun/i },
    { slug: "kubbeh", re: /קוב(?:ה|בה)|kubbeh|kubeh/i },
    { slug: "malawach", re: /מלאווח|malawach|malawah/i },
    { slug: "hummus", re: /חומוס|hummus/i },
    { slug: "falafel", re: /פלאפל|falafel/i },
    { slug: "shakshuka", re: /שקשוק|shakshuka/i },
    { slug: "sabich", re: /סביח|sabich/i },
    { slug: "bourekas", re: /בורקס|bourekas|burekas/i },
    { slug: "shawarma", re: /שווארמה|shawarma/i },
    { slug: "knafeh", re: /כנאפ|knafeh|kanafeh/i },
    { slug: "home_food_chraime", re: /חריימ|chraime/i },
    { slug: "home_food_chamin", re: /חמין|chamin|cholent/i },
  ];

  for (const row of patterns) {
    if (row.re.test(blob)) return row.slug;
  }
  return null;
}

/**
 * Resolve a local file under `public/assets/reference/` for a food slug.
 * Returns absolute filesystem path or null when no reference exists.
 */
export function resolveLocalFoodReferencePath(
  slug: string | null | undefined,
): string | null {
  if (!slug?.trim()) return null;
  const dir = referenceDir();
  for (const stem of stemsForSlug(slug)) {
    for (const ext of IMAGE_EXTS) {
      const candidate = path.join(dir, `${stem}${ext}`);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

export function detectAndResolveLocalFoodReference(opts: {
  dictionaryId?: string | null;
  text?: string | null;
}): { slug: string; absolutePath: string } | null {
  const slug = detectSpecificFoodSlug(opts);
  if (!slug) return null;
  const absolutePath = resolveLocalFoodReferencePath(slug);
  if (!absolutePath) return null;
  return { slug, absolutePath };
}
