/** Visual expander market framing for cultural food / product prompts. */
export type MarketContext = "israeli_local" | "global";

export interface GeneratePostRequest {
  businessName: string;
  industry: string;
  postGoal: string;
  /** Drives Cultural Visual Expander (default israeli_local). */
  marketContext?: MarketContext;
  /**
   * Optional business photo (https URL or data:image URI).
   * When set, copy is tailored to the visual and image generation is skipped client-side.
   */
  referenceImage?: string;
}

export interface GeneratedPostContent {
  headline: string;
  instagramCaption: string;
  facebookCaption: string;
  imagePrompt: string;
  /** Optional IG CTA from unified generator. */
  ctaText?: string;
  /** Optional WhatsApp lead bubble from unified generator. */
  whatsappLeadMessage?: string;
  /** Optional WhatsApp business reply from unified generator. */
  whatsappBusinessReply?: string;
  /** Optional WhatsApp action label. */
  whatsappActionButton?: string;
  /** LLM-enriched English commercial prompt for FAL.ai. */
  falImagePrompt?: string;
}

/** Single-shot homepage campaign payload (Instagram + WhatsApp + FAL). */
export interface UnifiedGenerateRequest {
  businessName: string;
  industry: string;
  postGoal: string;
  marketContext?: MarketContext;
  referenceImage?: string;
  /** Optional visual hint when AI image mode is on. */
  aiImageDescription?: string;
  /** When true, LLM must also emit falImagePrompt. */
  needFalImagePrompt?: boolean;
}

export interface UnifiedInstagramBlock {
  headline: string;
  caption: string;
  hashtags: string[];
  ctaText: string;
}

export interface UnifiedFacebookBlock {
  caption: string;
}

export interface UnifiedWhatsAppBlock {
  /** 1-to-many community / status announcement. */
  broadcastMessage?: string;
  leadIncomingMessage: string;
  businessAutoReply: string;
  actionButton: string;
}

export interface UnifiedGenerateContent {
  instagram: UnifiedInstagramBlock;
  facebook?: UnifiedFacebookBlock;
  whatsapp: UnifiedWhatsAppBlock;
  /** English commercial photography prompt for FAL (AI image mode). */
  falImagePrompt?: string;
  /** Kept for generate-image / legacy callers. */
  imagePrompt: string;
}

export interface GenerateImageRequest {
  prompt: string;
  /** @deprecated Generate always uses Recraft V3; values accepted for compat. */
  model?: "schnell" | "pro" | "recraft";
  /**
   * Locked post ratios only: 1:1 (`square_hd`) or 4:5 (`portrait_4_5`).
   * Other values are coerced server-side.
   */
  imageSize?: "square_hd" | "square" | "portrait_4_5";
  /** Cultural Visual Expander market framing. */
  marketContext?: MarketContext;
  /** Optional platform hint for locking 1:1 vs 4:5. */
  targetPlatform?: string;
  businessName?: string;
  industry?: string;
  /** Original post goal — extracts / prioritizes user visual descriptions. */
  postGoal?: string;
}

export type EnhanceFlavor = "natural" | "studio";

export interface EnhanceImageRequest {
  /**
   * Uploaded photo as https URL or data:image URI.
   * Alias `image` is also accepted by the API route.
   */
  imageUrl: string;
  /** Draft session — max 4 variants per session. Optional when persist=false. */
  sessionId: string;
  /** Niche for commercial color grade / environment presets. */
  industry: string;
  /** Drives framing + Layer 4 aspect crop (instagram 1:1, facebook 16:9, feed 4:5). */
  targetPlatform?: string;
  /** Single-flavor run. Ignored when `dual` is true. */
  flavor?: EnhanceFlavor;
  /**
   * Generate both natural + studio flavors in one request.
   * Requires 2 free draft-variant slots.
   * Response includes top-level `naturalUrl` + `studioUrl` (never a composite).
   */
  dual?: boolean;
  /**
   * Homepage upload path — run 4-layer FAL pipeline and return imageUrl
   * without writing draft variants.
   */
  persist?: boolean;
  /** Skip logo stamp (recommended for food / product uploads). */
  skipLogo?: boolean;
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
