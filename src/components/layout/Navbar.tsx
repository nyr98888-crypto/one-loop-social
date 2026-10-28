"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { Loader2, LogOut } from "lucide-react";

const NAV_LINKS = [
  {
    href: "/",
    label: "סטודיו",
    match: (p: string) => p === "/" || p.startsWith("/studio"),
  },
  {
    href: "/performance",
    label: "ביצועים ואפקטיביות",
    match: (p: string) => p.startsWith("/performance"),
  },
  {
    href: "/leads",
    label: "לידים ויומן",
    match: (p: string) => p.startsWith("/leads"),
  },
  {
    href: "/reviews",
    label: "ביקורות",
    match: (p: string) => p.startsWith("/reviews"),
  },
] as const;

export default function Navbar() {
  const pathname = usePathname() ?? "";
  const { data: session, status } = useSession();
  const [busy, setBusy] = useState(false);
  const user = session?.user;

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
    <header className="sticky top-0 z-40 h-[54px] bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/15">
      {/*
        Strict RTL flex: start = physical RIGHT.
        DOM order: auth (right) → nav pills (center) → logo (left).
      */}
      <div className="mx-auto flex h-full w-full max-w-7xl items-center gap-2 px-3 sm:px-5">
        <div className="flex w-[10rem] shrink-0 items-center justify-start sm:w-[12rem]">
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin text-white/80" />
          ) : user ? (
            <div className="flex items-center gap-1.5">
              <span
                className="hidden max-w-[7rem] truncate rounded-full border border-white/20 bg-white/15 px-2 py-1 text-[10px] font-medium text-white/90 sm:inline-block"
                title={user.email ?? user.name ?? undefined}
              >
                {user.email || user.name}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSignOut()}
                className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-white/30 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LogOut className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">התנתק</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleGoogleSignIn()}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-3.5 py-1.5 text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-white/30 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <GoogleMark />
              )}
              התחבר עם Google
            </button>
          )}
        </div>

        <nav
          className="no-scrollbar flex min-w-0 flex-1 items-center justify-center gap-1.5 overflow-x-auto"
          aria-label="ניווט ראשי"
        >
          {NAV_LINKS.map((link) => {
            const active = link.match(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all sm:text-sm",
                  active
                    ? "bg-white font-bold text-sky-700 shadow-sm"
                    : "border border-white/10 text-white/90 hover:bg-white/15",
                ].join(" ")}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex w-[10rem] shrink-0 items-center justify-end sm:w-[12rem]">
          <Link
            href="/"
            className="group flex h-7 max-h-7 items-center gap-1.5 text-white"
            aria-label="One Loop Social"
          >
            {/*
              PNG logo ships with an opaque navy plate; brightness/invert
              filters turn that plate into a white rectangle. Render a crisp
              transparent brand mark instead.
            */}
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center bg-gradient-to-br from-cyan-300 via-sky-200 to-fuchsia-300 bg-clip-text text-[22px] font-black leading-none text-transparent drop-shadow-[0_0_8px_rgba(255,255,255,0.35)]"
              aria-hidden
            >
              ∞
            </span>
            <span className="flex max-h-7 flex-col justify-center leading-none">
              <span className="text-[13px] font-bold tracking-tight text-white">
                One <span className="text-cyan-200">Loop</span>
              </span>
              <span className="mt-0.5 text-[8px] font-semibold tracking-[0.22em] text-white/85">
                SOCIAL
              </span>
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-3.5 w-3.5 shrink-0" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34.2 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34.2 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l.1.1 6.2 5.2C39.2 37.3 44 32 44 24c0-1.3-.1-2.7-.4-3.9z"
      />
    </svg>
  );
}
