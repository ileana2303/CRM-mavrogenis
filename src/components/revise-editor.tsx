"use client";

import { useMemo, useState } from "react";
import { el } from "@/lib/i18n/el";
import { fmtEur } from "@/lib/format";
import type { ProjectLine } from "@/server/domain/types";
import { offerPrice, sum } from "@/server/services/pricing";
import { PctInput } from "./lines-editor";

/** Slide 17: previous price vs new discounts → new price. Serialises to hidden input `lines`. */
export function ReviseEditor({ lines }: { lines: ProjectLine[] }) {
  const [rows, setRows] = useState(lines.map((l) => ({ lineNo: l.lineNo, discountPct: l.discountPct, specialDiscountPct: l.specialDiscountPct })));
  const update = (i: number, patch: Partial<(typeof rows)[number]>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const newPrices = useMemo(() => lines.map((l, i) => offerPrice(l.floorPrice, l.qty, rows[i].discountPct, rows[i].specialDiscountPct)), [lines, rows]);

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="lines" value={JSON.stringify(rows)} />
      <div className="hidden md:block card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>{el.projects.no}</th>
              <th>{el.projects.productCode}</th>
              <th className="text-right">{el.projects.qty}</th>
              <th className="text-right">{el.projects.floorPrice}</th>
              <th className="text-right">{el.revise.prevPrice}</th>
              <th className="w-28">{el.revise.newDiscount}</th>
              <th className="w-28">{el.revise.newSpecialDiscount}</th>
              <th className="text-right">{el.revise.newPrice}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={l.lineNo}>
                <td className="pt-4">{l.lineNo}</td>
                <td className="pt-4 font-mono">{l.productCode}</td>
                <td className="pt-4 text-right">{l.qty}</td>
                <td className="pt-4 text-right tabular-nums">{fmtEur(l.floorPrice)}</td>
                <td className="pt-4 text-right tabular-nums text-[var(--muted)]">{fmtEur(l.offerPrice)}</td>
                <td>
                  <PctInput value={rows[i].discountPct} onChange={(v) => update(i, { discountPct: v })} />
                </td>
                <td>
                  <PctInput value={rows[i].specialDiscountPct} onChange={(v) => update(i, { specialDiscountPct: v })} />
                </td>
                <td className={`pt-4 text-right font-semibold tabular-nums ${newPrices[i] < l.offerPrice ? "text-danger-600" : ""}`}>{fmtEur(newPrices[i])}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="text-right font-semibold">
                {el.app.total}
              </td>
              <td className="text-right tabular-nums text-[var(--muted)]">{fmtEur(sum(lines.map((l) => l.offerPrice)))}</td>
              <td colSpan={2} />
              <td className="text-right font-bold tabular-nums">{fmtEur(sum(newPrices))}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="md:hidden flex flex-col gap-3">
        {lines.map((l, i) => (
          <div key={l.lineNo} className="card p-3 grid grid-cols-2 gap-2">
            <div className="col-span-2 flex justify-between text-sm">
              <span className="font-mono font-semibold">{l.productCode}</span>
              <span className="text-[var(--muted)]">
                ×{l.qty} · Floor {fmtEur(l.floorPrice)}
              </span>
            </div>
            <label>
              <span className="label">{el.revise.newDiscount}</span>
              <PctInput value={rows[i].discountPct} onChange={(v) => update(i, { discountPct: v })} />
            </label>
            <label>
              <span className="label">{el.revise.newSpecialDiscount}</span>
              <PctInput value={rows[i].specialDiscountPct} onChange={(v) => update(i, { specialDiscountPct: v })} />
            </label>
            <div className="text-sm">
              <span className="block text-[var(--muted)]">{el.revise.prevPrice}</span>
              <span className="tabular-nums">{fmtEur(l.offerPrice)}</span>
            </div>
            <div className="text-sm text-right">
              <span className="block text-[var(--muted)]">{el.revise.newPrice}</span>
              <span className="font-bold tabular-nums">{fmtEur(newPrices[i])}</span>
            </div>
          </div>
        ))}
        <div className="flex justify-between items-center px-1">
          <span className="font-semibold">{el.app.total}</span>
          <span className="font-bold tabular-nums text-lg">{fmtEur(sum(newPrices))}</span>
        </div>
      </div>
    </div>
  );
}
