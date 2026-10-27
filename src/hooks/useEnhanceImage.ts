"use client";

import { useCallback, useEffect, useRef } from "react";
import type { PostDraftVariantRow } from "@/lib/db/schema";
import { MAX_VARIANTS_ERROR_HE } from "@/lib/db/draft-constants";
import { ensureDraftSessionId } from "@/lib/session/draft-session";
import {
  MAX_DRAFT_VARIANTS,
  useDraftVariantsStore,
  type EnhanceStage,
  type PendingEnhanceFlavors,
} from "@/store/useDraftVariantsStore";
import { usePostStore } from "@/store/usePostStore";

const STAGE_SEQUENCE: Exclude<EnhanceStage, "idle">[] = [
  "cleaning",
  "lighting",
  "branding",
  "saving",
];

/** Module-level File — not serializable, shared across hook instances. */
let pendingEnhanceFile: File | null = null;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("קריאת הקובץ נכשלה"));
    reader.readAsDataURL(file);
  });
}

function normalizeFlavors(json: {
  naturalUrl?: string;
  studioUrl?: string;
  flavors?: {
    natural?: { imageUrl?: string; variantIndex?: number };
    studio?: { imageUrl?: string; variantIndex?: number };
  };
}): PendingEnhanceFlavors | null {
  const naturalUrl =
    json.naturalUrl?.trim() || json.flavors?.natural?.imageUrl?.trim() || "";
  const studioUrl =
    json.studioUrl?.trim() || json.flavors?.studio?.imageUrl?.trim() || "";
  const naturalIndex = json.flavors?.natural?.variantIndex;
  const studioIndex = json.flavors?.studio?.variantIndex;

  if (
    !naturalUrl ||
    !studioUrl ||
    typeof naturalIndex !== "number" ||
    typeof studioIndex !== "number"
  ) {
    return null;
  }

  // Guard: refuse a single composite URL presented as both flavors
  if (naturalUrl === studioUrl) {
    console.warn(
      "[useEnhanceImage] naturalUrl and studioUrl are identical — refusing composite",
    );
  }

  return {
    naturalUrl,
    studioUrl,
    natural: { imageUrl: naturalUrl, variantIndex: naturalIndex },
    studio: { imageUrl: studioUrl, variantIndex: studioIndex },
  };
}

/**
 * Dual-flavor enhance: select file → preview + optional instruction →
 * manual start → two distinct URLs (natural + studio). Never a composite.
 */
