"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import MobileActionTray from "@/components/studio/MobileActionTray";
import PreviewColumn from "@/components/studio/PreviewColumn";
import SessionLockBanner from "@/components/studio/SessionLockBanner";
import StudioAssistant from "@/components/studio/workspace/StudioAssistant";
import { useDraftVariantsStore } from "@/store/useDraftVariantsStore";
import { usePostStore } from "@/store/usePostStore";

function StudioTabSync() {
  const searchParams = useSearchParams();
  const setStudioMode = usePostStore((s) => s.setStudioMode);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "enhance") setStudioMode("enhance");
    else if (tab === "bio" || tab === "card") setStudioMode("card");
  }, [searchParams, setStudioMode]);

  return null;
}

export default function StudioPage() {
  const mobileStage = usePostStore((s) => s.mobileStage);
  const setMobileStage = usePostStore((s) => s.setMobileStage);
  const hasHydrated = usePostStore((s) => s._hasHydrated);
  /** Dual enhance results — mirrored from the draft store for studio-wide sync. */
  const enhancedResults = useDraftVariantsStore((s) => s.pendingEnhanceFlavors);
  const activeFlavor = useDraftVariantsStore((s) => s.activeFlavor);
  /** Pre-enhance radio: authentic | studio (default authentic). */
  useDraftVariantsStore((s) => s.selectedEnhanceStyle);
  const [ready, setReady] = useState(false);

  // Keep mockupImage aligned when flavor toggles (store already writes generatedImage;
  // this subscription ensures the studio page re-renders with the active pair).
  useEffect(() => {
    if (!enhancedResults || !activeFlavor) return;
    const url =
      activeFlavor === "natural"
        ? enhancedResults.naturalUrl
        : enhancedResults.studioUrl;
    if (url) usePostStore.getState().setGeneratedImage(url);
  }, [enhancedResults, activeFlavor]);

  useEffect(() => {
    const result = usePostStore.persist.rehydrate();
    Promise.resolve(result).finally(() => setReady(true));
  }, []);

  const showContent = ready || hasHydrated;
  /** Mobile: form-only until generation; then preview-only. Desktop: both. */
  const showMobileForm = mobileStage === "form";
  const showMobilePreview = mobileStage === "preview";

  return (
    <div className="no-scrollbar flex h-[calc(100vh-96px)] flex-col overflow-hidden bg-slate-100/70">
      <Suspense fallback={null}>
        <StudioTabSync />
      </Suspense>
      <SessionLockBanner />

      <div className="mx-auto flex min-h-0 w-full max-w-[1550px] flex-1 flex-col px-3 py-1 sm:px-5">
        {showMobilePreview ? (
          <div className="mb-1 flex shrink-0 justify-end lg:hidden">
            <button
              type="button"
              onClick={() => setMobileStage("form")}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm"
            >
              <Pencil className="h-3 w-3" />
              טופס
            </button>
          </div>
        ) : null}

        {!showContent ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-sky-brand" />
            טוען...
          </div>
        ) : (
          <div
            className={[
              "grid min-h-0 flex-1 items-start gap-2.5 lg:grid-cols-2 lg:gap-3",
              showMobilePreview ? "pb-24 lg:pb-0" : "",
            ].join(" ")}
          >
            {/* RTL: first cell = right = form; second = left = preview */}
            <div
              className={[
                "min-h-0 w-full self-start overflow-hidden",
                showMobileForm
                  ? "flex justify-center"
                  : "hidden lg:block",
              ].join(" ")}
            >
              <div
                className={[
                  "w-full",
                  showMobileForm ? "mx-auto max-w-lg" : "",
                ].join(" ")}
              >
                <StudioAssistant />
              </div>
            </div>

            <div
              className={[
                "min-h-0 w-full self-start overflow-hidden",
                showMobilePreview ? "block" : "hidden lg:block",
              ].join(" ")}
            >
              <PreviewColumn />
            </div>
          </div>
        )}
      </div>

      {showContent && showMobilePreview ? <MobileActionTray /> : null}
    </div>
  );
}
