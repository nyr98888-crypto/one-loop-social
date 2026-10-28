import fs from "fs";

const dict = JSON.parse(
  fs.readFileSync("src/data/israeliDictionary.json", "utf8"),
);

const defaultsByCategory = {
  food: {
    bannedWords: ["קביעת תור", "לקבוע תור", "פגישת ייעוץ", "זימון פגישה"],
    cameraAngle: "50mm f/2.8 food editorial, shallow depth of field",
    timingTriggers: ["שישי", "שבת", 'סופ"ש', "בוקר"],
    toneKeywords: ["חם", "טרי", "ביתי", "מפתה"],
    waLeadTemplate:
      "היי, ראיתי את הפוסט - אפשר לשריין לי מארז / הזמנה?",
  },
  beauty: {
    bannedWords: ["מארז", "תפריט משלוחים", "הזמנה למשלוח אוכל"],
    cameraAngle: "35mm commercial beauty, soft ring light",
    timingTriggers: ['סופ"ש', "ערב חג"],
    toneKeywords: ["מקצועי", "מדויק", "מפנק"],
    waLeadTemplate: "היי, אפשר לבדוק זמינות ולקבוע תור?",
  },
  automotive: {
    bannedWords: ["מארז", "קרואסון", "תפריט"],
    cameraAngle: "35mm automotive commercial, crisp workshop light",
    timingTriggers: ["טסט", "טיפול תקופתי", "חורף"],
    toneKeywords: ["מקצועי", "הוגן", "אמין"],
    waLeadTemplate: "היי, אשמח לתיאום / הצעת מחיר לרכב.",
  },
  home_services: {
    bannedWords: ["מארז", "תפריט", "טעימות"],
    cameraAngle: "35mm architectural / service photography",
    timingTriggers: ["דחוף", "חגים", "מעבר דירה"],
    toneKeywords: ["מקצועי", "מהיר", "אמין"],
    waLeadTemplate: "היי, אפשר לקבל הצעת מחיר / תיאום הגעה?",
  },
  pets: {
    bannedWords: ["פיצה", "מארז", "פחחות"],
    cameraAngle: "50mm pet lifestyle / clinic photography",
    timingTriggers: ["חיסון שנתי", "חופשה"],
    toneKeywords: ["עדין", "חם", "מסור"],
    waLeadTemplate: "היי, אשמח לתאם תור / שירות לחיית המחמד.",
  },
  childcare: {
    bannedWords: ["מארז", "משלוח", "טיפול רכב"],
    cameraAngle: "warm eye-level medium shot, family lifestyle",
    timingTriggers: ['סופ"ש', "ערב"],
    toneKeywords: ["אחראית", "חמה", "סבלנית"],
    waLeadTemplate: "היי, יש זמינות לבייביסיטר?",
  },
  retail: {
    bannedWords: ["קביעת תור", "מניקור"],
    cameraAngle: "28-35mm retail commercial interior",
    timingTriggers: ["מבצע", 'סופ"ש'],
    toneKeywords: ["מלאי", "ייעוץ", "שירות"],
    waLeadTemplate: "היי, אפשר לבדוק מלאי / מחיר?",
  },
  legal_finance: {
    bannedWords: ["מארז", "תפריט"],
    cameraAngle: "35mm corporate trustworthy photography",
    timingTriggers: ["ייעוץ", "חוזה"],
    toneKeywords: ["מקצועי", "דיסקרטי", "מדויק"],
    waLeadTemplate: "היי, אשמח לייעוץ ראשוני.",
  },
  education: {
    bannedWords: ["מארז", "תפריט"],
    cameraAngle: "50mm calm study desk photography",
    timingTriggers: ["מבחן", "בגרות"],
    toneKeywords: ["סבלני", "ברור", "תומך"],
    waLeadTemplate: "היי, אפשר לתאם שיעור ניסיון?",
  },
  fitness: {
    bannedWords: ["מארז", "תפריט"],
    cameraAngle: "35mm boutique fitness studio",
    timingTriggers: ["שגרה", "שבוע"],
    toneKeywords: ["אנרגטי", "מקצועי"],
    waLeadTemplate: "היי, אשמח לתאם אימון היכרות.",
  },
  services: {
    bannedWords: ["מארז", "תפריט"],
    cameraAngle: "35mm commercial trade photography",
    timingTriggers: ["דחוף", "פרויקט"],
    toneKeywords: ["מקצועי", "מהיר"],
    waLeadTemplate: "היי, אפשר לקבל הצעת מחיר?",
  },
};

function fill(e) {
  const d = defaultsByCategory[e.category] || defaultsByCategory.services;
  return {
    id: e.id,
    keywords: e.keywords || [],
    category: e.category || "services",
    intent: e.intent || "quote_consultation",
    bannedWords:
      Array.isArray(e.bannedWords) && e.bannedWords.length
        ? e.bannedWords
        : d.bannedWords,
    cameraAngle: e.cameraAngle || d.cameraAngle,
    timingTriggers:
      Array.isArray(e.timingTriggers) && e.timingTriggers.length
        ? e.timingTriggers
        : d.timingTriggers,
    toneKeywords:
      Array.isArray(e.toneKeywords) && e.toneKeywords.length
        ? e.toneKeywords
        : d.toneKeywords,
    cta: {
      instagram: e.cta?.instagram || "לפרטים בוואטסאפ",
      whatsapp: e.cta?.whatsapp || "המשך שיחה בוואטסאפ",
    },
    falPrompt:
      e.falPrompt ||
      "Clean commercial photography subject, soft morning window light, 50mm f/2.8, sharp focus",
    falNegative:
      e.falNegative || "text, watermark, logo, cartoon, blurry, dark lighting",
    waLeadTemplate: e.waLeadTemplate || d.waLeadTemplate,
    sampleWhatsapp:
      e.sampleWhatsapp || "נשמח לעזור - שלחו הודעה בוואטסאפ",
  };
}

const entries = [...(dict.foods || []), ...(dict.businesses || [])].map(fill);
const ids = new Set();
const unique = [];
for (const e of entries) {
  if (ids.has(e.id)) continue;
  ids.add(e.id);
  unique.push(e);
}

const master = { version: 1, entries: unique };
fs.writeFileSync(
  "src/data/israeliMasterDictionary.json",
  JSON.stringify(master, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    entries: unique.length,
    categories: [...new Set(unique.map((e) => e.category))],
  }),
);
