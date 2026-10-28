"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { PostDraftVariantRow } from "@/lib/db/schema";
import { callFinalizePost } from "@/lib/api/finalize-post";
import {
  readDraftSessionId,
  writeDraftSessionId,
} from "@/lib/session/draft-session";
import { useDraftVariantsStore } from "@/store/useDraftVariantsStore";

/**
 * Top bar when localStorage has an uncommitted sessionId with server variants.
 */
export default function SessionLockBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const variantsInStore = useDraftVariantsStore((s) => s.variants.length);
  const setSessionId = useDraftVariantsStore((s) => s.setSessionId);
  const setVariants = useDraftVariantsStore((s) => s.setVariants);
  const selectVariant = useDraftVariantsStore((s) => s.selectVariant);
  const setSessionBannerDismissed = useDraftVariantsStore(
    (s) => s.setSessionBannerDismissed,
  );

  const probe = useCallback(async () => {
    // Already working on drafts in this tab — no lock banner.
    if (variantsInStore > 0) {
      setPendingSessionId(null);
      setPendingCount(0);
      return;
    }

    const sessionId = readDraftSessionId();
    if (!sessionId) {
      setPendingSessionId(null);
      setPendingCount(0);
      return;
    }

    try {
      const res = await fetch(
        `/api/draft-variants?sessionId=${encodeURIComponent(sessionId)}`,
      );
      const json = (await res.json()) as {
        ok?: boolean;
        variants?: PostDraftVariantRow[];
      };

      if (!res.ok || !json.variants?.length) {
        setPendingSessionId(null);
        setPendingCount(0);
        return;
      }

      setPendingSessionId(sessionId);
      setPendingCount(json.variants.length);
    } catch {
      setPendingSessionId(null);
      setPendingCount(0);
    }
  }, [variantsInStore]);

  useEffect(() => {
    void probe();
  }, [probe, pathname]);

  async function handleContinue() {
    if (!pendingSessionId || busy) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/draft-variants?sessionId=${encodeURIComponent(pendingSessionId)}`,
      );
      const json = (await res.json()) as {
        variants?: PostDraftVariantRow[];
      };
      const variants = json.variants ?? [];
      if (!variants.length) {
        setPendingSessionId(null);
        return;
      }

      writeDraftSessionId(pendingSessionId);
      setSessionId(pendingSessionId);
      setVariants(variants);
      const last = variants[variants.length - 1];
      selectVariant(last.variant_index);
      setSessionBannerDismissed(true);
      setPendingSessionId(null);
      setPendingCount(0);

      if (pathname !== "/studio") {
        router.push("/studio");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDiscard() {
    if (!pendingSessionId || busy) return;
    setBusy(true);
    try {
      await callFinalizePost({
        action: "discard",
        sessionId: pendingSessionId,
        showSuccessToast: false,
      });
      setPendingSessionId(null);
      setPendingCount(0);
    } finally {
      setBusy(false);
    }
  }

  if (!pendingSessionId || pendingCount === 0) return null;

  return (
    <div
      className="mx-auto mt-2 max-w-xl rounded-2xl border border-sky-brand/30 bg-white/95 px-3 py-2 text-slate-800 shadow-lg backdrop-blur-md"
      role="status"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-[12px] font-medium">
          יש לך טיוטת פוסט פעילה
          <span className="mx-1 text-slate-500">({pendingCount})</span>
        </p>
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleContinue()}
            className="font-semibold text-sky-brand underline-offset-2 transition hover:underline disabled:opacity-50"
          >
            המשך
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDiscard()}
            className="font-medium text-slate-600 underline-offset-2 transition hover:text-red-600 hover:underline disabled:opacity-50"
          >
            מחק
          </button>
        </div>
      </div>
    </div>
  );
}
