/** Persisted draft session id for uncommitted enhance variants. */
export const DRAFT_SESSION_STORAGE_KEY = "one-loop-draft-session";

export function readDraftSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(DRAFT_SESSION_STORAGE_KEY)?.trim();
    return value || null;
  } catch {
    return null;
  }
}

export function writeDraftSessionId(sessionId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DRAFT_SESSION_STORAGE_KEY, sessionId);
  } catch {
    // ignore quota / private mode
  }
}

export function clearDraftSessionId(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DRAFT_SESSION_STORAGE_KEY);
    // Legacy key from Step 2
    sessionStorage.removeItem("one-loop-enhance-session");
  } catch {
    // ignore
  }
}

/** Return existing localStorage session or create and persist a new one. */
export function ensureDraftSessionId(): string {
  const existing = readDraftSessionId();
  if (existing) return existing;
  const id = crypto.randomUUID();
  writeDraftSessionId(id);
  return id;
}
