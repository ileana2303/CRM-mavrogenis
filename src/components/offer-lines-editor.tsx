"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Icon } from "./icons";
import { Modal } from "./modal";
import { fmtEur } from "@/lib/format";
import { cleanNumberInput, formatGr, parseGr } from "@/lib/gr-number";
import type { OfferCalc, ProductHit } from "@/server/domain/types";
import { calculateProjectOfferAction, searchProductsAction } from "@/app/(app)/customers/[id]/projects/actions";

/**
 * `price`: `manual` = typed (sent as PRICE), else SoftOne's. `by`: what drives the line – discount % (DISC1PRC),
 * discount € (DISC1VAL) or value (LINEVAL); SoftOne works out the other two and they show its answer.
 */
type Line = {
  key: number;
  product: ProductHit | null;
  qty: string;
  price: string;
  manual: boolean;
  discount: string;
  discountValue: string;
  value: string;
  by: "discount" | "discountValue" | "value";
  /** added with «+ Προσθήκη είδους» → the product modal opens at once */
  auto?: boolean;
};

/** What the form around the lines needs: the save gate, the leave question and the totals bar. */
export type OfferLinesStatus = {
  /** SoftOne has not answered for the current lines yet (save waits) */
  busy: boolean;
  /** at least one product chosen */
  dirty: boolean;
  /** lines with a product */
  count: number;
  calc: OfferCalc | null;
  calcError: string | null;
};

/** Greek-typed field → number ("4.714,29" → 4714.29); empty / unreadable = 0 */
const num = (v: string) => parseGr(v) ?? 0;
/** decimals each field shows (Greek format: "4.714,286", "4,2424", "4.514,29") */
const DECIMALS = { qty: 3, price: 6, discount: 4, discountValue: 2, value: 2 } as const;
type NumField = keyof typeof DECIMALS;
const blank = (key: number): Line => ({ key, product: null, qty: "1", price: "", manual: false, discount: "", discountValue: "", value: "", by: "discount" });

/**
 * Lines of a new offer → hidden input `lines` = [{ mtrl, qty, price | null, discountPct | discountValue | lineValue }]
 * (SALDOC ITELINES). Numbers are typed and shown the Greek way ("4.714,29", see lib/gr-number).
 * Every change asks SoftOne `calculate` (same payload as the save, nothing stored): a line without a typed price
 * gets SoftOne's price (its pricing rules for this customer), and value / VAT / totals shown are SoftOne's.
 * On save a SoftOne-priced line is sent without PRICE, so the saved document matches the preview.
 * The totals live in the form's bottom bar (`onStatus`), not here.
 */
