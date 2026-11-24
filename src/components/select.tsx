"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./icons";
import { Modal } from "./modal";
import { el } from "@/lib/i18n/el";
import { InputClearButton } from "./input-clear";

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
  /** modal title; default: the surrounding Field's label, else ariaLabel / placeholder */
  title?: string;
  /**
   * «+ Νέα …» at the end of the list: creates an entry named after the search text. `onCreate` saves it AND selects it
   * (the parent's option list only learns about it there); it answers { error } to keep the modal open with the message.
   */
  create?: { label: string; onCreate: (name: string) => Promise<{ error: string } | void> };
}

/**
 * Replaces the native <select>: the field shows the current choice; tapping it opens a modal (title, optional search,
 * 48px rows, ✓ on the current one, keyboard ↑ ↓ Enter, Esc / backdrop closes). Same props as before, so every
 * screen got the modal at once. The user menu in the top bar is a menu, not a Select, and stays a dropdown.
 */
export function Select({ options, name, defaultValue, value, onChange, placeholder, searchable, className, ariaLabel, disabled, title, create }: Props) {
  const controlled = value !== undefined;
  const [inner, setInner] = useState<string>(defaultValue === null || defaultValue === undefined ? "" : String(defaultValue));
  const selected = controlled ? (value === null || value === undefined ? "" : String(value)) : inner;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [heading, setHeading] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const id = useId();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // creating needs a name, and the name is typed in the search box
  const withSearch = !!create || (searchable ?? options.length > 7);
  const current = options.find((o) => o.value === selected);
  const filtered = useMemo(() => {
    const q = fold(query.trim());
    return q ? options.filter((o) => fold(`${o.label} ${o.hint ?? ""}`).includes(q)) : options;
  }, [options, query]);

  const show = () => {
    if (disabled) return;
    // title: explicit, else the Field label around the control (without the required «*»)
    const fieldLabel = trigger.current?.closest("label")?.querySelector(".label")?.textContent?.replace(/\s*\*\s*$/, "").trim();
    setHeading(title ?? fieldLabel ?? ariaLabel ?? placeholder ?? el.app.select);
    setQuery("");
    setCreateError(null);
    setActive(Math.max(0, options.findIndex((o) => o.value === selected)));
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  const choose = (v: string) => {
    if (!controlled) setInner(v);
    onChange?.(v);
    close();
  };

  const typed = query.trim();
  // an entry of that name is already listed → pick it, don't create a twin
  const exists = !!typed && options.some((o) => fold(o.label) === fold(typed));
  const runCreate = async () => {
    if (!create || creating) return;
    if (!typed) {
      setCreateError(el.equipment.newTypeFirst);
      search.current?.focus();
      return;
    }
    setCreating(true);
    setCreateError(null);
    const res = await create.onCreate(typed);
    setCreating(false);
    if (res && "error" in res) return setCreateError(res.error);
    close();
  };

  // focus the search (or the list) once the modal is up
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => (withSearch ? search.current : list.current)?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open, withSearch]);

  // keep the active row visible (and the current choice in view on open)
  useLayoutEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = filtered[active];
      if (o) choose(o.value);
      else if (create && !exists) void runCreate(); // keyboard «Go» on a name that isn't listed
    }
  };

  return (
    <div className={`relative ${className ?? ""}`}>
      {name && <input type="hidden" name={name} value={selected} />}
      <button
        ref={trigger}
        type="button"
        onClick={show}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            show();
          }
        }}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`input flex items-center justify-between gap-2 text-left cursor-pointer ${open ? "border-brand-500 ring-2 ring-brand-200" : ""}`}
      >
        <span className={`truncate ${current ? "" : "text-[var(--muted)]"}`}>{current?.label ?? placeholder ?? el.app.none}</span>
        <Icon.chevronDown size={18} className="shrink-0 text-[var(--muted)]" />
      </button>

      <Modal
        open={open}
        onClose={close}
        title={heading}
        footer={withSearch && query.trim() ? `${filtered.length} από ${options.length}` : undefined}
      >
        {withSearch && (
          <div className="px-5 pb-3">
            <div className="relative">
              <Icon.search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                ref={search}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder={el.app.search + "…"}
                autoFocus
                className="input pl-10 pr-10"
                aria-controls={`${id}-list`}
              />
              {query && <InputClearButton onClick={() => { setQuery(""); setActive(0); search.current?.focus(); }} />}
            </div>
          </div>
        )}
        <div
          ref={list}
          id={`${id}-list`}
          role="listbox"
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-[var(--line)] py-1 outline-none"
        >
          {filtered.length === 0 && !create && <div className="px-5 py-4 text-sm text-[var(--muted)]">{el.app.notFound}</div>}
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
                className={`w-full flex items-center gap-3 min-h-12 px-5 py-2 text-left text-base ${i === active ? "bg-brand-50" : ""} ${
                  isSel ? "text-brand-700 font-semibold" : "text-[var(--text)]"
                }`}
              >
                <span className="flex-1 min-w-0">
                  <span className="block">{o.label}</span>
                  {o.hint && <span className="block text-xs text-[var(--muted)] font-normal">{o.hint}</span>}
                </span>
                {isSel && <Icon.check size={18} className="shrink-0 text-brand-600" />}
              </button>
            );
          })}
        </div>
        {create && !exists && (
          <div className="border-t border-[var(--line)] px-3 py-2">
            <button
              type="button"
              onClick={runCreate}
              disabled={creating}
              className="flex w-full items-center gap-3 min-h-12 rounded-xl px-2 text-left font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
                <Icon.plus size={16} />
              </span>
              <span className="min-w-0 flex-1 truncate">
                {creating ? el.equipment.newSaving : typed ? `${create.label} «${typed}»` : `${create.label}…`}
              </span>
            </button>
            {createError && (
              <p role="alert" className="px-2 pb-1 text-sm text-red-700">
                {createError}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
