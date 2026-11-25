"use client";

import { useRef, useState, type ReactNode } from "react";
import { DateInput } from "./date-input";
import { Icon } from "./icons";
import { el } from "@/lib/i18n/el";

/**
 * «Φίλτρα» button that opens a modal holding a GET form (native <dialog>: Esc, focus trap, backdrop).
 * `summary` is shown on the button so the active filter stays visible while the modal is closed.
 */
export function FilterDialog({ summary, title, children }: { summary: ReactNode; title?: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  // play the exit animation, then really close (native close() would remove it instantly)
  const close = () => {
    const d = ref.current;
    if (!d?.open || d.dataset.closing) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return d.close();
    d.dataset.closing = "1";
    window.setTimeout(() => {
      delete d.dataset.closing;
      d.close();
    }, 200);
  };

  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className="btn-secondary max-w-full" aria-haspopup="dialog">
        <Icon.filter size={18} className="shrink-0" />
        <span className="font-semibold">{el.filters.title}</span>
        <span className="hidden sm:inline h-5 w-px bg-[var(--line)]" aria-hidden />
        <span className="hidden sm:inline truncate text-sm font-medium text-[var(--muted)] tabular-nums">{summary}</span>
      </button>

      <dialog
        ref={ref}
        // click on the backdrop (the dialog element itself, outside the panel) closes
        onClick={(e) => e.target === ref.current && close()}
        // Esc → same animated close instead of the instant native one
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        className="filter-dialog m-auto w-[min(92vw,32rem)] max-h-[85dvh] rounded-3xl p-0 bg-transparent backdrop:bg-slate-900/30 backdrop:backdrop-blur-sm"
      >
        <form method="get" className="rounded-3xl p-5 md:p-6 flex flex-col gap-5 bg-white border border-white/80 shadow-[0_30px_60px_-20px_rgba(16,36,70,0.45)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-brand-800">{title ?? el.filters.title}</h2>
            <button type="button" autoFocus onClick={close} className="grid place-items-center size-10 rounded-xl text-[var(--muted)] hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200" aria-label={el.filters.close}>
              <Icon.x size={20} />
            </button>
          </div>
          {children}
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={close} className="btn-secondary">
              {el.filters.cancel}
            </button>
            <button className="btn-primary min-w-32">{el.filters.apply}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function presets(): Array<{ label: string; from: string; to: string }> {
  const t = new Date();
  const add = (n: number) => {
    const d = new Date(t);
    d.setDate(d.getDate() + n);
    return d;
  };
  const monday = add(-((t.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return [
    { label: el.filters.today, from: iso(t), to: iso(t) },
    { label: el.filters.next7, from: iso(t), to: iso(add(7)) },
    { label: el.filters.thisWeek, from: iso(monday), to: iso(sunday) },
    { label: el.filters.thisMonth, from: iso(new Date(t.getFullYear(), t.getMonth(), 1)), to: iso(new Date(t.getFullYear(), t.getMonth() + 1, 0)) },
  ];
}

/** Από / Έως with quick presets. Field names default to from / to. */
export function DateRangeFields({ from, to, fromName = "from", toName = "to" }: { from: string; to: string; fromName?: string; toName?: string }) {
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  return (
    <div className="flex flex-col gap-3">
      <span className="label !mb-0">{el.filters.period}</span>
      <div className="flex flex-wrap gap-2">
        {presets().map((p) => {
          const on = p.from === f && p.to === t;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setF(p.from);
                setT(p.to);
              }}
              className={`min-h-9 px-3.5 rounded-full text-sm font-medium border transition-colors ${on ? "bg-brand-600 border-brand-600 text-white" : "bg-white/80 border-[var(--line)] text-[var(--text)] hover:bg-brand-50"}`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block min-w-0">
          <span className="label">{el.daily.from}</span>
          <DateInput name={fromName} value={f} max={t || undefined} onChange={setF} required ariaLabel={el.daily.from} />
        </label>
        <label className="block min-w-0">
          <span className="label">{el.daily.to}</span>
          <DateInput name={toName} value={t} min={f || undefined} onChange={setT} required ariaLabel={el.daily.to} />
        </label>
      </div>
    </div>
  );
}