export function OfferLinesEditor({
  doctorId,
  projectId,
  onStatus,
}: {
  doctorId: string;
  projectId: string;
  onStatus?: (s: OfferLinesStatus) => void;
}) {
  const next = useRef(1);
  const [lines, setLines] = useState<Line[]>([blank(0)]);
  const [calc, setCalc] = useState<OfferCalc | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calculating, startCalc] = useTransition();
  const seq = useRef(0);
  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  /** on leaving a field: "4714,29" → "4.714,29" (same number, so no new calculate) */
  const tidy = (key: number, field: NumField) =>
    setLines((ls) =>
      ls.map((l) => {
        if (l.key !== key) return l;
        const n = parseGr(l[field]);
        return n === null ? l : { ...l, [field]: formatGr(n, DECIMALS[field]) };
      }),
    );

  const priced = lines.filter((l) => l.product);
  const payload = useMemo(
    () =>
      lines
        .filter((l) => l.product)
        .map((l) => ({
          mtrl: l.product!.mtrl,
          qty: num(l.qty),
          price: l.manual ? num(l.price) : null,
          discountPct: l.by === "discount" ? num(l.discount) : null,
          discountValue: l.by === "discountValue" && l.discountValue.trim() !== "" ? num(l.discountValue) : null,
          lineValue: l.by === "value" && l.value.trim() !== "" ? num(l.value) : null,
        })),
    [lines],
  );
  const signature = JSON.stringify(payload);
  /** the payload SoftOne last answered for (success or error) – differs from `signature` while a calculate is due */
  const [answered, setAnswered] = useState<string>(JSON.stringify([]));
  const busy = payload.length > 0 && (calculating || answered !== signature);
  useEffect(() => {
    onStatus?.({ busy, dirty: payload.length > 0, count: payload.length, calc: payload.length ? calc : null, calcError });
  }, [busy, payload.length, calc, calcError, onStatus]);

  // ask SoftOne after a short pause; only the latest answer counts
  useEffect(() => {
    if (payload.length === 0) {
      setCalc(null);
      setCalcError(null);
      setAnswered(signature);
      return;
    }
    const mine = ++seq.current;
    const t = setTimeout(() => {
      startCalc(async () => {
        const r = await calculateProjectOfferAction({ doctorId, projectId, lines: payload });
        if (mine !== seq.current) return;
        setAnswered(signature);
        if ("error" in r) {
          setCalcError(r.error);
          return;
        }
        setCalcError(null);
        setCalc(r);
        // show SoftOne's answer in the fields the salesperson did not type: price, and two of %, € and value
        setLines((ls) => {
          let i = 0;
          return ls.map((l) => {
            if (!l.product) return l;
            const c = r.lines[i++];
            if (!c) return l;
            return {
              ...l,
              ...(l.manual ? {} : { price: formatGr(c.price, DECIMALS.price) }),
              ...(l.by === "discount" ? {} : { discount: c.discountPct ? formatGr(c.discountPct, DECIMALS.discount) : "" }),
              ...(l.by === "discountValue" ? {} : { discountValue: c.discountValue ? formatGr(c.discountValue, DECIMALS.discountValue) : "" }),
              ...(l.by === "value" ? {} : { value: formatGr(c.lineValue, DECIMALS.value) }),
            };
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
  /** SoftOne-filled field: dashed, muted (the typed one keeps the solid border) */
  const derived = (yes: boolean) => (yes ? "border-dashed text-[var(--muted)] bg-white/50" : "");

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="lines" value={signature} />
      {/* cards are not overflow-hidden (that clipped the product results); the line being searched sits above the cards below */}
      {lines.map((l, i) => {
        const c = calcFor(l);
        const pending = l.product && (!c || answered !== signature);
        return (
          <section key={l.key} className={`card relative ${l.product ? "" : "z-40"}`} aria-label={`Είδος ${i + 1}`}>
            {/* header: number, product, line value, remove */}
            <div className="flex items-start gap-3 p-3 sm:p-4">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                {l.product ? (
                  <>
                    <p className="font-semibold leading-snug line-clamp-2">{l.product.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted)]">
                      <span className="font-mono">{l.product.code}</span>
                      {c && <span className="badge bg-slate-100 text-slate-700">ΦΠΑ {c.vatPct}%</span>}
                      {l.manual ? (
                        <span className="badge bg-amber-100 text-amber-800">Δική σας τιμή</span>
                      ) : (
                        <span className="badge bg-brand-50 text-brand-700">Τιμή SoftOne</span>
                      )}
                      <button
                        type="button"
                        onClick={() => update(l.key, { product: null, price: "", manual: false, discount: "", discountValue: "", value: "", by: "discount", auto: true })}
                        className="text-brand-700 font-medium hover:underline"
                      >
                        Αλλαγή είδους
                      </button>
                    </p>
                  </>
                ) : (
                  <ProductSearch autoOpen={l.auto} onPick={(p) => update(l.key, { product: p, price: "", manual: false, discountValue: "", value: "", by: "discount" })} />
                )}
              </div>
              {l.product && (
                <div className="shrink-0 text-right">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">Αξία γραμμής</p>
                  <p className={`text-lg font-bold tabular-nums whitespace-nowrap transition-opacity ${pending ? "opacity-40" : ""}`}>
                    {c ? fmtEur(c.lineValue, true) : "…"}
                  </p>
                </div>
              )}
              <button
                type="button"
                aria-label={`Αφαίρεση είδους ${i + 1}`}
                disabled={lines.length === 1}
                onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                className="grid size-10 shrink-0 place-items-center rounded-xl text-[var(--muted)] hover:bg-red-50 hover:text-red-700 disabled:opacity-30"
              >
                <Icon.x size={18} />
              </button>
            </div>

            {/* figures */}
            {l.product && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[0.7fr_1fr_0.8fr_1fr_1.2fr_1.1fr] gap-3 border-t border-[var(--line)] bg-brand-50/30 rounded-b-2xl p-3 sm:p-4">
                <Num label="Ποσότητα">
                  <input
                    className="input tabular-nums"
                    inputMode="decimal"
                    value={l.qty}
                    onChange={(e) => update(l.key, { qty: cleanNumberInput(e.target.value), by: "discount" })}
                    onBlur={() => tidy(l.key, "qty")}
                  />
                </Num>
                <Num label="Τιμή μονάδας">
                  <div className="relative">
                    <input
                      className={`input tabular-nums ${l.manual ? "pr-10" : ""}`}
                      inputMode="decimal"
                      value={l.price}
                      placeholder="…"
                      onChange={(e) => update(l.key, { price: cleanNumberInput(e.target.value), manual: true, by: "discount" })}
                      onBlur={() => tidy(l.key, "price")}
                    />
                    {l.manual && (
                      <button
                        type="button"
                        title="Επαναφορά τιμής SoftOne"
                        aria-label="Επαναφορά τιμής SoftOne"
                        onClick={() => update(l.key, { manual: false, price: "", by: "discount" })}
                        className="absolute inset-y-0 right-1 grid w-9 place-items-center rounded-lg text-brand-700 hover:bg-brand-50"
                      >
                        ↺
                      </button>
                    )}
                  </div>
                </Num>
                <Num label="Έκπτωση %">
                  <input
                    className={`input tabular-nums ${derived(l.by !== "discount")}`}
                    title={l.by !== "discount" ? "Υπολογίστηκε από το SoftOne" : undefined}
                    inputMode="decimal"
                    value={l.discount}
                    onChange={(e) => update(l.key, { discount: cleanNumberInput(e.target.value), by: "discount" })}
                    onBlur={() => tidy(l.key, "discount")}
                  />
                </Num>
                <Num label="Έκπτωση €">
                  <input
                    className={`input tabular-nums ${derived(l.by !== "discountValue")}`}
                    title={l.by !== "discountValue" ? "Υπολογίστηκε από το SoftOne" : undefined}
                    inputMode="decimal"
                    value={l.discountValue}
                    data-field="disc1val"
                    onChange={(e) => update(l.key, { discountValue: cleanNumberInput(e.target.value), by: "discountValue" })}
                    onBlur={() => tidy(l.key, "discountValue")}
                  />
                </Num>
                <Num label="Αξία">
                  <input
                    className={`input tabular-nums font-semibold ${derived(l.by !== "value")}`}
                    title={l.by !== "value" ? "Υπολογίστηκε από το SoftOne" : undefined}
                    inputMode="decimal"
                    value={l.value}
                    placeholder="…"
                    onChange={(e) => update(l.key, { value: cleanNumberInput(e.target.value), by: "value" })}
                    onBlur={() => tidy(l.key, "value")}
                  />
                </Num>
                <Num label={c ? `ΦΠΑ ${c.vatPct}%` : "ΦΠΑ"}>
                  <div
                    className="input tabular-nums border-dashed bg-white/50 text-[var(--muted)] flex items-center whitespace-nowrap overflow-hidden"
                    aria-readonly="true"
                    data-field="vatamnt"
                  >
                    {c ? fmtEur(c.vat, true) : "—"}
                  </div>
                </Num>
              </div>
            )}
          </section>
        );
      })}

      <button
        type="button"
        onClick={() => setLines((ls) => [...ls, { ...blank(next.current++), auto: true }])}
        className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 bg-white/40 font-semibold text-brand-700 transition-colors hover:border-brand-500 hover:bg-brand-50/60"
      >
        <Icon.plus size={18} /> Προσθήκη είδους
      </button>
    </div>
  );
}

function Num({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

/**
 * «Αναζήτηση είδους»: a field-like button that opens the product modal (search focused, results as 48px rows).
 * Type ≥ 2 characters → api.crm.products/list {q}; says how many matched when there are more than listed.
 * `autoOpen`: lines added with «+ Προσθήκη είδους» open the modal at once (choosing the product is the first step).
 */
function ProductSearch({ onPick, autoOpen }: { onPick: (p: ProductHit) => void; autoOpen?: boolean }) {
  const [open, setOpen] = useState(!!autoOpen);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ total: number; items: ProductHit[] } | { error: string } | null>(null);
  const [active, setActive] = useState(0);
  const [pending, start] = useTransition();
  const seq = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const items = res && "items" in res ? res.items : [];

  useEffect(() => {
    if (q.trim().length < 2) {
      setRes(null);
      return;
    }
    const mine = ++seq.current;
    const t = setTimeout(() => {
      start(async () => {
        const r = await searchProductsAction(q);
        if (mine === seq.current) {
          setRes(r);
          setActive(0);
        }
      });
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => input.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const pick = (p: ProductHit) => {
    onPick(p);
    setOpen(false);
    setQ("");
    setRes(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="input flex items-center gap-2 text-left text-[var(--muted)] cursor-pointer"
      >
        <Icon.search size={18} className="shrink-0" />
        <span className="truncate">Αναζήτηση είδους: κωδικός ή περιγραφή…</span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Επιλογή είδους"
        width="40rem"
        footer={
          res && "items" in res && res.total > res.items.length
            ? `Βρέθηκαν ${res.total} – εμφανίζονται ${res.items.length}. Γράψτε περισσότερα για να περιορίσετε.`
            : res && "items" in res && res.items.length
              ? `${res.total} ${res.total === 1 ? "είδος" : "είδη"}`
              : undefined
        }
      >
        <div className="px-5 pb-3">
          <div className="relative">
            <Icon.search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              ref={input}
              autoFocus
              className="input pl-10 pr-10"
              value={q}
              placeholder="Κωδικός ή περιγραφή (τουλάχιστον 2 χαρακτήρες)…"
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(items.length - 1, a + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(0, a - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault(); // never submit the offer from the search box
                  if (items[active]) pick(items[active]);
                }
              }}
              aria-busy={pending || undefined}
            />
            {pending && (
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center" aria-hidden>
                <span className="size-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
              </span>
            )}
          </div>
        </div>
        <div ref={list} role="listbox" className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-[var(--line)] py-1">
          {q.trim().length < 2 && <div className="px-5 py-4 text-sm text-[var(--muted)]">Γράψτε κωδικό ή μέρος της περιγραφής.</div>}
          {q.trim().length >= 2 && pending && !res && <div className="px-5 py-4 text-sm text-[var(--muted)]">Αναζήτηση…</div>}
          {res && "error" in res && <div className="px-5 py-4 text-sm text-red-700">{res.error}</div>}
          {res && "items" in res && res.items.length === 0 && <div className="px-5 py-4 text-sm text-[var(--muted)]">Δεν βρέθηκε είδος.</div>}
          {items.map((p, i) => (
            <button
              key={p.mtrl}
              type="button"
              role="option"
              aria-selected={i === active}
              data-index={i}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(p)}
              className={`w-full text-left px-5 py-2.5 min-h-12 ${i === active ? "bg-brand-50" : ""}`}
            >
              <span className="block leading-snug">{p.name}</span>
              <span className="block text-xs text-[var(--muted)] font-mono">{p.code}</span>
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}
