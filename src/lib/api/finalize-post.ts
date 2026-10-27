import {
  clearDraftSessionId,
  readDraftSessionId,
} from "@/lib/session/draft-session";
import { useDraftVariantsStore } from "@/store/useDraftVariantsStore";
import { useToastStore } from "@/store/useToastStore";

export type FinalizeClientAction = "commit" | "discard";

export interface FinalizeClientResult {
  success: boolean;
  savedPostId?: string;
  discarded?: boolean;
  error?: string;
}

const SUCCESS_TOAST = "הפוסט נשמר בהצלחה! הטיוטות הזמניות נוקו.";

export async function callFinalizePost(input: {
  action: FinalizeClientAction;
  sessionId: string;
  selectedVariantId?: string;
  businessId?: string;
  showSuccessToast?: boolean;
}): Promise<FinalizeClientResult> {
  const res = await fetch("/api/finalize-post", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: input.action,
      sessionId: input.sessionId,
      selectedVariantId: input.selectedVariantId,
      businessId: input.businessId,
    }),
  });

  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    savedPostId?: string;
    discarded?: boolean;
    error?: string;
  } | null;

  if (!res.ok || !json?.success) {
    return {
      success: false,
      error: json?.error ?? "פעולת הסיום נכשלה",
    };
  }

  clearDraftSessionId();
  useDraftVariantsStore.getState().clearDraftSession();

  if (input.action === "commit" && input.showSuccessToast !== false) {
    useToastStore.getState().showToast(SUCCESS_TOAST);
  }

  return {
    success: true,
    savedPostId: json.savedPostId,
    discarded: json.discarded,
  };
}

/** Resolve the active draft variant id for commit, if any. */
export function getActiveSelectedVariantId(): string | null {
  const { variants, activeVariantIndex } = useDraftVariantsStore.getState();
  if (activeVariantIndex == null) return null;
  return (
    variants.find((v) => v.variant_index === activeVariantIndex)?.id ?? null
  );
}

export function getActiveSessionId(): string | null {
  return (
    useDraftVariantsStore.getState().sessionId ?? readDraftSessionId()
  );
}
