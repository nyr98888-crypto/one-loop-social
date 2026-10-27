"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { Loader2, LogOut, Menu, X } from "lucide-react";
import { usePostStore } from "@/store/usePostStore";

const APP_VERSION = "0.1.0";

const MENU_ITEMS = [
  {
    href: "/studio",
    label: "⚡ יוצרים פוסט חדש",
    match: (path: string, tab: string | null) =>
      path.startsWith("/studio") && tab !== "enhance" && tab !== "bio",
  },
  {
    href: "/studio?tab=enhance",
    label: "📸 שדרוג תמונה",
    match: (path: string, tab: string | null) =>
      path.startsWith("/studio") && tab === "enhance",
  },
  {
    href: "/leads",
    label: "📅 מי פנה אליי והיומן שלי",
    match: (path: string) => path.startsWith("/leads"),
  },
  {
    href: "/reviews",
    label: "⭐ עונים לביקורות (גוגל ואיזי)",
    match: (path: string) => path.startsWith("/reviews"),
  },
  {
    href: "/studio?tab=card",
    label: "📇 כרטיס ביקור דיגיטלי",
    match: (path: string, tab: string | null) =>
      path.startsWith("/studio") && (tab === "bio" || tab === "card"),
  },
  {
    href: "/connect",
    label: "🌐 חיבורים לרשתות שלי",
    match: (path: string) => path.startsWith("/connect"),
  },
] as const;

export default function NavigationDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const { data: session, status } = useSession();
  const businessName = usePostStore((s) => s.businessName);
  const [busy, setBusy] = useState(false);

  const user = session?.user;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  async function handleGoogleSignIn() {
    setBusy(true);
    try {
      await signIn("google", { callbackUrl: pathname || "/studio" });
    } finally {
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
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="סגור תפריט"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={[
          "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      {/* Panel — from right */}
      <aside
        id="navigation-drawer"
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-label="תפריט ניווט"
        className={[
          "fixed inset-y-0 right-0 z-[60] flex w-80 max-w-[85vw] flex-col border-l border-slate-800 bg-[#0B0F19] shadow-2xl transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* Close — physical top-left of drawer (no collision with RTL edge / navbar) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute left-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/90 text-slate-200 transition hover:bg-slate-800 hover:text-white"
          aria-label="סגור תפריט"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Top: auth / profile */}
        <div className="border-b border-slate-800/80 px-5 pb-5 pt-12">
          <div className="mb-4">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              תפריט
            </span>
          </div>

          {status === "loading" ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              טוען...
            </div>
          ) : user ? (
            <div className="flex items-center gap-3">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-slate-700"
                />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sm font-bold text-sky-400">
                  {(businessName || user.name || "?").slice(0, 1)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {businessName?.trim() || user.name || "העסק שלי"}
                </p>
                {user.email ? (
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleSignOut()}
                  className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-red-400 disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <LogOut className="h-3 w-3" />
                  )}
                  התנתק
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleGoogleSignIn()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm font-semibold text-white transition hover:border-sky-500/40 hover:bg-slate-800/80 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GoogleGlyph />
              )}
              התחבר עם Google
            </button>
          )}
        </div>

        {/* Menu */}
        <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-4" aria-label="תפריט ראשי">
          <ul className="space-y-1">
            {MENU_ITEMS.map((item) => {
              const active = item.match(pathname, tab);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={[
                      "flex items-center rounded-xl px-3.5 py-3 text-sm transition",
                      active
                        ? "border-r-4 border-sky-400 bg-sky-500/10 font-medium text-sky-400"
                        : "border-r-4 border-transparent text-slate-300 hover:bg-slate-800/50 hover:text-white",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom */}
        <div className="space-y-3 border-t border-slate-800/80 px-5 py-4">
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>גרסה {APP_VERSION}</span>
            <a
              href="mailto:support@oneloopsocial.com"
              className="text-slate-400 transition hover:text-sky-400"
            >
              תמיכה
            </a>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800/50 hover:text-white"
          >
            <Menu className="h-4 w-4" aria-hidden />
            סגור תפריט
          </button>
        </div>
      </aside>
    </>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
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