export function useEnhanceImage() {
  const stageTimerRef = useRef<number | null>(null);

  const industry = usePostStore((s) => s.industry);
  const headline = usePostStore((s) => s.headline);
  const instagramCaption = usePostStore((s) => s.instagramCaption);
  const facebookCaption = usePostStore((s) => s.facebookCaption);
  const activePlatform = usePostStore((s) => s.activePlatform);
  const isImageBusy = usePostStore((s) => s.isImageBusy);
  const setGeneratedImage = usePostStore((s) => s.setGeneratedImage);
  const setIsImageBusy = usePostStore((s) => s.setIsImageBusy);
  const setIsGenerated = usePostStore((s) => s.setIsGenerated);
  const setMobileStage = usePostStore((s) => s.setMobileStage);
  const setStudioMode = usePostStore((s) => s.setStudioMode);

  const variantsLength = useDraftVariantsStore((s) => s.variants.length);
  const atLimit = variantsLength >= MAX_DRAFT_VARIANTS;
  /** Dual enhance needs two free slots. */
  const atDualLimit = variantsLength + 2 > MAX_DRAFT_VARIANTS;
  const enhanceStage = useDraftVariantsStore((s) => s.enhanceStage);
  const setEnhanceStage = useDraftVariantsStore((s) => s.setEnhanceStage);
  const setSessionId = useDraftVariantsStore((s) => s.setSessionId);
  const setVariants = useDraftVariantsStore((s) => s.setVariants);
  const setPendingEnhanceFlavors = useDraftVariantsStore(
    (s) => s.setPendingEnhanceFlavors,
  );
  const selectEnhanceFlavor = useDraftVariantsStore(
    (s) => s.selectEnhanceFlavor,
  );
  const pendingEnhanceUpload = useDraftVariantsStore(
    (s) => s.pendingEnhanceUpload,
  );
  const setPendingEnhanceUpload = useDraftVariantsStore(
    (s) => s.setPendingEnhanceUpload,
  );
  const setEnhanceCustomInstruction = useDraftVariantsStore(
    (s) => s.setEnhanceCustomInstruction,
  );

  useEffect(() => {
    return () => {
      if (stageTimerRef.current != null) {
        window.clearInterval(stageTimerRef.current);
      }
    };
  }, []);

  const startStageAnimation = useCallback(() => {
    let step = 0;
    setEnhanceStage(STAGE_SEQUENCE[0]);
    if (stageTimerRef.current != null) {
      window.clearInterval(stageTimerRef.current);
    }
    stageTimerRef.current = window.setInterval(() => {
      step = Math.min(step + 1, STAGE_SEQUENCE.length - 1);
      setEnhanceStage(STAGE_SEQUENCE[step]);
      if (step >= STAGE_SEQUENCE.length - 1 && stageTimerRef.current != null) {
        window.clearInterval(stageTimerRef.current);
        stageTimerRef.current = null;
      }
    }, 6500);
  }, [setEnhanceStage]);

  const stopStageAnimation = useCallback(() => {
    if (stageTimerRef.current != null) {
      window.clearInterval(stageTimerRef.current);
      stageTimerRef.current = null;
    }
    setEnhanceStage("idle");
  }, [setEnhanceStage]);

  /** Drop/select only — show preview; do not start the API yet. */
  const selectFileForEnhance = useCallback(
    async (file: File): Promise<{ ok: boolean; error?: string }> => {
      if (!file.type.startsWith("image/")) {
        return { ok: false, error: "נא לבחור קובץ תמונה" };
      }
      if (atDualLimit) {
        return { ok: false, error: MAX_VARIANTS_ERROR_HE };
      }

      try {
        const previewUrl = await readFileAsDataUrl(file);
        pendingEnhanceFile = file;
        setPendingEnhanceFlavors(null);
        setPendingEnhanceUpload({
          previewUrl,
          customInstruction:
            useDraftVariantsStore.getState().pendingEnhanceUpload
              ?.customInstruction ?? "",
        });
        setStudioMode("enhance");
        setMobileStage("form");
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "קריאת הקובץ נכשלה",
        };
      }
    },
    [
      atDualLimit,
      setMobileStage,
      setPendingEnhanceFlavors,
      setPendingEnhanceUpload,
      setStudioMode,
    ],
  );

  const clearPendingUpload = useCallback(() => {
    pendingEnhanceFile = null;
    setPendingEnhanceUpload(null);
  }, [setPendingEnhanceUpload]);

  /** Manual start — runs dual pipeline with optional custom instruction. */
  const startEnhance = useCallback(async (): Promise<{
    ok: boolean;
    error?: string;
    flavors?: PendingEnhanceFlavors;
  }> => {
    if (isImageBusy) return { ok: false, error: "busy" };
    if (atDualLimit) {
      return { ok: false, error: MAX_VARIANTS_ERROR_HE };
    }

    const file = pendingEnhanceFile;
    const upload = useDraftVariantsStore.getState().pendingEnhanceUpload;
    if (!file || !upload?.previewUrl) {
      return { ok: false, error: "נא לבחור תמונה תחילה" };
    }

    setIsImageBusy(true);
    startStageAnimation();
    setPendingEnhanceFlavors(null);

    try {
      const dataUrl = upload.previewUrl;
      const sessionId = ensureDraftSessionId();
      setSessionId(sessionId);

      const customInstruction = upload.customInstruction.trim() || undefined;
      const selectedEnhanceStyle =
        useDraftVariantsStore.getState().selectedEnhanceStyle;
      const preferredFlavor =
        selectedEnhanceStyle === "studio" ? "studio" : "natural";

      const businessCategory = industry || "automotive";
      const res = await fetch("/api/enhance-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: dataUrl,
          imageUrl: dataUrl,
          imageBase64: dataUrl,
          sessionId,
          industry: businessCategory,
          businessCategory,
          targetPlatform: activePlatform,
          dual: true,
          selectedEnhanceStyle,
          preferredFlavor,
          ...(customInstruction
            ? {
                customInstruction,
                userInstruction: customInstruction,
              }
            : {}),
          headline: headline || undefined,
          igCaption: instagramCaption || undefined,
          fbCaption: facebookCaption || undefined,
        }),
      });

      const json = (await res.json()) as {
        naturalUrl?: string;
        studioUrl?: string;
        variants?: PostDraftVariantRow[];
        dual?: boolean;
        flavors?: PendingEnhanceFlavors;
        error?: string;
      };

      const flavors = normalizeFlavors(json);

      if (!res.ok || !flavors) {
        if (
          json.error?.includes("Maximum 4") ||
          json.error?.includes("מקסימום")
        ) {
          return {
            ok: false,
            error: json.error || MAX_VARIANTS_ERROR_HE,
          };
        }
        setGeneratedImage(dataUrl);
        return {
          ok: false,
          error: json.error
            ? "הועלה ללא שיפור AI — בדקו את מפתח FAL"
            : "העלאה נכשלה",
        };
      }

      if (json.variants) {
        setVariants(json.variants);
      }

      pendingEnhanceFile = null;
      setPendingEnhanceUpload(null);
      setPendingEnhanceFlavors(flavors);
      // Apply the radio preference the user picked before enhance
      selectEnhanceFlavor(preferredFlavor);
      setIsGenerated(true);
      setMobileStage("preview");
      return { ok: true, flavors };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "שגיאה בהעלאה",
      };
    } finally {
      stopStageAnimation();
      setIsImageBusy(false);
    }
  }, [
    activePlatform,
    atDualLimit,
    facebookCaption,
    headline,
    industry,
    instagramCaption,
    setIsGenerated,
    setMobileStage,
    isImageBusy,
    setGeneratedImage,
    setIsImageBusy,
    setSessionId,
    setVariants,
    setPendingEnhanceFlavors,
    setPendingEnhanceUpload,
    selectEnhanceFlavor,
    startStageAnimation,
    stopStageAnimation,
  ]);

  return {
    selectFileForEnhance,
    startEnhance,
    clearPendingUpload,
    pendingEnhanceUpload,
    setEnhanceCustomInstruction,
    isImageBusy,
    atLimit,
    atDualLimit,
    enhanceStage,
  };
}
