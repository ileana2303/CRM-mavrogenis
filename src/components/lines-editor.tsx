"use client";

import { useMemo, useState } from "react";
import { el } from "@/lib/i18n/el";
import { fmtEur } from "@/lib/format";
import type { Product } from "@/server/domain/types";
import { offerPrice, sum } from "@/server/services/pricing";

export interface LineDraft {
  productCode: string;
  qty: number;
  floorPrice: number;
  discountPct: number;
  specialDiscountPct: number;
}

const blank = (): LineDraft => ({ productCode: "", qty: 1, floorPrice: 0, discountPct: 0, specialDiscountPct: 0 });

/** Offer lines with computed price (slide 14). Serialises to hidden input `lines`. */
export function LinesEditor({ products, initial }: { products: Product[]; initial?: LineDraft[] }) {
  const [rows, setRows] = useState<LineDraft[]>(initial?.length ? initial : [blank()]);
  const update = (i: number, patch: Partial<LineDraft>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const pick = (i: number, code: string) => {
    const p = products.find((x) => x.code === code);
    update(i, { productCode: code, floorPrice: p ? p.floorPrice : rows[i].floorPrice });
  };
  const prices = useMemo(() => rows.map((r) => offerPrice(r.floorPrice, r.qty, r.discountPct, r.specialDiscountPct)), [rows]);
  const total = sum(prices);

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="lines" value={JSON.stringify(rows)} />
      <datalist id="products">
        {products.map((p) => (
          <option key={p.code} value={p.code}>
            {p.name}
          </option>
        ))}
      </datalist>

      <div className="hidden md:block card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th className="w-10">{el.projects.no}</th>
              <th>{el.projects.code}</th>
              <th className="w-24">{el.projects.qty}</th>
              <th className="w-32">{el.projects.floorPrice}</th>
              <th className="w-24">{el.projects.discount}</th>
              <th className="w-28">{el.projects.specialDiscount}</th>
              <th className="w-32 text-right">{el.projects.offerPrice}</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="pt-4 tabular-nums">{i + 1}</td>
                <td>
                  <input list="products" className="input" value={r.productCode} onChange={(e) => pick(i, e.target.value)} placeholder="1052-45" />
                  <span className="block text-xs text-[var(--muted)] mt-1 truncate">{products.find((p) => p.code === r.productCode)?.name ?? ""}</span>
                </td>
                <td>
                  <input type="number" min={1} step={1} className="input" value={r.qty} onChange={(e) => update(i, { qty: Number(e.target.value) })} />
                </td>
                <td>
                  <input type="number" min={0} step={0.01} className="input" value={r.floorPrice} onChange={(e) => update(i, { floorPrice: Number(e.target.value) })} />
                </td>
                <td>
                  <PctInput value={r.discountPct} onChange={(v) => update(i, { discountPct: v })} />
                </td>
                <td>
                  <PctInput value={r.specialDiscountPct} onChange={(v) => update(i, { specialDiscountPct: v })} />
                </td>
                <td className="text-right font-semibold tabular-nums pt-4">{fmtEur(prices[i])}</td>
                <td>
                  <button type="button" className="btn-ghost text-danger-500" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6} className="text-right font-semibold">
                {el.app.total}
              </td>
              <td className="text-right font-bold tabular-nums">{fmtEur(total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="md:hidden flex flex-col gap-3">
        {rows.map((r, i) => (
          <div key={i} className="card p-3 grid grid-cols-2 gap-2">
            <div className="col-span-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--muted)]">
                {el.projects.no} {i + 1}
              </span>
              <button type="button" className="btn-ghost min-h-8 text-danger-500 text-sm" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>
                {el.app.removeRow}
              </button>
            </div>
            <label className="col-span-2">
              <span className="label">{el.projects.code}</span>
              <input list="products" className="input" value={r.productCode} onChange={(e) => pick(i, e.target.value)} placeholder="1052-45" />
              <span className="block text-xs text-[var(--muted)] mt-1">{products.find((p) => p.code === r.productCode)?.name ?? ""}</span>
            </label>
            <label>
              <span className="label">{el.projects.qty}</span>
              <input type="number" min={1} className="input" value={r.qty} onChange={(e) => update(i, { qty: Number(e.target.value) })} />
            </label>
            <label>
              <span className="label">{el.projects.floorPrice}</span>
              <input type="number" min={0} className="input" value={r.floorPrice} onChange={(e) => update(i, { floorPrice: Number(e.target.value) })} />
            </label>
            <label>
              <span className="label">{el.projects.discount}</span>
              <PctInput value={r.discountPct} onChange={(v) => update(i, { discountPct: v })} />
            </label>
            <label>
              <span className="label">{el.projects.specialDiscount}</span>
              <PctInput value={r.specialDiscountPct} onChange={(v) => update(i, { specialDiscountPct: v })} />
            </label>
            <div className="col-span-2 flex justify-between items-center pt-1 border-t border-[var(--line)]">
              <span className="text-sm text-[var(--muted)]">{el.projects.offerPrice}</span>
              <span className="font-bold tabular-nums">{fmtEur(prices[i])}</span>
            </div>
          </div>
        ))}
        <div className="flex justify-between items-center px-1">
          <span className="font-semibold">{el.app.total}</span>
          <span className="font-bold tabular-nums text-lg">{fmtEur(total)}</span>
        </div>
      </div>

      <button type="button" className="btn-secondary self-start" onClick={() => setRows((r) => [...r, blank()])}>
        {el.app.addRow}
      </button>
    </div>
  );
}

export function PctInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="relative">
      <input type="number" min={0} max={100} step={0.01} className="input pr-7" value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted)]">%</span>
    </div>
  );
}
