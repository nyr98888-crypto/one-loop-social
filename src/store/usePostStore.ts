import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ActivePlatform =
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "google"
  | "easy"
  | "linkedin";

/** Focused studio modes — one converting post at a time. */
export type StudioMode = "post" | "enhance" | "card";

/** Mobile studio flow: form-only → interactive preview. */
export type MobileStudioStage = "form" | "preview";

export interface GeneratedPayload {
  headline: string;
  instagramCaption: string;
  facebookCaption: string;
  imagePrompt: string;
  generatedImage: string;
}

export interface WhatsAppCardPayload {
  bio: string;
  tagline: string;
  waMeLink: string;
  greeting: string;
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
  /** Card form — שירותים מובילים */
  services: string;
  /** Card form — כתובת / אזור פעילות */
  serviceArea: string;
  /** Card form — מספר וואטסאפ */
  whatsappNumber: string;
  /** Card form — שעות פתיחה */
  openingHours: string;
  /** Card form — טלפון נוסף / ישיר */
  cardDirectPhone: string;
  /** Card form — אימייל */
  cardEmail: string;
  /** Card form — אתר / קישור חברתי */
  cardWebsite: string;
  /** Generated WhatsApp bio text */
  whatsappBio: string;
  whatsappTagline: string;
  whatsappWaMeLink: string;
  whatsappGreeting: string;
  /** Mobile: stage 1 form / stage 2 preview */
  mobileStage: MobileStudioStage;
  isGenerating: boolean;
  isGenerated: boolean;
  isImageBusy: boolean;
  _hasHydrated: boolean;
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
  setServices: (value: string) => void;
  setServiceArea: (value: string) => void;
  setWhatsappNumber: (value: string) => void;
  setOpeningHours: (value: string) => void;
  setCardDirectPhone: (value: string) => void;
  setCardEmail: (value: string) => void;
  setCardWebsite: (value: string) => void;
  setMobileStage: (value: MobileStudioStage) => void;
  setIsGenerating: (value: boolean) => void;
  setIsGenerated: (value: boolean) => void;
  setIsImageBusy: (value: boolean) => void;
  setHasHydrated: (value: boolean) => void;
  applyGenerated: (payload: GeneratedPayload) => void;
  applyWhatsAppCard: (payload: WhatsAppCardPayload) => void;
  reset: () => void;
}

