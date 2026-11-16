"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";
import { el } from "@/lib/i18n/el";

export interface SelectOption {
  value: string;
  label: string;
  /** secondary line under the label (e.g. a code) */
  hint?: string;
}

/** search key: lower case, no accents/diaeresis, final ς = σ (so «ευαγγελισμος» finds «ΕΥΑΓΓΕΛΙΣΜΟΣ») */
const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ς/g, "σ");

interface Props {
  options: SelectOption[];
  /** form field name – a hidden input carries the value, so the control works in plain server-action forms */
  name?: string;
  /** uncontrolled initial value */
  defaultValue?: string | number | null;
  /** controlled value */
  value?: string | number | null;
  onChange?: (value: string) => void;
  placeholder?: string;
  /** show a filter box; default: automatic when more than 7 options */
  searchable?: boolean;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

/**
 * Rich dropdown that replaces the native <select>: glass panel, 44px rows, check mark on the
 * selected row, keyboard navigation, optional filter. Opens upwards when there is no room below.
 */
export function Select({
  options,
  name,
  defaultValue,
  value,
  onChange,
  placeholder,
  searchable,
  className,
  ariaLabel,
  disabled,
}: Props) {
  const controlled = value !== undefined;
  const [inner, setInner] = useState<string>(
    defaultValue === null || defaultValue === undefined
      ? ""
      : String(defaultValue),
  );
  const selected = controlled
    ? value === null || value === undefined
      ? ""
      : String(value)
    : inner;
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  // panel is portaled to <body> (position: fixed) so glass cards / overflow containers cannot clip or cover it
  const [rect, setRect] = useState<{
    left: number;
    top: number;
    bottom: number;
    width: number;
  } | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const id = useId();

  const withSearch = searchable ?? options.length > 7;
  const current = options.find((o) => o.value === selected);
  const filtered = useMemo(() => {
    const q = fold(query.trim());
    return q
      ? options.filter((o) => fold(`${o.label} ${o.hint ?? ""}`).includes(q))
      : options;
  }, [options, query]);

  const choose = (v: string) => {
    if (!controlled) setInner(v);
    onChange?.(v);
    setOpen(false);
    setQuery("");
  };

  const toggle = () => {
    if (disabled) return;
    if (!open && root.current) {
      const r = root.current.getBoundingClientRect();
      setRect({ left: r.left, top: r.top, bottom: r.bottom, width: r.width });
      setUp(window.innerHeight - r.bottom < 320 && r.top > 320);
      setActive(
        Math.max(
          0,
          options.findIndex((o) => o.value === selected),
        ),
      );
    }
    setOpen((o) => !o);
  };

  // close on outside tap / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!root.current?.contains(t) && !panel.current?.contains(t))
        setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (!panel.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onKey as unknown as EventListener);
    if (withSearch) search.current?.focus();
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onKey as unknown as EventListener);
    };
  }, [open, withSearch]);

  // keep the active row visible
  useLayoutEffect(() => {
    if (!open) return;
    list.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) toggle();
      else setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      if (open) {
        e.preventDefault();
        const o = filtered[active];
        if (o) choose(o.value);
      }
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div
      ref={root}
      className={`relative ${className ?? ""}`}
      onKeyDown={onKeyDown}
    >
      {name && <input type="hidden" name={name} value={selected} />}
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={ariaLabel}
        className={`input flex items-center justify-between gap-2 text-left cursor-pointer ${open ? "border-brand-500 ring-2 ring-brand-200" : ""}`}
      >
        <span className={`truncate ${current ? "" : "text-[var(--muted)]"}`}>
          {current?.label ?? placeholder ?? el.app.none}
        </span>
        <Icon.chevronDown
          size={18}
          className={`shrink-0 text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open &&
        rect &&
        createPortal(
          <div
            ref={panel}
            onKeyDown={onKeyDown}
            style={{
              position: "fixed",
              // never narrower than 260px (labels stay readable under narrow triggers), never past the viewport edge
              ...(() => {
                const w = Math.min(Math.max(rect.width, 260), window.innerWidth - 16);
                return { left: Math.max(8, Math.min(rect.left, window.innerWidth - w - 8)), width: w };
              })(),
              ...(up
                ? { bottom: window.innerHeight - rect.top + 6 }
                : { top: rect.bottom + 6 }),
              zIndex: 1000,
            }}
            className="rounded-2xl border border-[var(--line)] bg-white/95 backdrop-blur-xl overflow-hidden shadow-[0_18px_40px_-16px_rgba(16,36,70,0.45)]"
          >
            {withSearch && (
              <div className="p-2 border-b border-[var(--line)]">
                <div className="relative">
                  <Icon.search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                  />
                  <input
                    ref={search}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setActive(0);
                    }}
                    placeholder={el.app.search + "…"}
                    className="input min-h-10 pl-9"
                  />
                </div>
              </div>
            )}
            <div
              ref={list}
              id={`${id}-list`}
              role="listbox"
              className="max-h-72 overflow-y-auto overscroll-contain py-1"
            >
              {filtered.length === 0 && (
                <div className="px-3 py-3 text-sm text-[var(--muted)]">
                  {el.app.notFound}
                </div>
              )}
              {filtered.map((o, i) => {
                const isSel = o.value === selected;
                return (
                  <button
                    key={o.value || "__empty"}
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    data-index={i}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(o.value)}
                    className={`w-full flex items-center gap-3 min-h-11 px-3 py-2 text-left text-base ${i === active ? "bg-brand-50" : ""} ${isSel ? "text-brand-700 font-semibold" : "text-[var(--text)]"}`}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block truncate">{o.label}</span>
                      {o.hint && (
                        <span className="block text-xs text-[var(--muted)] truncate">
                          {o.hint}
                        </span>
                      )}
                    </span>
                    {isSel && (
                      <Icon.check
                        size={18}
                        className="shrink-0 text-brand-600"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          // inside a modal <dialog> everything outside it is inert → render the panel in the dialog
          root.current?.closest("dialog") ?? document.body,
        )}
    </div>
  );
}
