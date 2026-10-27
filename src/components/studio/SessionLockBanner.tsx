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
      className="border-b border-sky-brand/20 bg-sky-light/90 text-slate-800"
      role="status"
    >
      <div className="mx-auto flex max-w-[1550px] flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm sm:px-6">
        <p className="text-[13px] font-medium">
          יש לך טיוטת פוסט פעילה
          <span className="mx-1 text-slate-500">({pendingCount} גרסאות)</span>
        </p>
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleContinue()}
            className="font-semibold text-sky-brand underline-offset-2 transition hover:underline disabled:opacity-50"
          >
            המשך לעבוד על הטיוטה
          </button>
          <span className="text-slate-400" aria-hidden>
            |
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDiscard()}
            className="font-medium text-slate-600 underline-offset-2 transition hover:text-red-600 hover:underline disabled:opacity-50"
          >
            מחק והתחל חדש
          </button>
        </div>
      </div>
    </div>
  );
}
