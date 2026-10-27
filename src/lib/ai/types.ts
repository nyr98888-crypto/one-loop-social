export interface GeneratePostRequest {
  businessName: string;
  industry: string;
  postGoal: string;
}

export interface GeneratedPostContent {
  headline: string;
  instagramCaption: string;
  facebookCaption: string;
  imagePrompt: string;
}

export interface GenerateImageRequest {
  prompt: string;
  /** Prefer schnell for speed; flux-pro for higher fidelity. */
  model?: "schnell" | "pro";
  imageSize?:
    | "square_hd"
    | "square"
    | "portrait_4_3"
    | "portrait_16_9"
    | "landscape_4_3"
    | "landscape_16_9";
}

export type EnhanceFlavor = "natural" | "studio";

export interface EnhanceImageRequest {
  /**
   * Uploaded photo as https URL or data:image URI.
   * Alias `image` is also accepted by the API route.
   */
  imageUrl: string;
  /** Draft session — max 4 variants per session. */
  sessionId: string;
  /** Niche for Layer 2 background presets (e.g. automotive, cosmetics). */
  industry: string;
  /** Drives Layer 4 aspect crop (instagram 1:1, facebook 16:9, feed 4:5). */
  targetPlatform?: string;
  /** Single-flavor run. Ignored when `dual` is true. */
  flavor?: EnhanceFlavor;
  /**
   * Generate both natural + studio flavors in one request.
   * Requires 2 free draft-variant slots.
   * Response includes top-level `naturalUrl` + `studioUrl` (never a composite).
   */
  dual?: boolean;
  /** Optional user guidance appended to enhance prompts (Hebrew or English). */
  customInstruction?: string;
  /** Alias for `customInstruction` (client / docs). */
  userInstruction?: string;
  /** Alias for `industry` (client / docs). */
  businessCategory?: string;
  /** Pre-enhance radio: authentic (=natural) | studio. */
  selectedEnhanceStyle?: "authentic" | "studio";
  /** Mapped preferred dual-flavor after generate. */
  preferredFlavor?: EnhanceFlavor;
  headline?: string;
  igCaption?: string;
  fbCaption?: string;
}

export interface ImageResult {
  imageUrl: string;
  prompt?: string;
  seed?: number;
}

/** WhatsApp Digital Business Card / Bio generator. */
export interface GenerateBioRequest {
  businessName: string;
  /** שירותים מובילים */
  services: string;
  /** כתובת / אזור פעילות */
  serviceArea: string;
  /** מספר וואטסאפ — local or international */
  whatsappNumber: string;
  /** שעות פתיחה */
  openingHours: string;
}

export interface GeneratedBioContent {
  /** Sharp formatted WhatsApp Business profile bio (Hebrew, emojis, bullets). */
  bio: string;
  /** Short display tagline under the business name. */
  tagline: string;
  /** Pre-filled click-to-chat URL: https://wa.me/972...?... */
  waMeLink: string;
  /** Greeting text embedded in the wa.me link. */
  greeting: string;
}

/** AI reply for a customer review (Google / easy). */
export interface GenerateReviewReplyRequest {
  customerName: string;
  rating: number;
  reviewText: string;
  platform: "google" | "easy";
  businessName?: string;
}

export interface GeneratedReviewReply {
  reply: string;
}
