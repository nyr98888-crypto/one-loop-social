export type ReviewPlatform = "google" | "easy";

export interface ReviewItem {
  id: string;
  customerName: string;
  rating: number;
  text: string;
  platform: ReviewPlatform;
  createdAt: string;
}

/** Mock aggregated reviews — Google Business + איזי (easy). */
export const SEED_REVIEWS: ReviewItem[] = [
  {
    id: "rev-g-1",
    customerName: "דנה שפירא",
    rating: 5,
    text: "שירות מדהים! הגעתי בלי תור והצוות קיבלו אותי בחיוך. התוצאה עלתה על הציפיות — ממליצה בחום.",
    platform: "google",
    createdAt: "2026-10-24",
  },
  {
    id: "rev-e-1",
    customerName: "אבי מזרחי",
    rating: 4,
    text: "עבודה מקצועית ומחיר הוגן. חיכיתי קצת בתור אבל שווה. אחזור בשמחה.",
    platform: "easy",
    createdAt: "2026-10-23",
  },
  {
    id: "rev-g-2",
    customerName: "יעל בן דוד",
    rating: 5,
    text: "סוף סוף מצאתי מקום שאפשר לסמוך עליו. הסבירו הכל בסבלנות ונתנו טיפים להמשך.",
    platform: "google",
    createdAt: "2026-10-21",
  },
  {
    id: "rev-e-2",
    customerName: "רון גולן",
    rating: 3,
    text: "בסך הכל בסדר. התוצאה טובה אבל התקשורת מראש הייתה קצת מבולבלת לגבי המחיר.",
    platform: "easy",
    createdAt: "2026-10-19",
  },
  {
    id: "rev-g-3",
    customerName: "שירה אלון",
    rating: 5,
    text: "וואו. מהירות, ניקיון ויחס אישי. כבר המלצתי לחברות שלי!",
    platform: "google",
    createdAt: "2026-10-17",
  },
  {
    id: "rev-e-3",
    customerName: "עומר חזן",
    rating: 4,
    text: "חוויה טובה מאוד. הצוות מקצועי והמקום נעים. רק חניה קצת בעייתית באזור.",
    platform: "easy",
    createdAt: "2026-10-15",
  },
];
