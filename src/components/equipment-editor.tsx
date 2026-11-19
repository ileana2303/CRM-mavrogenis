"use client";

import { useMemo, useState } from "react";
import { cleanNumberInput, formatGr, parseGr } from "@/lib/gr-number";
import { el } from "@/lib/i18n/el";
import { categoryLabel } from "@/lib/equipment-summary";
import { Icon } from "@/components/icons";
import { Select, type SelectOption } from "@/components/select";
import { fmtEur } from "@/lib/format";
import type { Equipment, MachineCatalog, MachineListKind, MachineRef } from "@/server/domain/types";
import { createMachineRefAction } from "@/app/(app)/customers/actions";

export type EquipmentRow = Omit<Equipment, "id" | "doctorId">;

const blank = (): EquipmentRow => ({ category: "", manufacturer: "", model: "", purchaseYear: null, serviceContract: false, serialNumber: "", price: null });
const years = Array.from({ length: 31 }, (_, i) => new Date().getFullYear() - i);

/** Values not found in the SoftOne lists are kept as "~name" options so nothing typed earlier is lost. */
const LEGACY = "~";
const norm = (s: string) => s.trim().toLocaleLowerCase("el");
const byName = (list: MachineRef[], name: string) => (name ? list.find((x) => norm(x.name) === norm(name)) : undefined);

/** Attach SoftOne ids to rows that only carry names (older local rows). */
function resolveIds(r: EquipmentRow, c: MachineCatalog): EquipmentRow {
  return {
    ...r,
    categoryId: r.categoryId ?? byName(c.categories, categoryLabel(r.category))?.id,
    markId: r.markId ?? byName(c.marks, r.manufacturer)?.id,
    modelId: r.modelId ?? byName(c.models, r.model)?.id,
  };
}

function options(list: MachineRef[], id: string | undefined, name: string): SelectOption[] {
  const opts: SelectOption[] = list.map((x) => ({ value: x.id, label: x.name }));
  if (name && !(id && list.some((x) => x.id === id))) opts.unshift({ value: LEGACY + name, label: name, hint: el.equipment.notInSoftOne });
  return opts;
}

/** Selected option value → { id, name } */
function pick(list: MachineRef[], v: string): { id?: string; name: string } {
  if (v.startsWith(LEGACY)) return { id: undefined, name: v.slice(LEGACY.length) };
  const ref = list.find((x) => x.id === v);
  return { id: ref?.id, name: ref?.name ?? "" };
}

/** «+ Νέα …»: saves to SoftOne (api.crm/setMachine…) and hands back the entry – new, or the existing one of that name */
export type CreateRef = (kind: MachineListKind, name: string, markId?: string) => Promise<MachineRef | { error: string }>;

const LIST: Record<MachineListKind, keyof MachineCatalog> = { category: "categories", mark: "marks", model: "models" };

export function EquipmentEditor({ initial, catalog: initialCatalog }: { initial: EquipmentRow[]; catalog: MachineCatalog }) {
  // own copy of the lists: an entry created in one card shows in every card at once
  const [catalog, setCatalog] = useState(initialCatalog);
  const [rows, setRows] = useState<EquipmentRow[]>(() => (initial.length ? initial : [blank()]).map((r) => resolveIds(r, initialCatalog)));
  const createRef: CreateRef = async (kind, name, markId) => {
    const res = await createMachineRefAction(kind, name, markId);
    if ("error" in res) return res;
    const key = LIST[kind];
    setCatalog((c) => (c[key].some((x) => x.id === res.ref.id) ? c : { ...c, [key]: [...c[key], res.ref].sort((a, b) => a.name.localeCompare(b.name, "el")) }));
    return res.ref;
  };
  const update = (i: number, patch: Partial<EquipmentRow>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const remove = (i: number) => setRows((x) => x.filter((_, j) => j !== i));
  const catalogMissing = !catalog.categories.length && !catalog.marks.length && !catalog.models.length;

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="rows" value={JSON.stringify(rows)} />

      {catalogMissing && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{el.equipment.catalogEmpty}</p>}

      {rows.length === 0 ? (
        <div className="card border-dashed p-8 flex flex-col items-center text-center gap-1">
          <span className="grid place-items-center size-12 rounded-2xl bg-brand-50 text-brand-600 mb-2">
            <Icon.wrench size={22} />
          </span>
          <p className="font-semibold">{el.equipment.empty}</p>
          <p className="text-sm text-[var(--muted)]">{el.equipment.emptyHint}</p>
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {rows.map((r, i) => (
            <MachineCard key={i} index={i} row={r} catalog={catalog} createRef={createRef} onChange={(p) => update(i, p)} onRemove={() => remove(i)} />
          ))}
        </ol>
      )}

      <button
        type="button"
        onClick={() => setRows((r) => [...r, blank()])}
        className="group flex items-center justify-center gap-2 min-h-14 rounded-2xl border-2 border-dashed border-brand-200 text-brand-700 font-semibold hover:bg-brand-50 hover:border-brand-300 transition-colors"
      >
        <span className="grid place-items-center size-7 rounded-full bg-brand-100 group-hover:bg-brand-200 transition-colors">
          <Icon.plus size={16} />
        </span>
        {el.equipment.addMachine}
      </button>
    </div>
  );
}

