"use client";

import { CheckCircle2, X } from "lucide-react";
import { useToastStore } from "@/store/useToastStore";

export default function ToastHost() {
  const message = useToastStore((s) => s.message);
  const clearToast = useToastStore((s) => s.clearToast);

  if (!message) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-lg shadow-emerald-900/10">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
        <p className="flex-1 text-[13px] font-medium leading-relaxed">
          {message}
        </p>
        <button
          type="button"
          onClick={clearToast}
          className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="סגור"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
