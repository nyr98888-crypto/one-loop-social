import { create } from "zustand";
import type { PostDraftVariantRow } from "@/lib/db/schema";
import { usePostStore } from "@/store/usePostStore";

export type EnhanceStage =
  | "idle"
  | "cleaning"
  | "lighting"
  | "branding"
  | "saving";

export const MAX_DRAFT_VARIANTS = 4;

export const ENHANCE_STAGE_LABELS: Record<
  Exclude<EnhanceStage, "idle">,
  string
> = {
  cleaning: "מנקה רעשים...",
  lighting: "משפר תאורה...",
  branding: "מכין גרסאות...",
  saving: "שומר טיוטה...",
};

export type EnhanceFlavorOption = {
  imageUrl: string;
  variantIndex: number;
};

export type PendingEnhanceFlavors = {
  natural: EnhanceFlavorOption;
  studio: EnhanceFlavorOption;
  naturalUrl: string;
  studioUrl: string;
};

/** Local preview before the user presses "שדרג תמונה עכשיו". */
export type PendingEnhanceUpload = {
  previewUrl: string;
  customInstruction: string;
};

/** Pre-enhance style preference (maps to natural / studio pipeline). */
export type SelectedEnhanceStyle = "authentic" | "studio";

export interface DraftVariantsState {
  sessionId: string | null;
  variants: PostDraftVariantRow[];
  activeVariantIndex: number | null;
  enhanceStage: EnhanceStage;
  sessionBannerDismissed: boolean;
  /**
   * Dual enhance results — kept while the user toggles flavors.
   * Alias of the pending picker payload (`naturalUrl` + `studioUrl`).
   */
  pendingEnhanceFlavors: PendingEnhanceFlavors | null;
  /** Which dual-flavor card is active in the mockup. */
  activeFlavor: "natural" | "studio" | null;
  /** Radio preference before / during enhance — authentic | studio. */
  selectedEnhanceStyle: SelectedEnhanceStyle;
  /** Uploaded preview awaiting manual start (no blind auto-enhance). */
  pendingEnhanceUpload: PendingEnhanceUpload | null;
  setSessionId: (sessionId: string | null) => void;
  setVariants: (variants: PostDraftVariantRow[]) => void;
  setEnhanceStage: (stage: EnhanceStage) => void;
  setSessionBannerDismissed: (value: boolean) => void;
  setPendingEnhanceFlavors: (flavors: PendingEnhanceFlavors | null) => void;
  setPendingEnhanceUpload: (upload: PendingEnhanceUpload | null) => void;
  setEnhanceCustomInstruction: (value: string) => void;
  setActiveFlavor: (flavor: "natural" | "studio" | null) => void;
  setSelectedEnhanceStyle: (style: SelectedEnhanceStyle) => void;
  /** Switch preview to a variant locally (no network). */
  selectVariant: (variantIndex: number) => void;
  /** Apply latest enhance response and select the new variant. */
  applyEnhanceResult: (payload: {
    sessionId: string;
    variants: PostDraftVariantRow[];
    variantIndex: number;
  }) => void;
  /**
   * Toggle dual-flavor into the live mockup (all platforms).
   * Keeps `pendingEnhanceFlavors` so the picker can show an active ring.
   */
  selectEnhanceFlavor: (flavor: "natural" | "studio") => void;
  clearDraftSession: () => void;
}

function applyVariantToPostStore(variant: PostDraftVariantRow): void {
  const store = usePostStore.getState();
  store.setGeneratedImage(variant.image_url);
  if (variant.headline) store.setHeadline(variant.headline);
  if (variant.ig_caption) store.setInstagramCaption(variant.ig_caption);
  if (variant.fb_caption) store.setFacebookCaption(variant.fb_caption);
}

