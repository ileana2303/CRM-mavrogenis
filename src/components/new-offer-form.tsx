"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionForm, type ActionResult } from "./action-form";
import { OfferLinesEditor, type OfferLinesStatus } from "./offer-lines-editor";
import { ConfirmDialog } from "./confirm-dialog";
import { Icon } from "./icons";
import { fmtEur } from "@/lib/format";
import { el } from "@/lib/i18n/el";

/**
 * «Νέα προσφορά»: header (Άκυρο / Αποθήκευση top right), line cards, comments, and a bottom bar with SoftOne's totals
 * (always in sight, whatever the number of lines). «Αποθήκευση» waits for SoftOne: disabled while a calculate is
 * pending, so what is saved is what the screen shows. Leaving with something entered asks first – «Άκυρο», «Πίσω»,
 * any in-app link (sidebar…), and the browser's own reload / close / back (beforeunload).
 */
export function NewOfferForm({
  action,
  doctorId,
  projectId,
  backHref,
  doctorName,
  projectTitle,
  projectCode,
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  doctorId: string;
  projectId: string;
  backHref: string;
  doctorName: string;
  projectTitle: string;
  projectCode: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<OfferLinesStatus>({ busy: false, dirty: false, count: 0, calc: null, calcError: null });
  const [comments, setComments] = useState("");
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const saving = useRef(false);
  const dirty = status.dirty || comments.trim() !== "";
  const { busy, calc, calcError, count } = status;
  const discount = calc ? calc.lines.reduce((s, l) => s + l.discountValue, 0) : 0;

  const onStatus = useCallback((s: OfferLinesStatus) => setStatus(s), []);
  const leave = (href: string) => (dirty ? setLeaveTo(href) : router.push(href));

  // browser reload / close / history back
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saving.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // any in-app link (sidebar, header…) goes through the same question
  useEffect(() => {
    if (!dirty) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      e.preventDefault();
      e.stopPropagation();
      setLeaveTo(url.pathname + url.search + url.hash);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty]);

  return (
    <>
      <ActionForm
        action={async (fd) => {
          saving.current = true;
          const res = await action(fd);
          saving.current = false; // only reached when the save was refused (success redirects)
          return res;
        }}
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="doctorId" value={doctorId} />
        <input type="hidden" name="projectId" value={projectId} />

        {/* header */}
        <button type="button" onClick={() => leave(backHref)} className="btn-ghost -ml-3 self-start text-brand-700">
          {el.app.back}
        </button>
        <header className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-brand-800">{el.projects.newOffer}</h1>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" onClick={() => leave(backHref)} className="btn-ghost">
                {el.app.cancel}
              </button>
              <button className="btn-primary min-w-40" disabled={busy || count === 0} title={busy ? el.projects.waitCalc : undefined}>
                {busy ? el.projects.calculating : el.app.save}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-white/70 px-3 py-1">
              <Icon.stethoscope size={14} className="text-brand-600" />
              <span className="text-[var(--muted)]">{el.customer.doctorPrefix}</span>
              <span className="font-semibold">{doctorName}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-white/70 px-3 py-1">
              <Icon.briefcase size={14} className="text-brand-600" />
              <span className="font-mono text-[var(--muted)]">{projectCode}</span>
              <span className="font-semibold">{projectTitle}</span>
            </span>
          </div>
        </header>

        <OfferLinesEditor doctorId={doctorId} projectId={projectId} onStatus={onStatus} />

        <section className="card p-3 sm:p-4">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">{el.projects.offerComments}</span>
            <textarea
              name="comments"
              className="input"
              rows={3}
              value={comments}
              placeholder="Π.χ. χρόνος παράδοσης, όροι πληρωμής, ειδικές συμφωνίες…"
              onChange={(e) => setComments(e.target.value)}
            />
          </label>
        </section>

        {/* totals: sticky at the bottom (above the phone tab bar), labels above figures so big amounts never push out */}
        <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 mt-2">
          <div className="card !bg-white/90 shadow-[0_-8px_30px_-12px_rgba(16,36,70,0.35)] px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="min-w-0 flex-1 basis-40">
              <p className="font-semibold">
                {count === 0 ? "Κανένα είδος" : count === 1 ? "1 είδος" : `${count} είδη`}
                {calc && discount > 0 && <span className="font-normal text-[var(--muted)]"> · έκπτωση {fmtEur(discount, true)}</span>}
              </p>
              <p className="text-xs" aria-live="polite">
                {busy ? (
                  <span className="inline-flex items-center gap-1.5 text-brand-700">
                    <span className="size-3 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" aria-hidden />
                    Υπολογισμός στο SoftOne…
                  </span>
                ) : calcError ? (
                  <span className="text-red-700">SoftOne: {calcError}</span>
                ) : calc ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <Icon.check size={12} /> Τιμές και σύνολα από το SoftOne
                  </span>
                ) : (
                  <span className="text-[var(--muted)]">Προσθέστε είδη για υπολογισμό</span>
                )}
              </p>
            </div>

            <dl className={`ml-auto flex items-end gap-6 tabular-nums transition-opacity ${busy ? "opacity-50" : ""}`}>
              <Total label="Καθαρή αξία" value={calc ? fmtEur(calc.net, true) : "—"} />
              <Total label="ΦΠΑ" value={calc ? fmtEur(calc.vat, true) : "—"} />
              <Total label="Σύνολο" value={calc ? fmtEur(calc.total, true) : "—"} strong />
            </dl>
          </div>
        </div>
      </ActionForm>

      <ConfirmDialog
        open={leaveTo !== null}
        title={el.projects.leaveTitle}
        message={el.projects.leaveMessage}
        confirmLabel={el.projects.leaveConfirm}
        cancelLabel={el.projects.leaveStay}
        danger
        onCancel={() => setLeaveTo(null)}
        onConfirm={() => {
          const to = leaveTo;
          setLeaveTo(null);
          setStatus((s) => ({ ...s, dirty: false }));
          setComments("");
          if (to) router.push(to);
        }}
      />
    </>
  );
}

function Total({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex flex-col items-end">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</dt>
      <dd className={`whitespace-nowrap ${strong ? "text-xl font-bold text-brand-800" : "font-semibold"}`}>{value}</dd>
    </div>
  );
}
