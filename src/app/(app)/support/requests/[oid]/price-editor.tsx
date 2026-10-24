"use client";

import { useMemo, useState } from "react";
import { el } from "@/lib/i18n/el";
import { fmtEur } from "@/lib/format";
import type { OfferLine } from "@/server/domain/types";
import { offerPrice, sum } from "@/server/services/pricing";

/** Support pricing table: fields are named discount_<lineNo> / special_<lineNo> for the server action. */
export function PriceEditor({ lines, readOnly }: { lines: OfferLine[]; readOnly: boolean }) {
  const [rows, setRows] = useState(lines.map((l) => ({ d: l.discountPct, s: l.specialDiscountPct })));
  const prices = useMemo(() => lines.map((l, i) => offerPrice(l.floorPrice, l.qty, rows[i].d, rows[i].s)), [lines, rows]);

  return (
    <div className="card overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>{el.projects.no}</th>
            <th>{el.projects.productCode}</th>
            <th className="text-right">{el.projects.qty}</th>
            <th className="text-right">{el.projects.floorPrice}</th>
            {lines.some((l) => l.prevPrice != null) && <th className="text-right">{el.revise.prevPrice}</th>}
            <th className="w-28">{el.projects.discount}</th>
            <th className="w-28">{el.projects.specialDiscount}</th>
            <th className="text-right">{el.projects.offerPrice}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={l.lineNo}>
              <td className="pt-4">{l.lineNo}</td>
              <td className="pt-4 font-mono">{l.productCode}</td>
              <td className="pt-4 text-right">{l.qty}</td>
              <td className="pt-4 text-right tabular-nums">{fmtEur(l.floorPrice)}</td>
              {lines.some((x) => x.prevPrice != null) && <td className="pt-4 text-right tabular-nums text-[var(--muted)]">{l.prevPrice != null ? fmtEur(l.prevPrice) : "—"}</td>}
              <td>
                <input
                  type="number"
                  name={`discount_${l.lineNo}`}
                  min={0}
                  max={100}
                  step={0.01}
                  className="input"
                  value={rows[i].d}
                  readOnly={readOnly}
                  onChange={(e) => setRows((r) => r.map((x, j) => (j === i ? { ...x, d: Number(e.target.value) } : x)))}
                />
              </td>
              <td>
                <input
                  type="number"
                  name={`special_${l.lineNo}`}
                  min={0}
                  max={100}
                  step={0.01}
                  className="input"
                  value={rows[i].s}
                  readOnly={readOnly}
                  onChange={(e) => setRows((r) => r.map((x, j) => (j === i ? { ...x, s: Number(e.target.value) } : x)))}
                />
              </td>
              <td className="pt-4 text-right font-semibold tabular-nums">{fmtEur(prices[i])}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={lines.some((l) => l.prevPrice != null) ? 7 : 6} className="text-right font-semibold">
              {el.app.total}
            </td>
            <td className="text-right font-bold tabular-nums">{fmtEur(sum(prices))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
