"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Icon } from "./icons";
import { fmtEur } from "@/lib/format";
import type { OfferCalc, ProductHit } from "@/server/domain/types";
import { calculateProjectOfferAction, searchProductsAction } from "@/app/(app)/customers/[id]/projects/actions";

/** `price` is what the input shows; `manual` = typed by the salesperson (sent as PRICE), else SoftOne prices it. */
type Line = { key: number; product: ProductHit | null; qty: string; price: string; manual: boolean; discount: string };

const num = (v: string) => {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const blank = (key: number): Line => ({ key, product: null, qty: "1", price: "", manual: false, discount: "" });

/**
 * Lines of a new offer → hidden input `lines` = [{ mtrl, qty, price | null, discountPct }] (SALDOC ITELINES).
 * Every change asks SoftOne `calculate` (same payload as the save, nothing stored): a line without a typed price
 * gets SoftOne's price (its pricing rules for this customer), and value / VAT / totals shown are SoftOne's.
 * On save a SoftOne-priced line is sent without PRICE, so the saved document matches the preview.
 */
export function OfferLinesEditor({ doctorId, projectId }: { doctorId: string; projectId: string }) {
  const next = useRef(1);
  const [lines, setLines] = useState<Line[]>([blank(0)]);
  const [calc, setCalc] = useState<OfferCalc | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calculating, startCalc] = useTransition();
  const seq = useRef(0);
  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const priced = lines.filter((l) => l.product);
  const payload = useMemo(
    () =>
      lines
        .filter((l) => l.product)
        .map((l) => ({ mtrl: l.product!.mtrl, qty: num(l.qty), price: l.manual ? num(l.price) : null, discountPct: num(l.discount) })),
    [lines],
  );
  const signature = JSON.stringify(payload);

  // ask SoftOne after a short pause; only the latest answer counts
  useEffect(() => {
    if (payload.length === 0) {
      setCalc(null);
      setCalcError(null);
      return;
    }
    const mine = ++seq.current;
    const t = setTimeout(() => {
      startCalc(async () => {
        const r = await calculateProjectOfferAction({ doctorId, projectId, lines: payload });
        if (mine !== seq.current) return;
        if ("error" in r) {
          setCalcError(r.error);
          return;
        }
        setCalcError(null);
        setCalc(r);
        // SoftOne-priced lines show SoftOne's price
        setLines((ls) => {
          let i = 0;
          return ls.map((l) => {
            if (!l.product) return l;
            const c = r.lines[i++];
            return c && !l.manual ? { ...l, price: String(c.price) } : l;
          });
        });
      });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, doctorId, projectId]);

  const calcFor = (l: Line) => {
    if (!l.product || !calc) return null;
    return calc.lines[priced.findIndex((x) => x.key === l.key)] ?? null;
  };

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="lines" value={signature} />
      {lines.map((l, i) => {
        const c = calcFor(l);
        return (
          <div key={l.key} className="card p-3 grid gap-3 grid-cols-2 sm:grid-cols-[100px_170px_110px_minmax(0,1fr)_auto] sm:items-end">
            <div className="col-span-full">
              <span className="label">Είδος {i + 1}</span>
              <ProductSearch value={l.product} onPick={(p) => update(l.key, { product: p, price: "", manual: false })} />
            </div>
            <label className="block">
              <span className="label">Ποσότητα</span>
              <input className="input tabular-nums" inputMode="decimal" value={l.qty} onChange={(e) => update(l.key, { qty: e.target.value })} />
            </label>
            <div>
              <span className="label">{l.manual ? "Τιμή (δική σας)" : "Τιμή SoftOne"}</span>
              <div className="relative">
                <input
                  className={`input tabular-nums ${l.manual ? "pr-10" : ""}`}
                  inputMode="decimal"
                  value={l.price}
                  placeholder={l.product ? "…" : ""}
                  disabled={!l.product}
                  onChange={(e) => update(l.key, { price: e.target.value, manual: true })}
                />
                {l.manual && (
                  <button
                    type="button"
                    title="Επαναφορά τιμής SoftOne"
                    aria-label="Επαναφορά τιμής SoftOne"
                    onClick={() => update(l.key, { manual: false, price: "" })}
                    className="absolute inset-y-0 right-1 grid w-9 place-items-center rounded-lg text-brand-700 hover:bg-brand-50"
                  >
                    ↺
                  </button>
                )}
              </div>
            </div>
            <label className="block">
              <span className="label">Έκπτωση %</span>
              <input className="input tabular-nums" inputMode="decimal" value={l.discount} onChange={(e) => update(l.key, { discount: e.target.value })} />
            </label>
            <div>
              <span className="label">Αξία</span>
              <div className="min-h-11 flex flex-col justify-center tabular-nums">
                <span className="font-semibold">{c ? fmtEur(c.lineValue, true) : l.product ? "…" : "—"}</span>
                {c && <span className="text-xs text-[var(--muted)]">ΦΠΑ {c.vatPct}%: {fmtEur(c.vat, true)}</span>}
              </div>
            </div>
            <button
              type="button"
              aria-label={`Αφαίρεση είδους ${i + 1}`}
              disabled={lines.length === 1}
              onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
              className="btn-ghost min-h-11 disabled:opacity-30"
            >
              <Icon.x size={18} />
            </button>
          </div>
        );
      })}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <button type="button" className="btn-secondary" onClick={() => setLines((ls) => [...ls, blank(next.current++)])}>
          <Icon.plus size={16} /> Προσθήκη είδους
        </button>
        <dl className="text-right tabular-nums grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 items-baseline">
          <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Καθαρή αξία</dt>
          <dd>{calc ? fmtEur(calc.net, true) : "—"}</dd>
          <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">ΦΠΑ</dt>
          <dd>{calc ? fmtEur(calc.vat, true) : "—"}</dd>
          <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Σύνολο</dt>
          <dd className="text-xl font-bold">{calc ? fmtEur(calc.total, true) : "—"}</dd>
          <dd className="col-span-2 text-xs text-[var(--muted)] min-h-4" aria-live="polite">
            {calculating ? "Υπολογισμός στο SoftOne…" : calc ? "Τιμές και σύνολα από το SoftOne" : ""}
          </dd>
        </dl>
      </div>
      {calcError && (
        <div role="status" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Το SoftOne δεν υπολόγισε την προσφορά: {calcError}
        </div>
      )}
    </div>
  );
}

/** Type ≥ 2 characters → api.crm.products/list {q}; shows how many matched when there are more than listed. */
function ProductSearch({ value, onPick }: { value: ProductHit | null; onPick: (p: ProductHit | null) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [res, setRes] = useState<{ total: number; items: ProductHit[] } | { error: string } | null>(null);
  const [pending, start] = useTransition();
  const root = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (q.trim().length < 2) {
      setRes(null);
      return;
    }
    const mine = ++seq.current;
    const t = setTimeout(() => {
      start(async () => {
        const r = await searchProductsAction(q);
        if (mine === seq.current) setRes(r);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  if (value)
    return (
      <div className="input flex items-center gap-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{value.name}</span>
          <span className="block text-xs text-[var(--muted)]">{value.code}</span>
        </span>
        <button type="button" aria-label="Αλλαγή είδους" className="btn-ghost min-h-8 px-2" onClick={() => onPick(null)}>
          <Icon.x size={16} />
        </button>
      </div>
    );

  return (
    <div ref={root} className="relative">
      <div className="relative">
        <Icon.search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          className="input pl-9"
          value={q}
          placeholder="Κωδικός ή περιγραφή…"
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault(); // never submit the offer from the search box
          }}
          aria-busy={pending || undefined}
        />
      </div>
      {open && q.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full max-h-80 overflow-y-auto rounded-2xl border border-[var(--line)] bg-white/95 backdrop-blur-xl shadow-[0_18px_40px_-16px_rgba(16,36,70,0.45)] py-1">
          {pending && !res && <div className="px-3 py-3 text-sm text-[var(--muted)]">Αναζήτηση…</div>}
          {res && "error" in res && <div className="px-3 py-3 text-sm text-red-700">{res.error}</div>}
          {res && "items" in res && res.items.length === 0 && <div className="px-3 py-3 text-sm text-[var(--muted)]">Δεν βρέθηκε είδος.</div>}
          {res &&
            "items" in res &&
            res.items.map((p) => (
              <button
                key={p.mtrl}
                type="button"
                onClick={() => {
                  onPick(p);
                  setOpen(false);
                  setQ("");
                }}
                className="w-full text-left px-3 py-2 min-h-11 hover:bg-brand-50"
              >
                <span className="block truncate">{p.name}</span>
                <span className="block text-xs text-[var(--muted)]">{p.code}</span>
              </button>
            ))}
          {res && "items" in res && res.total > res.items.length && (
            <div className="px-3 py-2 text-xs text-[var(--muted)] border-t border-[var(--line)]">
              Βρέθηκαν {res.total} – εμφανίζονται {res.items.length}. Γράψτε περισσότερα για να περιορίσετε.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
