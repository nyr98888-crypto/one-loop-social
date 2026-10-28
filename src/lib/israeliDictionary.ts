import master from "@/data/israeliMasterDictionary.json";

export type DictionaryIntent =
  | "order_reserve"
  | "book_appointment"
  | "quote_consultation"
  | "product_inquiry";

export type DictionaryCategory =
  | "food"
  | "beauty"
  | "services"
  | "home_services"
  | "automotive"
  | "fitness"
  | "legal_finance"
  | "education"
  | "retail"
  | "childcare"
  | "pets";

export interface DictionaryCta {
  instagram: string;
  whatsapp: string;
}

export interface DictionaryEntry {
  id: string;
  keywords: string[];
  category: DictionaryCategory | string;
  intent: DictionaryIntent | string;
  bannedWords: string[];
  cameraAngle: string;
  timingTriggers: string[];
  toneKeywords: string[];
  cta: DictionaryCta;
  falPrompt: string;
  falNegative: string;
  waLeadTemplate: string;
  sampleWhatsapp: string;
}

export interface MatchResult {
  isMatch: boolean;
  id?: string;
  keywords?: string[];
  category?: string;
  intent?: string;
  cta?: DictionaryCta;
  falPrompt?: string;
  falNegative?: string;
  sampleWhatsapp?: string;
  bannedWords?: string[];
  cameraAngle?: string;
  timingTriggers?: string[];
  toneKeywords?: string[];
  waLeadTemplate?: string;
  matchedKeyword?: string;
}

type ScoredHit = {
  entry: DictionaryEntry;
  matchedKeyword: string;
  score: number;
};

const ENTRIES = (master.entries ?? []) as DictionaryEntry[];

function scoreKeywordHit(haystack: string, keyword: string): number | null {
  const k = keyword.toLowerCase().trim();
  if (!k || !haystack.includes(k)) return null;
  return k.length;
}

function bestHit(haystack: string): ScoredHit | null {
  let best: ScoredHit | null = null;
  for (const entry of ENTRIES) {
    for (const keyword of entry.keywords ?? []) {
      const score = scoreKeywordHit(haystack, keyword);
      if (score == null) continue;
      if (!best || score > best.score) {
        best = { entry, matchedKeyword: keyword, score };
      }
    }
  }
  return best;
}

/** Deterministic master-dictionary lookup (longest keyword wins). */
export function findIsraeliMatch(text: string): MatchResult {
  const normalized = text.toLowerCase();
  const hit = bestHit(normalized);
  if (!hit) return { isMatch: false };
  return {
    isMatch: true,
    ...hit.entry,
    matchedKeyword: hit.matchedKeyword,
  };
}

export function dictionaryCategoryToDomain(
  category?: string,
  intent?: string,
): "food" | "beauty" | "services" | "retail" | "generic" {
  switch (category) {
    case "food":
      return "food";
    case "beauty":
    case "fitness":
    case "education":
    case "childcare":
    case "pets":
      return "beauty";
    case "automotive":
      return intent === "book_appointment" ? "beauty" : "services";
    case "services":
    case "home_services":
    case "legal_finance":
      return intent === "book_appointment" ? "beauty" : "services";
    case "retail":
      return "retail";
    default:
      return "generic";
  }
}

export function buildDictionaryCopyHints(match: MatchResult): string {
  if (!match.isMatch) return "";
  const lines: string[] = ["", "=== DICTIONARY COPY HINTS (mandatory tone) ==="];
  if (match.toneKeywords?.length) {
    lines.push(`Tone keywords: ${match.toneKeywords.join(", ")}`);
  }
  if (match.timingTriggers?.length) {
    lines.push(
      `Timing hooks to weave naturally: ${match.timingTriggers.join(", ")}`,
    );
  }
  if (match.bannedWords?.length) {
    lines.push(
      `Never use these words/phrases: ${match.bannedWords
        .map((w) => `«${w}»`)
        .join(", ")}`,
    );
  }
  if (match.waLeadTemplate) {
    lines.push(
      `WhatsApp lead template (adapt placeholders): «${match.waLeadTemplate}»`,
    );
  }
  return lines.join("\n");
}

/** @deprecated use master.entries — kept for callers expecting split lists */
export const israeliDictionary = {
  foods: ENTRIES.filter((e) => e.category === "food"),
  businesses: ENTRIES.filter((e) => e.category !== "food"),
  entries: ENTRIES,
};

export { master as israeliMasterDictionary };
