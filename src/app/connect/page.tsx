"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { normalizeIsraeliWhatsAppDigits } from "@/lib/ai/whatsapp";
import {
  getPlatformDeepLink,
  getPlatformGuideTitle,
} from "@/lib/publish/deep-links";
import {
  selectActiveCaption,
  usePostStore,
} from "@/store/usePostStore";
import {
  type ManualGuidePlatform,
  type OfficialChannel,
  useSocialConnectStore,
} from "@/store/useSocialConnectStore";
import { useToastStore } from "@/store/useToastStore";

type DockPlatform = ManualGuidePlatform;

const DOCK: {
  id: DockPlatform;
  label: string;
  halo: string;
  activeRing: string;
}[] = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    halo: "shadow-[0_10px_25px_-5px_rgba(37,211,102,0.4)]",
    activeRing: "ring-[#25D366]/50",
  },
  {
    id: "instagram",
    label: "אינסטגרם",
    halo: "shadow-[0_10px_28px_-5px_rgba(225,48,108,0.45),0_8px_20px_-8px_rgba(253,89,73,0.35)]",
    activeRing: "ring-pink-400/50",
  },
  {
    id: "facebook",
    label: "פייסבוק",
    halo: "shadow-[0_10px_25px_-5px_rgba(24,119,242,0.45)]",
    activeRing: "ring-[#1877F2]/50",
  },
  {
    id: "google",
    label: "Google",
    halo: "shadow-[0_10px_25px_-5px_rgba(66,133,244,0.4)]",
    activeRing: "ring-[#4285F4]/50",
  },
  {
    id: "easy",
    label: "איזי",
    halo: "shadow-[0_10px_25px_-5px_rgba(18,150,212,0.5)]",
    activeRing: "ring-[#1296D4]/55",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    halo: "shadow-[0_10px_25px_-5px_rgba(10,102,194,0.45)]",
    activeRing: "ring-[#0A66C2]/50",
  },
];

const STEPS = [
  {
    n: 1,
    title: "העתקת טקסט והורדת תמונה",
    body: "הטקסט ללוח · התמונה להורדות.",
  },
  {
    n: 2,
    title: "פתיחת האפליקציה",
    body: "פותחים פוסט חדש בפלטפורמה.",
  },
  {
    n: 3,
    title: "הדבקה ופרסום",
    body: "מדביקים, מעלים תמונה ומפרסמים.",
  },
] as const;

function buildWhatsAppShareUrl(phone: string, text: string): string {
  const digits = normalizeIsraeliWhatsAppDigits(phone);
  const encoded = encodeURIComponent(text);
  const mobile =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  if (mobile) {
    return digits
      ? `whatsapp://send?phone=${digits}&text=${encoded}`
      : `whatsapp://send?text=${encoded}`;
  }

  return digits
    ? `https://wa.me/${digits}?text=${encoded}`
    : `https://web.whatsapp.com/send?text=${encoded}`;
}

