"use client";

import { el } from "@/lib/i18n/el";

/** ✕ on the trailing edge of a search field (sits left of a spinner when both show). */
export function InputClearButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={className ?? "absolute right-2 top-1/2 -translate-y-1/2 btn-ghost min-h-8 min-w-8 px-0 text-[var(--muted)]"}
      aria-label={el.app.cancel}
    >
      ✕
    </button>
  );
}