function MachineCard({
  index,
  row: r,
  catalog,
  createRef,
  onChange,
  onRemove,
}: {
  index: number;
  row: EquipmentRow;
  catalog: MachineCatalog;
  createRef: CreateRef;
  onChange: (p: Partial<EquipmentRow>) => void;
  onRemove: () => void;
}) {
  // models carry markId once SoftOne links them to a brand; until then every model is offered
  const linked = catalog.models.some((m) => m.markId);
  const models = useMemo(
    () => (linked && r.markId ? catalog.models.filter((m) => !m.markId || m.markId === r.markId) : catalog.models),
    [catalog.models, linked, r.markId],
  );
  const title = [r.manufacturer, r.model].filter(Boolean).join(" ");
  const cat = r.category ? categoryLabel(r.category) : "";

  return (
    <li className="card p-4 md:p-5">
      <div className="flex items-start gap-3 mb-4">
        <span className="grid place-items-center size-9 shrink-0 rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 text-white text-sm font-bold tabular-nums shadow-[0_6px_14px_-6px_rgba(11,95,165,0.6)]">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="font-semibold truncate">{title || el.equipment.newMachine}</div>
          <div className="text-xs text-[var(--muted)] truncate">
            {[cat, r.purchaseYear ? String(r.purchaseYear) : "", r.price != null ? fmtEur(r.price, true) : "", r.serviceContract ? `${el.equipment.serviceContract} ✓` : ""].filter(Boolean).join(" · ") || "—"}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          title={el.equipment.removeMachine}
          aria-label={el.equipment.removeMachine}
          className="grid place-items-center size-10 shrink-0 rounded-xl text-[var(--muted)] hover:text-danger-500 hover:bg-red-50 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <Labeled label={el.equipment.category} span="sm:col-span-4">
          <Select
            value={r.categoryId ?? (r.category ? LEGACY + r.category : "")}
            onChange={(v) => {
              const p = pick(catalog.categories, v);
              onChange({ categoryId: p.id, category: p.name });
            }}
            options={options(catalog.categories, r.categoryId, r.categoryId ? "" : categoryLabel(r.category))}
            placeholder={el.equipment.choose}
            searchable
            ariaLabel={el.equipment.category}
            create={{
              label: el.equipment.newCategory,
              onCreate: async (name) => {
                const ref = await createRef("category", name);
                if ("error" in ref) return ref;
                onChange({ categoryId: ref.id, category: ref.name });
              },
            }}
          />
        </Labeled>
        <Labeled label={el.equipment.manufacturer} span="sm:col-span-4">
          <Select
            value={r.markId ?? (r.manufacturer ? LEGACY + r.manufacturer : "")}
            onChange={(v) => {
              const p = pick(catalog.marks, v);
              const model = catalog.models.find((m) => m.id === r.modelId);
              // a model of another brand no longer fits
              const keepModel = !model?.markId || model.markId === p.id;
              onChange({ markId: p.id, manufacturer: p.name, ...(keepModel ? {} : { modelId: undefined, model: "" }) });
            }}
            options={options(catalog.marks, r.markId, r.manufacturer)}
            placeholder={el.equipment.choose}
            searchable
            ariaLabel={el.equipment.manufacturer}
            create={{
              label: el.equipment.newMark,
              onCreate: async (name) => {
                const ref = await createRef("mark", name);
                if ("error" in ref) return ref;
                const model = catalog.models.find((m) => m.id === r.modelId);
                const keepModel = !model?.markId || model.markId === ref.id;
                onChange({ markId: ref.id, manufacturer: ref.name, ...(keepModel ? {} : { modelId: undefined, model: "" }) });
              },
            }}
          />
        </Labeled>
        <Labeled label={el.equipment.model} span="sm:col-span-4">
          <Select
            value={r.modelId ?? (r.model ? LEGACY + r.model : "")}
            onChange={(v) => {
              const p = pick(catalog.models, v);
              const mark = catalog.marks.find((m) => m.id === catalog.models.find((x) => x.id === p.id)?.markId);
              // choosing a linked model fills in its brand
              onChange({ modelId: p.id, model: p.name, ...(mark && !r.markId ? { markId: mark.id, manufacturer: mark.name } : {}) });
            }}
            options={options(models, r.modelId, r.model)}
            placeholder={linked && !r.markId ? el.equipment.chooseMarkFirst : el.equipment.choose}
            searchable
            ariaLabel={el.equipment.model}
            create={{
              label: el.equipment.newModel,
              // sent with the row's company, so SoftOne can link the model to it (once setMachineModels stores markId)
              onCreate: async (name) => {
                const ref = await createRef("model", name, r.markId);
                if ("error" in ref) return ref;
                onChange({ modelId: ref.id, model: ref.name });
              },
            }}
          />
        </Labeled>
        <Labeled label={el.equipment.purchaseYear} span="sm:col-span-3">
          <Select
            value={r.purchaseYear ?? ""}
            onChange={(v) => onChange({ purchaseYear: v ? Number(v) : null })}
            options={[{ value: "", label: "—" }, ...years.map((y) => ({ value: String(y), label: String(y) }))]}
            ariaLabel={el.equipment.purchaseYear}
          />
        </Labeled>
        <Labeled label={el.equipment.serialNumber} span="sm:col-span-3">
          <input className="input" value={r.serialNumber ?? ""} onChange={(e) => onChange({ serialNumber: e.target.value })} placeholder="S/N" autoComplete="off" />
        </Labeled>
        <Labeled label={el.equipment.price} span="sm:col-span-3">
          <PriceInput value={r.price ?? null} onChange={(price) => onChange({ price })} />
        </Labeled>
        <Labeled label={el.equipment.serviceContract} span="sm:col-span-3">
          <Segmented value={r.serviceContract} onChange={(v) => onChange({ serviceContract: v })} />
        </Labeled>
      </div>
    </li>
  );
}

