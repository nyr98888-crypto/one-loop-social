"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  HelpCircle,
  LayoutDashboard,
  Settings,
  Sparkles,
  User,
} from "lucide-react";

type StudioStatus = "preview" | "live";

interface NavbarProps {
  status?: StudioStatus;
}

const statusLabel: Record<StudioStatus, string> = {
  preview: "מבט מהיר",
  live: "סטודיו חי",
};

export default function Navbar({ status = "live" }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 h-16 border-b border-slate-800/60 bg-studio-navbar">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Right (RTL start): Logo + Brand */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5"
          aria-label="One Loop Social"
        >
          <Image
            src="/logo.png"
            alt=""
            width={160}
            height={40}
            className="h-10 w-auto max-w-[10rem] object-contain object-right"
            priority
          />
          <span className="hidden text-base font-semibold tracking-tight text-white lg:inline">
            One Loop{" "}
            <span className="text-sky-brand">Social</span>
          </span>
        </Link>

        {/* Center: Floating status badge */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className="inline-flex items-center gap-1.5 rounded-full border border-sky-brand/40 bg-sky-brand/15 px-3.5 py-1.5 text-xs font-medium text-sky-100 shadow-sky-glow"
            role="status"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-brand opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-brand" />
            </span>
            <Sparkles className="h-3.5 w-3.5 text-sky-brand" aria-hidden />
            {statusLabel[status]}
          </div>
        </div>

        {/* Left (RTL end): Quick nav + profile */}
        <nav className="flex shrink-0 items-center gap-1 sm:gap-2" aria-label="ניווט מהיר">
          <NavIcon href="/" label="לוח בקרה">
            <LayoutDashboard className="h-4 w-4" />
          </NavIcon>
          <NavIcon href="/settings" label="הגדרות">
            <Settings className="h-4 w-4" />
          </NavIcon>
          <NavIcon href="/help" label="עזרה">
            <HelpCircle className="h-4 w-4" />
          </NavIcon>
          <NavIcon href="/notifications" label="התראות">
            <Bell className="h-4 w-4" />
          </NavIcon>

          <div className="mx-1 hidden h-6 w-px bg-slate-700/80 sm:block" />

          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/60 py-1 pl-1 pr-2.5 text-sm text-slate-200 transition hover:border-slate-600 hover:bg-slate-800/80"
            aria-label="פרופיל משתמש"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-light text-sky-hover">
              <User className="h-3.5 w-3.5" />
            </span>
            <span className="hidden max-w-[7rem] truncate text-xs font-medium sm:inline">
              משתמש
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
}

function NavIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800/80 hover:text-sky-brand"
    >
      {children}
    </Link>
  );
}
