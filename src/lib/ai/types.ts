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

export interface EnhanceImageRequest {
  /** Public URL or data URI of the uploaded photo. */
  imageUrl: string;
  lightingStyle?:
    | "natural"
    | "studio"
    | "golden_hour"
    | "soft"
    | "dramatic"
    | "front_light";
  upscaleFactor?: 1 | 2 | 3 | 4;
}

export interface ImageResult {
  imageUrl: string;
  prompt?: string;
  seed?: number;
}
