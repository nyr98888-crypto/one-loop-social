"use client";

import { type ActivePlatform, usePostStore } from "@/store/usePostStore";

const PLATFORMS: {
  id: ActivePlatform;
  label: string;
  activeClass: string;
  glowClass: string;
}[] = [
  {
    id: "whatsapp",
    label: "כרטיס דיגיטלי",
    activeClass:
      "border-emerald-400 bg-emerald-500/10 font-semibold text-emerald-950 shadow-[0_0_15px_rgba(37,211,102,0.35)]",
    glowClass: "bg-[#25D366]/35",
  },
  {
    id: "instagram",
    label: "Instagram",
    activeClass:
      "border-pink-400 bg-gradient-to-r from-purple-500/15 via-pink-500/15 to-orange-400/15 font-semibold text-fuchsia-950 shadow-[0_0_18px_rgba(236,72,153,0.35)]",
    glowClass:
      "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 opacity-30",
  },
  {
    id: "facebook",
    label: "Facebook",
    activeClass:
      "border-[#1877F2] bg-[#1877F2]/10 font-semibold text-slate-900 shadow-[0_0_15px_rgba(24,119,242,0.35)]",
    glowClass: "bg-[#1877F2]/35",
  },
  {
    id: "google",
    label: "Google Business",
    activeClass:
      "border-[#4285F4] bg-[#4285F4]/10 font-semibold text-slate-900 shadow-[0_0_15px_rgba(66,133,244,0.3)]",
    glowClass: "bg-[#4285F4]/30",
  },
  {
    id: "easy",
    label: "איזי",
    activeClass:
      "border-[#FF6B00] bg-[#FF6B00]/15 font-semibold text-[#FF6B00] shadow-[0_0_18px_rgba(255,107,0,0.4)]",
    glowClass: "bg-[#FF6B00]/40",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    activeClass:
      "border-[#0A66C2] bg-[#0A66C2]/10 font-semibold text-slate-900 shadow-[0_0_15px_rgba(10,102,194,0.35)]",
    glowClass: "bg-[#0A66C2]/35",
  },
];

function PlatformIcon({ platform }: { platform: ActivePlatform }) {
  switch (platform) {
    case "whatsapp":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
          <path
            fill="#25D366"
            d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
          />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
          <defs>
            <radialGradient id="ig-grad" cx="30%" cy="107%" r="150%">
              <stop offset="0%" stopColor="#fdf497" />
              <stop offset="45%" stopColor="#fd5949" />
              <stop offset="60%" stopColor="#d6249f" />
              <stop offset="90%" stopColor="#285AEB" />
            </radialGradient>
          </defs>
          <path
            fill="url(#ig-grad)"
            d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
          />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
          <path
            fill="#1877F2"
            d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
          />
        </svg>
      );
    case "google":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      );
    case "easy":
      return (
        <span
          className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] bg-[#FF6B00] text-[11px] font-black leading-none text-white"
          aria-hidden
        >
          e
        </span>
      );
    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
          <path
            fill="#0A66C2"
            d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
          />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * Authentic social capsules with brand glows (incl. easy + LinkedIn).
 */
export default function PlatformCapsules() {
  const activePlatform = usePostStore((s) => s.activePlatform);
  const setActivePlatform = usePostStore((s) => s.setActivePlatform);

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
      <div
        className="flex max-w-full flex-wrap items-center gap-2 sm:gap-2.5"
        role="tablist"
        aria-label="בחירת פלטפורמה"
      >
        {PLATFORMS.map(({ id, label, activeClass, glowClass }) => {
          const active = activePlatform === id;
          return (
            <div key={id} className="relative isolate">
              {active ? (
                <span
                  className={[
                    "capsule-ambient-glow absolute -inset-1 -z-10 rounded-2xl blur-md",
                    glowClass,
                  ].join(" ")}
                  aria-hidden
                />
              ) : null}
              <button
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActivePlatform(id)}
                className={[
                  "relative inline-flex cursor-pointer select-none items-center gap-2 rounded-full border px-3 py-2 text-xs sm:px-3.5",
                  "bg-white/90 backdrop-blur-md",
                  "transition-all duration-200 ease-out",
                  "hover:scale-105 hover:shadow-md",
                  "active:scale-95",
                  active
                    ? activeClass
                    : id === "easy"
                      ? "border-[#FF6B00]/45 bg-[#FFF4ED] font-medium text-[#FF6B00] hover:border-[#FF6B00]"
                      : "border-slate-200/80 font-medium text-slate-600 hover:border-slate-300",
                ].join(" ")}
              >
                <PlatformIcon platform={id} />
                <span className="whitespace-nowrap">{label}</span>
              </button>
            </div>
          );
        })}
      </div>

      <span
        className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/80 px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 backdrop-blur-md"
        title="חיבור דף עסקי — בקרוב"
      >
        🌐 חבר דף עסקי
      </span>
    </div>
  );
}
