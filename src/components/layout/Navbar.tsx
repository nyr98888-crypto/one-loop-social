"use client";

import { Suspense, useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import NavigationDrawer from "@/components/layout/NavigationDrawer";

export default function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <>
      <header className="sticky top-0 z-40 h-24 border-b border-slate-800/80 bg-[#070B19] py-2">
        {/*
          RTL (dir=rtl): flex start = physical RIGHT.
          DOM order: menu → logo → spacer → menu sits on the far right edge.
        */}
        <div className="mx-auto flex h-full w-full max-w-none items-center px-6 sm:px-8">
          {/* Far right (RTL start): menu pill flush to edge padding */}
          <div className="flex w-[7rem] shrink-0 justify-start sm:w-[7.5rem]">
            <button
              type="button"
              onClick={openDrawer}
              onMouseEnter={() => {
                if (
                  typeof window !== "undefined" &&
                  window.matchMedia("(hover: hover) and (pointer: fine)")
                    .matches
                ) {
                  openDrawer();
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/90 bg-slate-900/80 px-3.5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_0_0_#0f172a] transition hover:border-sky-500/40 hover:bg-slate-800 active:translate-y-[1px] active:shadow-none"
              aria-label="פתח תפריט ניווט"
              aria-expanded={drawerOpen}
              aria-controls="navigation-drawer"
            >
              <span className="text-base leading-none" aria-hidden>
                ☰
              </span>
              <span>תפריט</span>
            </button>
          </div>

          {/* Dead-center logo */}
          <div className="flex flex-1 items-center justify-center">
            <Link href="/" aria-label="One Loop Social — חזרה לדף הבית">
              <Image
                src="/logo.png"
                alt="One Loop Social"
                width={280}
                height={64}
                className="h-14 w-auto select-none object-contain md:h-16"
                priority
                unoptimized
              />
            </Link>
          </div>

          {/* Far left spacer — same width as menu for optical centering */}
          <div className="w-[7rem] shrink-0 sm:w-[7.5rem]" aria-hidden />
        </div>
      </header>

      <Suspense fallback={null}>
        <NavigationDrawer open={drawerOpen} onClose={closeDrawer} />
      </Suspense>
    </>
  );
}
