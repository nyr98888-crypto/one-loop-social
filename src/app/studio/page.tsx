"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import StudioAssistant from "@/components/studio/workspace/StudioAssistant";
import StudioPreviewCard from "@/components/studio/workspace/StudioPreviewCard";
import { usePostStore } from "@/store/usePostStore";

export default function StudioPage() {
  const businessName = usePostStore((s) => s.businessName);
  const isGenerated = usePostStore((s) => s.isGenerated);

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden bg-slate-100/70">
      <div className="mx-auto flex h-full max-w-[1550px] flex-col px-4 py-3 sm:px-6">
        {/* Compact header — stays inside the zero-scroll viewport */}
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-sky-brand"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                סטודיו חי
              </Link>
              <span className="hidden h-3 w-px bg-slate-300 sm:block" />
              <h1 className="truncate text-sm font-bold text-slate-900 sm:text-base">
                סטודיו · {businessName}
              </h1>
            </div>
            {!isGenerated ? (
              <p className="mt-0.5 text-[11px] text-slate-500">
                עדיין אין פוסט שנוצר — אפשר לערוך ידנית או לחזור ליצירה המהירה.
              </p>
            ) : null}
          </div>
          <span className="hidden rounded-full bg-sky-light px-2.5 py-1 text-[11px] font-bold text-sky-brand sm:inline">
            עריכה ופרסום
          </span>
        </div>

        {/* Two balanced columns — RTL: Assistant (right) · Preview (left) */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
          <div className="order-2 min-h-0 overflow-hidden lg:order-none">
            <StudioAssistant />
          </div>
          <div className="order-1 min-h-0 overflow-hidden lg:order-none">
            <StudioPreviewCard />
          </div>
        </div>
      </div>
    </div>
  );
}