export const useDraftVariantsStore = create<DraftVariantsState>((set, get) => ({
  sessionId: null,
  variants: [],
  activeVariantIndex: null,
  enhanceStage: "idle",
  sessionBannerDismissed: false,
  pendingEnhanceFlavors: null,
  activeFlavor: null,
  selectedEnhanceStyle: "authentic",
  pendingEnhanceUpload: null,

  setSessionId: (sessionId) => set({ sessionId }),

  setVariants: (variants) => {
    const sorted = [...variants].sort(
      (a, b) => a.variant_index - b.variant_index,
    );
    const current = get().activeVariantIndex;
    const stillExists =
      current != null && sorted.some((v) => v.variant_index === current);
    set({
      variants: sorted,
      activeVariantIndex: stillExists
        ? current
        : (sorted[sorted.length - 1]?.variant_index ?? null),
    });
  },

  setEnhanceStage: (enhanceStage) => set({ enhanceStage }),

  setSessionBannerDismissed: (sessionBannerDismissed) =>
    set({ sessionBannerDismissed }),

  setPendingEnhanceFlavors: (pendingEnhanceFlavors) =>
    set({
      pendingEnhanceFlavors,
      // New results or clear → reset until the user (or auto) picks a flavor
      activeFlavor: null,
    }),

  setActiveFlavor: (activeFlavor) => set({ activeFlavor }),

  setSelectedEnhanceStyle: (selectedEnhanceStyle) =>
    set({ selectedEnhanceStyle }),

  setPendingEnhanceUpload: (pendingEnhanceUpload) =>
    set({ pendingEnhanceUpload }),

  setEnhanceCustomInstruction: (value) => {
    const current = get().pendingEnhanceUpload;
    if (!current) return;
    set({
      pendingEnhanceUpload: {
        ...current,
        customInstruction: value,
      },
    });
  },

  selectVariant: (variantIndex) => {
    const variant = get().variants.find((v) => v.variant_index === variantIndex);
    if (!variant) return;
    set({ activeVariantIndex: variantIndex });
    applyVariantToPostStore(variant);
  },

  applyEnhanceResult: ({ sessionId, variants, variantIndex }) => {
    const sorted = [...variants].sort(
      (a, b) => a.variant_index - b.variant_index,
    );
    set({
      sessionId,
      variants: sorted,
      activeVariantIndex: variantIndex,
      enhanceStage: "idle",
      sessionBannerDismissed: true,
      pendingEnhanceUpload: null,
    });
    const selected = sorted.find((v) => v.variant_index === variantIndex);
    if (selected) applyVariantToPostStore(selected);
  },

  selectEnhanceFlavor: (flavor) => {
    const pending = get().pendingEnhanceFlavors;
    if (!pending) return;
    const choice = pending[flavor];
    // Load ONLY the selected flavor URL into the mockup — never a composite.
    const imageUrl =
      flavor === "natural" ? pending.naturalUrl : pending.studioUrl;
    const variant = get().variants.find(
      (v) => v.variant_index === choice.variantIndex,
    );
    set({
      activeVariantIndex: choice.variantIndex,
      activeFlavor: flavor,
      pendingEnhanceUpload: null,
      // Keep pendingEnhanceFlavors so both cards stay with active-ring UI
    });
    if (variant) {
      applyVariantToPostStore(variant);
    }
    // Always sync mockup image to the selected flavor URL (all platforms)
    usePostStore.getState().setGeneratedImage(imageUrl || choice.imageUrl);
  },

  clearDraftSession: () => {
    set({
      sessionId: null,
      variants: [],
      activeVariantIndex: null,
      enhanceStage: "idle",
      sessionBannerDismissed: true,
      pendingEnhanceFlavors: null,
      activeFlavor: null,
      selectedEnhanceStyle: "authentic",
      pendingEnhanceUpload: null,
    });
  },
}));

export function selectIsAtVariantLimit(state: DraftVariantsState): boolean {
  return state.variants.length >= MAX_DRAFT_VARIANTS;
}
