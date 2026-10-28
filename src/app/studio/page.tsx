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
  const enhancedResults = useDraftVariantsStore((s) => s.pendingEnhanceFlavors);
  const activeFlavor = useDraftVariantsStore((s) => s.activeFlavor);
  useDraftVariantsStore((s) => s.selectedEnhanceStyle);
  const [ready, setReady] = useState(false);

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
  const showMobileForm = mobileStage === "form";
  const showMobilePreview = mobileStage === "preview";

  return (
    <div className="relative flex h-[calc(100vh-54px)] flex-col overflow-hidden bg-slate-100/70 lg:overflow-hidden">
      <Suspense fallback={null}>
        <StudioTabSync />
      </Suspense>

      {/* Overlay only — never steals vertical page space */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
        <div className="pointer-events-auto">
          <SessionLockBanner />
        </div>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-[1550px] flex-1 flex-col px-2 py-1 sm:px-4 lg:overflow-hidden">
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
              "grid min-h-0 flex-1 gap-2 lg:grid-cols-2 lg:items-stretch lg:gap-3 lg:overflow-hidden",
              showMobilePreview ? "pb-24 lg:pb-0" : "",
            ].join(" ")}
          >
            {/* RTL: first cell = right = form; second = left = preview — equal columns */}
            <div
              className={[
                "min-h-0 w-full lg:h-full lg:overflow-hidden",
                showMobileForm ? "flex justify-center" : "hidden lg:block",
              ].join(" ")}
            >
              <div
                className={[
                  "flex h-full min-h-0 w-full flex-col lg:overflow-hidden",
                  showMobileForm ? "mx-auto max-w-lg" : "",
                ].join(" ")}
              >
                <StudioAssistant />
              </div>
            </div>

            <div
              className={[
                "min-h-0 w-full lg:h-full lg:overflow-hidden",
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
