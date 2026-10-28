"use client";

import { useState } from "react";
import LivePreview, { type PreviewPlatform } from "./LivePreview";

type SocialAssetsColumnProps = {
  className?: string;
};

/**
 * Right-side smile-grid column (RTL col1): segmented IG | FB + single image card.
 * Fits within 100vh — no nested vertical scroll.
 */
export default function SocialAssetsColumn({
  className,
}: SocialAssetsColumnProps) {
  const [platform, setPlatform] = useState<PreviewPlatform>("instagram");

  return (
    <div
      dir="rtl"
      className={[
        "flex h-full max-h-full min-h-0 w-full flex-col gap-3 overflow-hidden p-0.5 [contain:layout]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="נכסי אינסטגרם ופייסבוק"
    >
      <div
        role="group"
        aria-label="בחירת רשת"
        className="mx-auto flex w-full shrink-0 gap-1 rounded-full border border-slate-200 bg-slate-50 p-1"
      >
        <button
          type="button"
          onClick={() => setPlatform("instagram")}
          className={[
            "flex-1 rounded-full px-3 py-2 text-center text-[12px] font-semibold transition-all sm:text-sm",
            platform === "instagram"
              ? "bg-white text-sky-700 shadow-sm"
              : "text-slate-500 hover:text-slate-700",
          ].join(" ")}
        >
          📷 אינסטגרם
        </button>
        <button
          type="button"
          onClick={() => setPlatform("facebook")}
          className={[
            "flex-1 rounded-full px-3 py-2 text-center text-[12px] font-semibold transition-all sm:text-sm",
            platform === "facebook"
              ? "bg-white text-sky-700 shadow-sm"
              : "text-slate-500 hover:text-slate-700",
          ].join(" ")}
        >
          📘 פייסבוק
        </button>
      </div>

      <LivePreview
        key={platform}
        platform={platform}
        className="min-h-0 flex-1 overflow-hidden"
      />
    </div>
  );
}
