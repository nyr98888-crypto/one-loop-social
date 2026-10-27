"use client";

import {
  Facebook,
  Instagram,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { type ActivePlatform, usePostStore } from "@/store/usePostStore";

const PLATFORMS: {
  id: ActivePlatform;
  label: string;
  icon: typeof Instagram;
}[] = [
  { id: "whatsapp", label: "WhatsApp Card", icon: MessageCircle },
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "facebook", label: "Facebook", icon: Facebook },
  { id: "google", label: "Google Business", icon: MapPin },
];

export default function PlatformSwitcher() {
  const activePlatform = usePostStore((s) => s.activePlatform);
  const setActivePlatform = usePostStore((s) => s.setActivePlatform);

  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="בחירת פלטפורמה"
    >
      {PLATFORMS.map(({ id, label, icon: Icon }) => {
        const active = activePlatform === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setActivePlatform(id)}
            className={[
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition",
              active
                ? "bg-sky-brand text-white shadow-sky-glow ring-2 ring-sky-brand/30"
                : "border border-slate-200 bg-white text-slate-600 hover:border-sky-brand/40 hover:text-sky-brand",
            ].join(" ")}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