function Labeled({ label, span = "", children }: { label: string; span?: string; children: React.ReactNode }) {
  return (
    <div className={`min-w-0 ${span}`}>
      <span className="label">{label}</span>
      {children}
    </div>
  );
}

/** € amount, typed and shown the Greek way ("1.500,50", lib/gr-number); empty = no price (null). */
function PriceInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [text, setText] = useState(value === null ? "" : formatGr(value, 2));
  return (
    <div className="relative">
      <input
        className="input pr-8 tabular-nums"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        aria-label={el.equipment.price}
        value={text}
        onChange={(e) => {
          const t = cleanNumberInput(e.target.value).replace("-", "");
          setText(t);
          const n = parseGr(t);
          onChange(n === null ? null : Math.round(n * 100) / 100);
        }}
        onBlur={() => {
          const n = parseGr(text);
          if (n !== null) setText(formatGr(n, 2));
        }}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted)]">€</span>
    </div>
  );
}

/** ΝΑΙ / ΟΧΙ as a two-segment toggle – one tap instead of open-list-pick. */
function Segmented({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const opt = (v: boolean, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={value === v}
      onClick={() => onChange(v)}
      className={`flex-1 rounded-lg text-sm font-semibold transition-all ${
        value === v ? (v ? "bg-brand-600 text-white shadow-sm" : "bg-white text-[var(--text)] shadow-sm") : "text-[var(--muted)] hover:text-[var(--text)]"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div role="radiogroup" aria-label={el.equipment.serviceContract} className="flex gap-1 p-1 min-h-11 rounded-xl bg-slate-100/80 border border-[var(--line)]">
      {opt(true, el.app.yes.toUpperCase())}
      {opt(false, el.app.no.toUpperCase())}
    </div>
  );
}
