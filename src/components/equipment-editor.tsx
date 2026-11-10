"use client";

import { useState } from "react";
import { el } from "@/lib/i18n/el";
import { entries } from "@/components/ui";
import { Select } from "@/components/select";
import type { Equipment, EquipmentCategory } from "@/server/domain/types";

type Row = Omit<Equipment, "id" | "doctorId">;

const blank = (): Row => ({ category: "OCT", manufacturer: "", model: "", purchaseYear: null, serviceContract: false });
const years = Array.from({ length: 26 }, (_, i) => new Date().getFullYear() - i);

export function EquipmentEditor({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial.length ? initial : [blank()]);
  const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="rows" value={JSON.stringify(rows)} />

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto card">
        <table className="table">
          <thead>
            <tr>
              <th className="w-12">{el.equipment.no}</th>
              <th>{el.equipment.category}</th>
              <th>{el.equipment.manufacturer}</th>
              <th>{el.equipment.model}</th>
              <th>{el.equipment.purchaseYear}</th>
              <th>{el.equipment.serviceContract}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="tabular-nums pt-4">{i + 1}</td>
                <td>
                  <CategorySelect value={r.category} onChange={(v) => update(i, { category: v })} />
                </td>
                <td>
                  <input className="input" value={r.manufacturer} onChange={(e) => update(i, { manufacturer: e.target.value })} placeholder="Visionix" />
                </td>
                <td>
                  <input className="input" value={r.model} onChange={(e) => update(i, { model: e.target.value })} placeholder="Solix" />
                </td>
                <td>
                  <YearSelect value={r.purchaseYear} onChange={(v) => update(i, { purchaseYear: v })} />
                </td>
                <td>
                  <YesNo value={r.serviceContract} onChange={(v) => update(i, { serviceContract: v })} />
                </td>
                <td>
                  <button type="button" className="btn-ghost text-danger-500" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {rows.map((r, i) => (
          <div key={i} className="card p-3 grid grid-cols-2 gap-2">
            <div className="col-span-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--muted)]">
                {el.equipment.no} {i + 1}
              </span>
              <button type="button" className="btn-ghost min-h-8 text-danger-500 text-sm" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>
                {el.app.removeRow}
              </button>
            </div>
            <label className="col-span-2">
              <span className="label">{el.equipment.category}</span>
              <CategorySelect value={r.category} onChange={(v) => update(i, { category: v })} />
            </label>
            <label>
              <span className="label">{el.equipment.manufacturer}</span>
              <input className="input" value={r.manufacturer} onChange={(e) => update(i, { manufacturer: e.target.value })} />
            </label>
            <label>
              <span className="label">{el.equipment.model}</span>
              <input className="input" value={r.model} onChange={(e) => update(i, { model: e.target.value })} />
            </label>
            <label>
              <span className="label">{el.equipment.purchaseYear}</span>
              <YearSelect value={r.purchaseYear} onChange={(v) => update(i, { purchaseYear: v })} />
            </label>
            <label>
              <span className="label">{el.equipment.serviceContract}</span>
              <YesNo value={r.serviceContract} onChange={(v) => update(i, { serviceContract: v })} />
            </label>
          </div>
        ))}
      </div>

      <button type="button" className="btn-secondary self-start" onClick={() => setRows((r) => [...r, blank()])}>
        {el.app.addRow}
      </button>
    </div>
  );
}

function CategorySelect({ value, onChange }: { value: EquipmentCategory; onChange: (v: EquipmentCategory) => void }) {
  return (
    <Select value={value} onChange={(v) => onChange(v as EquipmentCategory)} options={entries(el.enums.equipmentCategory).map(([v, l]) => ({ value: v, label: l }))} ariaLabel={el.equipment.category} />
  );
}

function YearSelect({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <Select value={value ?? ""} onChange={(v) => onChange(v ? Number(v) : null)} options={[{ value: "", label: "—" }, ...years.map((y) => ({ value: String(y), label: String(y) }))]} ariaLabel={el.equipment.purchaseYear} />
  );
}

function YesNo({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Select
      value={value ? "1" : "0"}
      onChange={(v) => onChange(v === "1")}
      options={[
        { value: "1", label: el.app.yes.toUpperCase() },
        { value: "0", label: el.app.no.toUpperCase() },
      ]}
      ariaLabel={el.equipment.serviceContract}
    />
  );
}
