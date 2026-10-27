import type { ManualGuidePlatform } from "@/store/useSocialConnectStore";

/** Open-web / app deep links for manual guided publishing. */
export function getPlatformDeepLink(platform: ManualGuidePlatform): {
  href: string;
  label: string;
} {
  switch (platform) {
    case "whatsapp":
      return {
        href: "https://web.whatsapp.com/",
        label: "פתח את WhatsApp",
      };
    case "facebook":
      return {
        href: "https://www.facebook.com",
        label: "פתח את פייסבוק",
      };
    case "instagram":
      return {
        href: "https://www.instagram.com",
        label: "פתח את אינסטגרם",
      };
    case "google":
      return {
        href: "https://business.google.com/",
        label: "פתח את Google Business",
      };
    case "easy":
      return {
        href: "https://easy.co.il",
        label: "פתח את איזי",
      };
    case "linkedin":
      return {
        href: "https://www.linkedin.com/feed/",
        label: "פתח את LinkedIn",
      };
  }
}

export function getPlatformGuideTitle(platform: ManualGuidePlatform): string {
  switch (platform) {
    case "whatsapp":
      return "פרסום ב-WhatsApp";
    case "facebook":
      return "פרסום בפייסבוק";
    case "instagram":
      return "פרסום באינסטגרם";
    case "google":
      return "פרסום ב-Google Business";
    case "easy":
      return "פרסום באיזי";
    case "linkedin":
      return "פרסום ב-LinkedIn";
  }
}
