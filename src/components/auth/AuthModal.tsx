"use client";

import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { Loader2, LogOut, X } from "lucide-react";

export default function AuthModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: session, status } = useSession();
  const [googleEnabled, setGoogleEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/status");
        const json = (await res.json()) as { googleEnabled?: boolean };
        if (!cancelled) setGoogleEnabled(Boolean(json.googleEnabled));
      } catch {
        if (!cancelled) setGoogleEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const user = session?.user;

  async function handleGoogleSignIn() {
    setError(null);
    setBusy(true);
    try {
      await signIn("google", { callbackUrl: "/studio" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "התחברות נכשלה");
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    try {
      await signOut({ callbackUrl: "/" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        aria-label="סגור"
        onClick={onClose}
      />
      <div className="absolute left-1/2 top-1/2 w-[min(100%-2rem,420px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">חשבון One Loop</h2>
            <p className="mt-1 text-xs text-slate-500">
              התחברות מאובטחת עם Google לשמירת הפוסטים שלכם
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="סגור"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {status === "loading" || googleEnabled === null ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            טוען...
          </div>
        ) : user ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-light text-sm font-bold text-sky-hover">
                  {(user.name || user.email || "?").slice(0, 1)}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {user.name || "משתמש"}
                </p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSignOut()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              התנתקות
            </button>
          </div>
        ) : googleEnabled ? (
          <div className="space-y-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleGoogleSignIn()}
              className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-b from-sky-brand to-sky-hover px-4 py-3.5 text-sm font-bold text-white shadow-sky-glow transition hover:brightness-105 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GoogleGlyph />
              )}
              המשך עם Google
            </button>
            {error ? (
              <p className="text-center text-xs text-red-600" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-4 text-sm text-amber-950">
            <p className="font-semibold">התחברות Google בהכנה</p>
            <p className="text-[13px] leading-relaxed text-amber-900/90">
              הוסיפו את משתני הסביבה{" "}
              <code className="rounded bg-white/70 px-1 text-[11px]">
                AUTH_SECRET
              </code>
              ,{" "}
              <code className="rounded bg-white/70 px-1 text-[11px]">
                AUTH_GOOGLE_ID
              </code>{" "}
              ו־
              <code className="rounded bg-white/70 px-1 text-[11px]">
                AUTH_GOOGLE_SECRET
              </code>{" "}
              (או{" "}
              <code className="rounded bg-white/70 px-1 text-[11px]">
                GOOGLE_CLIENT_ID
              </code>{" "}
              /{" "}
              <code className="rounded bg-white/70 px-1 text-[11px]">
                GOOGLE_CLIENT_SECRET
              </code>
              ) כדי להפעיל כניסה עם Google.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-amber-300/70 bg-white px-3 py-2.5 text-xs font-semibold text-amber-950 transition hover:bg-amber-100/50"
            >
              הבנתי, אמשיך בלי התחברות
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.1 5.5l.1.1 6.2 5.2C39.2 36.3 44 31 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}
