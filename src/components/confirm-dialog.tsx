"use client";

import { useEffect, useRef } from "react";

/**
 * Modal yes/no (native <dialog>: Esc, focus trap, backdrop), styled and animated like the filter dialog.
 * Controlled: `open` shows it; Esc / backdrop / the cancel button call `onCancel`.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClick={(e) => e.target === ref.current && onCancel()}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      aria-labelledby="confirm-title"
      className="filter-dialog m-auto w-[min(92vw,28rem)] rounded-3xl p-0 bg-transparent backdrop:bg-slate-900/30 backdrop:backdrop-blur-sm"
    >
      <div className="rounded-3xl p-5 md:p-6 flex flex-col gap-4 bg-white border border-white/80 shadow-[0_30px_60px_-20px_rgba(16,36,70,0.45)]">
        <h2 id="confirm-title" className="text-lg font-bold text-brand-800">
          {title}
        </h2>
        <p className="text-[var(--text)]">{message}</p>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
          <button type="button" autoFocus onClick={onCancel} className="btn-secondary">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={danger ? "btn min-h-11 px-4 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700" : "btn-primary"}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
