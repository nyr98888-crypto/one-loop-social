/**
 * Hebrew / Israeli cultural food → detailed English visual descriptions
 * for the image generator (never leave transliterated names alone).
 */
const JACHNUN_VISUAL =
  "Authentic Yemenite Jewish Jachnun breakfast, golden-amber baked rolled pastry with glistening flaky dough layers, served on a plain wooden board beside a small ceramic bowl of fresh bright-red grated tomato salsa with olive oil, a small dish of green chili zhug, and a whole hard-boiled brown egg sliced cleanly in half showing a firm yellow cooked yolk, natural window lighting, real food photograph, 50mm f/2.8 macro, clean unbranded composition";

export const CULTURAL_FOOD_VISUALS: Record<string, string> = {
  "גחנון": JACHNUN_VISUAL,
  "ג'חנון": JACHNUN_VISUAL,
  "ג׳חנון": JACHNUN_VISUAL,
  jachnun: JACHNUN_VISUAL,
  "מלאווח":
    "Authentic Yemeni malawach, large golden layered flaky flatbread folded into a thick square, crispy edges, soft layers, served with crushed tomato dip, green schug, and a soft-boiled egg, rustic plate, warm natural light, professional food photography.",
  malawach:
    "Authentic Yemeni malawach, large golden layered flaky flatbread folded into a thick square, crispy edges, soft layers, served with crushed tomato dip, green schug, and a soft-boiled egg, rustic plate, warm natural light, professional food photography.",
  "חומוס":
    "Creamy Israeli hummus bowl topped with chickpeas, paprika, olive oil, and fresh parsley, warm pita on the side, rustic ceramic bowl, soft natural daylight, professional food photography.",
  hummus:
    "Creamy Israeli hummus bowl topped with chickpeas, paprika, olive oil, and fresh parsley, warm pita on the side, rustic ceramic bowl, soft natural daylight, professional food photography.",
  "פלאפל":
    "Crispy golden falafel balls piled in a warm pita with fresh Israeli salad, tahini drizzle, and pickles, street-food stall aesthetic, natural daylight, professional food photography.",
  falafel:
    "Crispy golden falafel balls piled in a warm pita with fresh Israeli salad, tahini drizzle, and pickles, street-food stall aesthetic, natural daylight, professional food photography.",
  "שקשוקה":
    "Israeli shakshuka: eggs gently poached in rich red tomato pepper sauce in a black cast-iron skillet, fresh herbs on top, crusty bread beside the pan, steam rising, warm kitchen light, professional food photography.",
  shakshuka:
    "Israeli shakshuka: eggs gently poached in rich red tomato pepper sauce in a black cast-iron skillet, fresh herbs on top, crusty bread beside the pan, steam rising, warm kitchen light, professional food photography.",
  "סביח":
    "Israeli sabich sandwich: warm pita stuffed with fried eggplant, hard-boiled egg, hummus, Israeli salad, amba, and tahini, wrapped in paper, vibrant street-food colors, natural light, professional food photography.",
  sabich:
    "Israeli sabich sandwich: warm pita stuffed with fried eggplant, hard-boiled egg, hummus, Israeli salad, amba, and tahini, wrapped in paper, vibrant street-food colors, natural light, professional food photography.",
  "כנאפה":
    "Golden knafeh (kanafeh) pastry with stretchy melted cheese, crispy shredded phyllo, soaked in fragrant syrup, crushed pistachios on top, served hot on a round tray, warm dessert lighting, professional food photography.",
  knafeh:
    "Golden knafeh (kanafeh) pastry with stretchy melted cheese, crispy shredded phyllo, soaked in fragrant syrup, crushed pistachios on top, served hot on a round tray, warm dessert lighting, professional food photography.",
  "בורקס":
    "Golden flaky Israeli bourekas pastries, triangular and spiral shapes, sesame seeds on top, savory cheese and potato fillings visible, bakery tray, warm oven light, professional food photography.",
  bourekas:
    "Golden flaky Israeli bourekas pastries, triangular and spiral shapes, sesame seeds on top, savory cheese and potato fillings visible, bakery tray, warm oven light, professional food photography.",
  "שווארמה":
    "Fresh Israeli shawarma: thinly sliced roasted meat carved from a vertical spit into a warm laffa wrap with hummus, fries, pickled vegetables, and tahini, street-food counter, appetizing steam, professional food photography.",
  shawarma:
    "Fresh Israeli shawarma: thinly sliced roasted meat carved from a vertical spit into a warm laffa wrap with hummus, fries, pickled vegetables, and tahini, street-food counter, appetizing steam, professional food photography.",
};

/** Strip literal graphic/text requests + known jachnun shape confusions. */
const BANNED_PROMPT_TOKENS =
  /\b(8k|4k|award[-\s]?winning|award|medal|badge|logo|masterpiece|stamp|watermark|seal|emblem|crest|typography|caption text|gibberish text|logs?|cylinder|mahogany|sausage|fried\s+egg)\b/gi;

/**
 * Expand cultural food mentions into rich visual English for Recraft V3.
 */
export function enrichImagePromptForGenerator(prompt: string): string {
  let out = prompt.trim();
  if (!out) return out;

  // Jachnun ironclad: always the locked golden string (no mahogany/logs rewrite)
  if (/ג['׳']?חנון|jachnun/i.test(out)) {
    return JACHNUN_VISUAL;
  }

  const lower = out.toLowerCase();
  const expansions: string[] = [];

  for (const [key, visual] of Object.entries(CULTURAL_FOOD_VISUALS)) {
    const needle = key.toLowerCase();
    if (out.includes(key) || lower.includes(needle)) {
      expansions.push(visual);
    }
  }

  if (expansions.length) {
    const unique = [...new Set(expansions)];
    const withoutRawNames = out
      .replace(/ג['׳']?חנון|jachnun/gi, "")
      .replace(/מלאווח|malawach/gi, "")
      .replace(/חומוס|hummus/gi, "")
      .replace(/פלאפל|falafel/gi, "")
      .replace(/שקשוקה|shakshuka/gi, "")
      .replace(/סביח|sabich/gi, "")
      .replace(/כנאפה|knafeh|kanafeh/gi, "")
      .replace(/בורקס|bourekas/gi, "")
      .replace(/שווארמה|shawarma/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    out = [unique.join(" "), withoutRawNames].filter(Boolean).join(" ");
  }

  out = out.replace(BANNED_PROMPT_TOKENS, "").replace(/\s{2,}/g, " ").trim();
  return out;
}
