import { create } from "zustand";

export type ActivePlatform =
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "google";

export type StudioMode = "logo" | "brand" | "banner" | "campaign";

export interface GeneratedPayload {
  headline: string;
  instagramCaption: string;
  facebookCaption: string;
  imagePrompt: string;
  generatedImage: string;
}

export interface PostState {
  businessName: string;
  industry: string;
  postGoal: string;
  headline: string;
  instagramCaption: string;
  facebookCaption: string;
  imagePrompt: string;
  generatedImage: string;
  caption: string;
  activePlatform: ActivePlatform;
  studioMode: StudioMode;
  isGenerating: boolean;
  isGenerated: boolean;
  isImageBusy: boolean;
  setBusinessName: (value: string) => void;
  setIndustry: (value: string) => void;
  setPostGoal: (value: string) => void;
  setGeneratedImage: (value: string) => void;
  setCaption: (value: string) => void;
  setHeadline: (value: string) => void;
  setInstagramCaption: (value: string) => void;
  setFacebookCaption: (value: string) => void;
  setActivePlatform: (value: ActivePlatform) => void;
  setStudioMode: (value: StudioMode) => void;
  setIsGenerating: (value: boolean) => void;
  setIsGenerated: (value: boolean) => void;
  setIsImageBusy: (value: boolean) => void;
  applyGenerated: (payload: GeneratedPayload) => void;
  reset: () => void;
}

const PLACEHOLDER_IMAGE =
  "https://placehold.co/1080x1080/E0F2FE/0ea5e9?text=One+Loop";

const initialState = {
  businessName: "אקספרס מוטורס",
  industry: "מוסך מורשה וטיפולי רכב",
  postGoal:
    "הכנת הרכב לחורף: בדיקת בלמים וצמיגים ללא עלות, ומגבים חדשים מתנה",
  headline: "",
  instagramCaption: "",
  facebookCaption: "",
  imagePrompt: "",
  generatedImage: PLACEHOLDER_IMAGE,
  caption: "",
  activePlatform: "instagram" as ActivePlatform,
  studioMode: "brand" as StudioMode,
  isGenerating: false,
  isGenerated: false,
  isImageBusy: false,
};

export const usePostStore = create<PostState>((set) => ({
  ...initialState,
  setBusinessName: (businessName) => set({ businessName }),
  setIndustry: (industry) => set({ industry }),
  setPostGoal: (postGoal) => set({ postGoal }),
  setGeneratedImage: (generatedImage) => set({ generatedImage }),
  setCaption: (caption) => set({ caption }),
  setHeadline: (headline) => set({ headline }),
  setInstagramCaption: (instagramCaption) =>
    set({ instagramCaption, caption: instagramCaption }),
  setFacebookCaption: (facebookCaption) => set({ facebookCaption }),
  setActivePlatform: (activePlatform) => set({ activePlatform }),
  setStudioMode: (studioMode) => set({ studioMode }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setIsGenerated: (isGenerated) => set({ isGenerated }),
  setIsImageBusy: (isImageBusy) => set({ isImageBusy }),
  applyGenerated: (payload) =>
    set({
      ...payload,
      caption: payload.instagramCaption,
      isGenerating: false,
      isGenerated: true,
      isImageBusy: false,
    }),
  reset: () => set({ ...initialState }),
}));

/** Live draft shown in mockups before / while AI has not finished. */
export function selectDraftCaption(state: PostState): string {
  if (state.isGenerated && state.instagramCaption) {
    return state.instagramCaption;
  }
  return state.postGoal;
}

export function selectFacebookDraft(state: PostState): string {
  if (state.isGenerated && state.facebookCaption) {
    return state.facebookCaption;
  }
  return state.postGoal;
}

export function selectActiveCaption(state: PostState): string {
  switch (state.activePlatform) {
    case "facebook":
    case "google":
    case "whatsapp":
      return (
        state.facebookCaption ||
        state.instagramCaption ||
        state.postGoal
      );
    case "instagram":
    default:
      return state.instagramCaption || state.postGoal;
  }
}

export function toHandle(businessName: string): string {
  const cleaned = businessName.trim().replace(/\s+/g, "_");
  return cleaned ? `@${cleaned}` : "@business";
}