export default function ConnectPage() {
  const facebook = useSocialConnectStore((s) => s.facebook);
  const instagram = useSocialConnectStore((s) => s.instagram);
  const googleBusiness = useSocialConnectStore((s) => s.googleBusiness);
  const connectChannel = useSocialConnectStore((s) => s.connectChannel);
  const disconnectChannel = useSocialConnectStore((s) => s.disconnectChannel);
  const hasHydrated = useSocialConnectStore((s) => s._hasHydrated);

  const headline = usePostStore((s) => s.headline);
  const caption = usePostStore(selectActiveCaption);
  const generatedImage = usePostStore((s) => s.generatedImage);
  const whatsappNumber = usePostStore((s) => s.whatsappNumber);
  const setWhatsappNumber = usePostStore((s) => s.setWhatsappNumber);

  const showToast = useToastStore((s) => s.showToast);

  const [selected, setSelected] = useState<DockPlatform>("instagram");
  const [stepDone, setStepDone] = useState<1 | 2 | 3 | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyChannel, setBusyChannel] = useState<OfficialChannel | null>(null);

  useEffect(() => {
    void useSocialConnectStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    setStepDone(null);
  }, [selected]);

  const deep = getPlatformDeepLink(selected);
  const guideTitle = getPlatformGuideTitle(selected);
  const postText = [headline, caption].filter(Boolean).join("\n\n");

  async function copyPostText(): Promise<boolean> {
    if (!postText) return false;
    try {
      await navigator.clipboard.writeText(postText);
      return true;
    } catch {
      return false;
    }
  }

  async function downloadImage() {
    if (!generatedImage) return;
    try {
      const res = await fetch(generatedImage);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `one-loop-${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* CORS / placeholder */
    }
  }

  async function handleStep1() {
    setBusy(true);
    try {
      await copyPostText();
      await downloadImage();
      setStepDone(1);
      showToast("הטקסט הועתק והתמונה הורדה");
    } finally {
      setBusy(false);
    }
  }

  function handleStep2() {
    window.open(deep.href, "_blank", "noopener,noreferrer");
    setStepDone(2);
  }

  async function handleBusinessConnect(channel: OfficialChannel) {
    setBusyChannel(channel);
    await new Promise((r) => setTimeout(r, 350));
    const current =
      channel === "facebook"
        ? facebook
        : channel === "instagram"
          ? instagram
          : googleBusiness;
    if (current.connected) {
      disconnectChannel(channel);
      showToast("החיבור נותק");
    } else {
      connectChannel(channel, { stub: true });
      showToast("התחברת לחשבון עסקי");
    }
    setBusyChannel(null);
  }

  async function handleWhatsAppShare() {
    const url = buildWhatsAppShareUrl(whatsappNumber, postText || "שלום!");
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleEasyJump() {
    const ok = await copyPostText();
    window.open("https://easy.co.il", "_blank", "noopener,noreferrer");
    showToast(
      ok
        ? "הטקסט הועתק — ממשיכים לניהול באיזי"
        : "נפתח איזי — העתיקו את הטקסט מהסטודיו",
    );
  }

  async function handlePersonalPath(platform: "facebook" | "instagram") {
    setBusy(true);
    try {
      await copyPostText();
      await downloadImage();
      const href =
        platform === "facebook"
          ? "https://www.facebook.com"
          : "https://www.instagram.com";
      window.open(href, "_blank", "noopener,noreferrer");
      showToast("הטקסט הועתק — הדביקו בפוסט החדש");
      setStepDone(2);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="no-scrollbar flex h-[calc(100vh-6rem)] flex-col overflow-hidden bg-gradient-to-b from-white via-studio-bg to-sky-light/50">
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4 py-3 sm:px-6 sm:py-4">
        <header className="mb-3 shrink-0 text-center">
          <h1 className="text-balance text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            בחרו פלטפורמה{" "}
            <span className="text-sky-brand">ופרסמו</span>
          </h1>
        </header>

        <div
          className="mb-3 flex shrink-0 max-w-full flex-wrap items-center justify-center gap-2 rounded-[1.75rem] border border-white/80 bg-white/70 px-3 py-2.5 shadow-[0_20px_50px_-24px_rgba(14,165,233,0.35)] backdrop-blur-md sm:gap-2.5 sm:px-4"
          role="tablist"
          aria-label="בחירת פלטפורמה לפרסום"
        >
          {DOCK.map((p) => {
            const active = selected === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelected(p.id)}
                className={[
                  "relative inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-all duration-200",
                  "hover:scale-105 active:scale-95",
                  p.id === "easy"
                    ? "border-[#1296D4]/40 bg-[#1296D4]/15 text-[#007EBA]"
                    : "bg-white",
                  active
                    ? `border-transparent ring-2 ${p.activeRing} ${p.halo} ${
                        p.id === "easy"
                          ? "bg-[#1296D4] text-white"
                          : "bg-white text-slate-900"
                      }`
                    : p.id === "easy"
                      ? "hover:border-[#1296D4]"
                      : "border-slate-200/90 text-slate-600 hover:border-slate-300",
                ].join(" ")}
              >
                <PlatformMark platform={p.id} />
                <span className="whitespace-nowrap">{p.label}</span>
              </button>
            );
          })}
        </div>

        <section
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5"
          aria-labelledby="connect-guide-title"
        >
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-light">
              <PlatformMark platform={selected} large />
            </span>
            <h2
              id="connect-guide-title"
              className="text-base font-bold text-slate-900 sm:text-lg"
            >
              {guideTitle}
            </h2>
          </div>

          {selected === "whatsapp" ? (
            <WhatsAppPanel
              phone={whatsappNumber}
              onPhoneChange={setWhatsappNumber}
              onShare={() => void handleWhatsAppShare()}
            />
          ) : null}

          {selected === "facebook" || selected === "instagram" ? (
            <MetaDualPanel
              platform={selected}
              connected={
                selected === "facebook"
                  ? facebook.connected
                  : instagram.connected
              }
              hydrated={hasHydrated}
              busy={
                busy ||
                busyChannel ===
                  (selected === "facebook" ? "facebook" : "instagram")
              }
              onBusinessConnect={() =>
                void handleBusinessConnect(
                  selected === "facebook" ? "facebook" : "instagram",
                )
              }
              onPersonalPath={() => void handlePersonalPath(selected)}
            />
          ) : null}

          {selected === "google" ? (
            <GooglePanel
              connected={googleBusiness.connected}
              hydrated={hasHydrated}
              busy={busyChannel === "googleBusiness"}
              onConnect={() => void handleBusinessConnect("googleBusiness")}
            />
          ) : null}

          {selected === "easy" ? (
            <EasyPanel onJump={() => void handleEasyJump()} />
          ) : null}

          {selected === "linkedin" ? (
            <ThreeStepPanel
              steps={STEPS}
              stepDone={stepDone}
              busy={busy}
              deepLabel={deep.label}
              onStep1={() => void handleStep1()}
              onStep2={handleStep2}
              onStep3={() => setStepDone(3)}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}

function WhatsAppPanel({
  phone,
  onPhoneChange,
  onShare,
}: {
  phone: string;
  onPhoneChange: (v: string) => void;
  onShare: () => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-[#25D366]/25 bg-[#25D366]/5 p-4">
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-slate-700">
          מספר הוואטסאפ של העסק
        </span>
        <input
          className="studio-input py-2.5"
          dir="ltr"
          inputMode="tel"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="050-1234567"
        />
      </label>
      <button
        type="button"
        onClick={onShare}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#1da851] transition hover:brightness-105 active:translate-y-[2px] active:shadow-[0_2px_0_0_#1da851]"
      >
        <span aria-hidden>⚡</span>
        פתח שיתוף ישיר בוואטסאפ
      </button>
    </div>
  );
}

function MetaDualPanel({
  platform,
  connected,
  hydrated,
  busy,
  onBusinessConnect,
  onPersonalPath,
}: {
  platform: "facebook" | "instagram";
  connected: boolean;
  hydrated: boolean;
  busy: boolean;
  onBusinessConnect: () => void;
  onPersonalPath: () => void;
}) {
  const brand =
    platform === "facebook"
      ? { bg: "bg-[#1877F2]", shadow: "shadow-[0_4px_0_0_#0f5fc7]" }
      : {
          bg: "bg-gradient-to-b from-[#E1306C] to-[#F77737]",
          shadow: "shadow-[0_4px_0_0_#c13584]",
        };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <p className="mb-1 text-sm font-bold text-slate-900">
          מסלול עסקי
        </p>
        <p className="mb-3 text-[12px] text-slate-500">פרסום אוטומטי</p>
        {!hydrated ? (
          <div className="flex justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-sky-brand" />
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={onBusinessConnect}
            className={[
              "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-[13px] font-bold text-white transition disabled:opacity-50",
              connected
                ? "bg-emerald-600 shadow-[0_3px_0_0_#047857]"
                : `${brand.bg} ${brand.shadow}`,
            ].join(" ")}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : connected ? (
              <Check className="h-4 w-4" />
            ) : null}
            {connected ? "מחובר · נתק" : "התחבר לחשבון עסקי"}
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="mb-1 text-sm font-bold text-slate-900">
          מסלול אישי
        </p>
        <p className="mb-3 text-[12px] text-slate-500">3 צעדים מהירים</p>
        <button
          type="button"
          disabled={busy}
          onClick={onPersonalPath}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-bold text-slate-800 transition hover:border-sky-brand/40 hover:bg-sky-light/40 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-sky-brand" />
              <ExternalLink className="h-3.5 w-3.5 text-sky-brand" />
            </>
          )}
          העתק ופתח{" "}
          {platform === "facebook" ? "פייסבוק" : "אינסטגרם"}
        </button>
      </div>
    </div>
  );
}

function GooglePanel({
  connected,
  hydrated,
  busy,
  onConnect,
}: {
  connected: boolean;
  hydrated: boolean;
  busy: boolean;
  onConnect: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      {!hydrated ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-sky-brand" />
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={onConnect}
          className={[
            "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition disabled:opacity-50",
            connected
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-slate-200 bg-white text-slate-800 shadow-sm hover:border-[#4285F4]/40",
          ].join(" ")}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : connected ? (
            <Check className="h-4 w-4" />
          ) : (
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-black text-[#4285F4] ring-1 ring-slate-200"
              aria-hidden
            >
              G
            </span>
          )}
          {connected ? "מחובר · נתק" : "התחבר עם חשבון Google"}
        </button>
      )}
    </div>
  );
}

function EasyPanel({ onJump }: { onJump: () => void }) {
  return (
    <div className="rounded-2xl border border-[#1296D4]/30 bg-[#E8F6FC] p-4">
      <button
        type="button"
        onClick={onJump}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1296D4] px-4 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#007EBA] transition hover:brightness-105 active:translate-y-[2px] active:shadow-[0_2px_0_0_#007EBA]"
      >
        <Image
          src="/platforms/easy.png"
          alt=""
          width={22}
          height={22}
          className="h-[22px] w-[22px] rounded-md object-cover"
          unoptimized
        />
        מעבר לניהול העסק באיזי
        <ExternalLink className="h-3.5 w-3.5 opacity-90" />
      </button>
    </div>
  );
}

function ThreeStepPanel({
  steps,
  stepDone,
  busy,
  deepLabel,
  onStep1,
  onStep2,
  onStep3,
}: {
  steps: typeof STEPS;
  stepDone: 1 | 2 | 3 | null;
  busy: boolean;
  deepLabel: string;
  onStep1: () => void;
  onStep2: () => void;
  onStep3: () => void;
}) {
  return (
    <ol className="space-y-2">
      {steps.map((s) => {
        const done = stepDone !== null && stepDone >= s.n;
        const current =
          stepDone === null
            ? s.n === 1
            : stepDone + 1 === s.n || (stepDone === 3 && s.n === 3);
        return (
          <li
            key={s.n}
            className={[
              "flex gap-3 rounded-2xl border px-3 py-2.5 transition",
              current
                ? "border-sky-brand/30 bg-sky-light/40"
                : "border-slate-100 bg-slate-50/60",
            ].join(" ")}
          >
            <span
              className={[
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                done
                  ? "bg-emerald-500 text-white"
                  : current
                    ? "bg-sky-brand text-white"
                    : "bg-white text-slate-400 ring-1 ring-slate-200",
              ].join(" ")}
            >
              {done ? <Check className="h-4 w-4" /> : s.n}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">{s.title}</p>
              <p className="mt-0.5 text-[12px] text-slate-500">{s.body}</p>
              {s.n === 1 ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={onStep1}
                  className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-b from-sky-brand to-sky-hover px-3.5 py-2 text-[13px] font-bold text-white disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <Download className="h-3.5 w-3.5" />
                    </>
                  )}
                  העתק והורד
                </button>
              ) : null}
              {s.n === 2 ? (
                <button
                  type="button"
                  onClick={onStep2}
                  className="mt-2 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-bold text-slate-800"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-sky-brand" />
                  {deepLabel}
                </button>
              ) : null}
              {s.n === 3 ? (
                <button
                  type="button"
                  onClick={onStep3}
                  className="mt-2 inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-[13px] font-bold text-emerald-800"
                >
                  <Check className="h-3.5 w-3.5" />
                  סיימתי
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function PlatformMark({
  platform,
  large,
}: {
  platform: DockPlatform;
  large?: boolean;
}) {
  const size = large ? "h-6 w-6" : "h-4 w-4";
  switch (platform) {
    case "whatsapp":
      return (
        <svg viewBox="0 0 24 24" className={`${size} shrink-0`} aria-hidden>
          <path
            fill="#25D366"
            d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
          />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" className={`${size} shrink-0`} aria-hidden>
          <defs>
            <radialGradient
              id={`ig-connect-${large ? "lg" : "sm"}`}
              cx="30%"
              cy="107%"
              r="150%"
            >
              <stop offset="0%" stopColor="#fdf497" />
              <stop offset="45%" stopColor="#fd5949" />
              <stop offset="60%" stopColor="#d6249f" />
              <stop offset="90%" stopColor="#285AEB" />
            </radialGradient>
          </defs>
          <path
            fill={`url(#ig-connect-${large ? "lg" : "sm"})`}
            d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
          />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" className={`${size} shrink-0`} aria-hidden>
          <path
            fill="#1877F2"
            d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
          />
        </svg>
      );
    case "google":
      return (
        <svg viewBox="0 0 24 24" className={`${size} shrink-0`} aria-hidden>
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
        <Image
          src="/platforms/easy.png"
          alt=""
          width={large ? 28 : 20}
          height={large ? 28 : 20}
          className={`${large ? "h-7 w-7" : "h-5 w-5"} shrink-0 rounded-lg object-cover`}
          aria-hidden
          unoptimized
        />
      );
    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" className={`${size} shrink-0`} aria-hidden>
          <path
            fill="#0A66C2"
            d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
          />
        </svg>
      );
  }
}