/** Solid midnight — brand logo overlay renders on top (no baby-blue / text watermark). */
export const PLACEHOLDER_IMAGE = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080"><rect width="100%" height="100%" fill="#070B19"/></svg>',
)}`;

/** Legacy demo seed values — cleared on rehydrate so studio fields stay empty. */
const LEGACY_DEMO_FORM = {
  businessName: "אקספרס מוטורס",
  industry: "מוסך מורשה וטיפולי רכב",
  postGoal:
    "הכנת הרכב לחורף: בדיקת בלמים וצמיגים ללא עלות, ומגבים חדשים מתנה",
  services: "בדיקת חורף · בלמים · צמיגים · מזגנים",
  serviceArea: "מרכז · גוש דן",
  whatsappNumber: "0501234567",
  openingHours: "א׳–ה׳ 08:00–18:00 · ו׳ 08:00–13:00",
} as const;

const initialState = {
  businessName: "",
  industry: "",
  postGoal: "",
  headline: "",
  instagramCaption: "",
  facebookCaption: "",
  imagePrompt: "",
  generatedImage: PLACEHOLDER_IMAGE,
  caption: "",
  activePlatform: "instagram" as ActivePlatform,
  studioMode: "post" as StudioMode,
  services: "",
  serviceArea: "",
  whatsappNumber: "",
  openingHours: "",
  cardDirectPhone: "",
  cardEmail: "",
  cardWebsite: "",
  whatsappBio: "",
  whatsappTagline: "",
  whatsappWaMeLink: "",
  whatsappGreeting: "",
  mobileStage: "form" as MobileStudioStage,
  isGenerating: false,
  isGenerated: false,
  isImageBusy: false,
  _hasHydrated: false,
};

export const usePostStore = create<PostState>()(
  persist(
    (set) => ({
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
      setServices: (services) => set({ services }),
      setServiceArea: (serviceArea) => set({ serviceArea }),
      setWhatsappNumber: (whatsappNumber) => set({ whatsappNumber }),
      setOpeningHours: (openingHours) => set({ openingHours }),
      setCardDirectPhone: (cardDirectPhone) => set({ cardDirectPhone }),
      setCardEmail: (cardEmail) => set({ cardEmail }),
      setCardWebsite: (cardWebsite) => set({ cardWebsite }),
      setMobileStage: (mobileStage) => set({ mobileStage }),
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      setIsGenerated: (isGenerated) => set({ isGenerated }),
      setIsImageBusy: (isImageBusy) => set({ isImageBusy }),
      setHasHydrated: (_hasHydrated) => set({ _hasHydrated }),
      applyGenerated: (payload) =>
        set({
          ...payload,
          caption: payload.instagramCaption,
          isGenerating: false,
          isGenerated: true,
          isImageBusy: false,
          mobileStage: "preview",
        }),
      applyWhatsAppCard: (payload) =>
        set({
          whatsappBio: payload.bio,
          whatsappTagline: payload.tagline,
          whatsappWaMeLink: payload.waMeLink,
          whatsappGreeting: payload.greeting,
          headline: payload.tagline,
          facebookCaption: payload.bio,
          caption: payload.bio,
          activePlatform: "whatsapp",
          isGenerating: false,
          isGenerated: true,
          mobileStage: "preview",
        }),
      reset: () => set({ ...initialState, _hasHydrated: true }),
    }),
    {
      name: "one-loop-post-store",
      skipHydration: true,
      partialize: (state) => ({
        businessName: state.businessName,
        industry: state.industry,
        postGoal: state.postGoal,
        headline: state.headline,
        instagramCaption: state.instagramCaption,
        facebookCaption: state.facebookCaption,
        imagePrompt: state.imagePrompt,
        generatedImage: state.generatedImage,
        caption: state.caption,
        activePlatform: state.activePlatform,
        studioMode: state.studioMode,
        services: state.services,
        serviceArea: state.serviceArea,
        whatsappNumber: state.whatsappNumber,
        openingHours: state.openingHours,
        cardDirectPhone: state.cardDirectPhone,
        cardEmail: state.cardEmail,
        cardWebsite: state.cardWebsite,
        whatsappBio: state.whatsappBio,
        whatsappTagline: state.whatsappTagline,
        whatsappWaMeLink: state.whatsappWaMeLink,
        whatsappGreeting: state.whatsappGreeting,
        isGenerated: state.isGenerated,
        mobileStage: state.mobileStage,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error || !state) return;
        // Migrate legacy modes removed from the product.
        const legacy = state.studioMode as string;
        if (
          legacy === "brand" ||
          legacy === "banner" ||
          legacy === "campaign" ||
          legacy === "logo"
        ) {
          state.setStudioMode(legacy === "logo" ? "card" : "post");
        }
        const plat = state.activePlatform as string;
        if (
          plat &&
          ![
            "whatsapp",
            "instagram",
            "facebook",
            "google",
            "easy",
            "linkedin",
          ].includes(plat)
        ) {
          state.setActivePlatform("instagram");
        }
        // Drop old hardcoded demo form seeds so placeholders show.
        if (state.businessName === LEGACY_DEMO_FORM.businessName) {
          state.setBusinessName("");
        }
        if (state.industry === LEGACY_DEMO_FORM.industry) {
          state.setIndustry("");
        }
        if (state.postGoal === LEGACY_DEMO_FORM.postGoal) {
          state.setPostGoal("");
        }
        if (state.services === LEGACY_DEMO_FORM.services) {
          state.setServices("");
        }
        if (state.serviceArea === LEGACY_DEMO_FORM.serviceArea) {
          state.setServiceArea("");
        }
        if (state.whatsappNumber === LEGACY_DEMO_FORM.whatsappNumber) {
          state.setWhatsappNumber("");
        }
        if (state.openingHours === LEGACY_DEMO_FORM.openingHours) {
          state.setOpeningHours("");
        }
        // Migrate old baby-blue placehold.co watermarks → dark brand placeholder.
        if (state.generatedImage.includes("placehold.co")) {
          state.setGeneratedImage(PLACEHOLDER_IMAGE);
        }
        // Prefer preview stage when content already exists.
        if (state.isGenerated && state.mobileStage !== "preview") {
          state.setMobileStage("preview");
        }
        state.setHasHydrated(true);
      },
    },
  ),
);

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
    case "whatsapp":
      return (
        state.whatsappBio ||
        state.facebookCaption ||
        state.instagramCaption ||
        state.postGoal
      );
    case "facebook":
    case "google":
    case "easy":
    case "linkedin":
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
