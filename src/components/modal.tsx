"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";

/**
 * The app's modal (native <dialog>: top layer, inert page behind, focus trap, Esc). Used by every picker (Select,
 * product search) and the confirm dialog look. Sits in the upper part of the screen so the iPad keyboard never covers
 * a search's results; the body scrolls, the header stays.
 * Rendered in <body> (portal): inside a <label> (every Field) a tap on an option would bubble to the label, which
 * "clicks" its control – the trigger – and the modal would reopen right after closing.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = "32rem",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open, mounted]);

  if (!mounted) return null;
  return createPortal(
    <dialog
      ref={ref}
      // backdrop tap (the dialog element itself, outside the panel) closes
      onClick={(e) => e.target === ref.current && onClose()}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-label={title}
      style={{ width: `min(94vw, ${width})` }}
      className="filter-dialog mx-auto mt-[7dvh] mb-auto max-h-[80dvh] rounded-3xl p-0 bg-transparent backdrop:bg-slate-900/30 backdrop:backdrop-blur-sm"
    >
      {open && (
        <div className="flex max-h-[80dvh] flex-col rounded-3xl bg-white border border-white/80 shadow-[0_30px_60px_-20px_rgba(16,36,70,0.45)]">
          <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
            <h2 className="text-lg font-bold text-brand-800 truncate">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Κλείσιμο"
              className="grid size-10 shrink-0 place-items-center rounded-xl text-[var(--muted)] hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
            >
              <Icon.x size={20} />
            </button>
          </div>
          {children}
          {footer && <div className="border-t border-[var(--line)] px-5 py-2 text-xs text-[var(--muted)]">{footer}</div>}
        </div>
      )}
    </dialog>,
    document.body,
  );
}
