"use client";

import { useEffect, useRef, useState } from "react";

/** "2026-11-25" → "25/11/2026" */
const isoToGr = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");
/** "25/11/2026" → "2026-11-25", or "" when it isn't a real date (31/02 …) */
function grToIso(text: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!m) return "";
  const [, d, mo, y] = m;
  const dt = new Date(Date.UTC(+y, +mo - 1, +d));
  return dt.getUTCFullYear() === +y && dt.getUTCMonth() === +mo - 1 && dt.getUTCDate() === +d ? `${y}-${mo}-${d}` : "";
}
/** keeps digits and puts the slashes in while typing: "251120" → "25/11/20" */
function maskTyping(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join("/");
}

/**
 * Date field that always reads dd/mm/yyyy, whatever the device language (a native <input type="date"> follows the
 * browser locale: 11/25/2026 on an English desktop). Typed or picked from the native calendar (the 📅 area);
 * posts `name` as "yyyy-mm-dd", like the native control did, so the server side is unchanged.
 */
export function DateInput({
  name,
  value,
  defaultValue,
  onChange,
  required,
  min,
  max,
  className = "",
  ariaLabel,
}: {
  name?: string;
  /** controlled "yyyy-mm-dd" */
  value?: string;
  defaultValue?: string;
  onChange?: (iso: string) => void;
  required?: boolean;
  min?: string;
  max?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const [iso, setIso] = useState(value ?? defaultValue ?? "");
  const [text, setText] = useState(isoToGr(value ?? defaultValue ?? ""));
  const picker = useRef<HTMLInputElement>(null);

  // a controlled parent may change the date (e.g. the other end of a range)
  useEffect(() => {
    if (value !== undefined && value !== iso) {
      setIso(value);
      setText(isoToGr(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = (next: string) => {
    setIso(next);
    onChange?.(next);
  };

  return (
    <div className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={iso} />}
      <input
        className="input pr-11 tabular-nums"
        inputMode="numeric"
        autoComplete="off"
        placeholder="ηη/μμ/εεεε"
        aria-label={ariaLabel}
        required={required}
        pattern="\d{2}/\d{2}/\d{4}"
        title="ηη/μμ/εεεε"
        value={text}
        onChange={(e) => {
          const t = maskTyping(e.target.value);
          setText(t);
          const next = grToIso(t);
          if (next || t === "") commit(next);
        }}
        onBlur={() => {
          // a half-typed or impossible date doesn't stay looking valid
          if (text && !grToIso(text)) setText(isoToGr(iso));
        }}
      />
      {/* the native calendar, invisible, over the icon: tap/click opens the device's own picker */}
      <input
        ref={picker}
        type="date"
        tabIndex={-1}
        aria-hidden
        value={iso}
        min={min}
        max={max}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.();
          } catch {
            /* older Safari: the tap on the control opens it */
          }
        }}
        onChange={(e) => {
          setText(isoToGr(e.target.value));
          commit(e.target.value);
        }}
        className="absolute right-0 top-0 h-full w-11 cursor-pointer opacity-0"
      />
      <svg
        aria-hidden
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    </div>
  );
}
