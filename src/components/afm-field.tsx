"use client";

import { useRef, useState, useTransition } from "react";
import { isValidAfm, normalizeAfm } from "@/lib/afm";
import { lookupAfmAction, type AfmLookupResult } from "@/app/(app)/customers/afm-actions";

type Found = Extract<AfmLookupResult, { ok: true }>;

/** Form fields the register can fill, and where each value comes from. */
const TARGETS: Array<[name: string, pick: (r: Found) => string]> = [
  ["lastName", (r) => r.lastName],
  ["firstName", (r) => r.firstName],
  ["clinicAddress", (r) => r.address],
  ["city", (r) => r.city],
  ["postalCode", (r) => r.postalCode],
];

/**
 * The doctor form's ΑΦΜ input, as in ranty.gr: once a valid ΑΦΜ is typed it asks ΑΑΔΕ and writes what the register says into
 * the form's empty fields (still editable before the save). A saved ΑΦΜ is not looked up on open – each call is counted and
 * shows in the looked-up person's TAXISnet – only when it changes, or on «Αναζήτηση ΑΑΔΕ».
 */
export function AfmField({ defaultValue = "" }: { defaultValue?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const asked = useRef(normalizeAfm(defaultValue));
  const [value, setValue] = useState(defaultValue);
  const [looking, start] = useTransition();
  const [result, setResult] = useState<AfmLookupResult | null>(null);

  const afm = normalizeAfm(value);
  const invalid = afm !== null && !isValidAfm(afm);

  function fill(r: Found, overwrite: boolean) {
    const form = input.current?.form;
    if (!form) return;
    for (const [name, pick] of TARGETS) {
      const field = form.elements.namedItem(name);
      const next = pick(r);
      if (field instanceof HTMLInputElement && next && (overwrite || !field.value.trim())) field.value = next;
    }
  }

  function lookup(target: string) {
    asked.current = target;
    start(async () => {
      const r = await lookupAfmAction(target);
      setResult(r);
      if (r.ok) fill(r, false);
    });
  }

  function onChange(next: string) {
    setValue(next);
    const n = normalizeAfm(next);
    if (n && isValidAfm(n) && n !== asked.current) lookup(n);
    else if (!n) setResult(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={input}
            name="afm"
            className="input pr-10"
            inputMode="numeric"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0602…"
            aria-invalid={invalid || undefined}
            aria-busy={looking || undefined}
          />
          {looking && (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center" aria-hidden>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            </span>
          )}
        </div>
        <button
          type="button"
          className="btn-secondary shrink-0"
          disabled={looking || !afm || invalid}
          onClick={() => afm && lookup(afm)}
        >
          Αναζήτηση ΑΑΔΕ
        </button>
      </div>

      {invalid && <p className="text-sm text-red-700">Ο ΑΦΜ δεν είναι έγκυρος (λάθος ψηφίο ελέγχου).</p>}

      {result && !result.ok && !invalid && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{result.error}</div>
      )}

      {result?.ok && (
        <div
          className={`rounded-xl border px-3 py-2 text-sm flex flex-col gap-1 ${
            result.active ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          <p className="font-semibold">
            {result.legalName}
            {result.commercialTitle && <span className="font-normal"> · {result.commercialTitle}</span>}
          </p>
          {!result.active && <p className="font-semibold">Ο ΑΦΜ είναι κλειστός (απενεργοποιημένος) στο μητρώο.</p>}
          <p>
            ΔΟΥ: {result.taxOffice || "—"}
            {result.profession && <> · {result.profession}</>}
          </p>
          <p>{[result.address, result.postalCode, result.city].filter(Boolean).join(", ") || "Χωρίς διεύθυνση στο μητρώο"}</p>
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-xs opacity-80">Συμπληρώθηκαν τα κενά πεδία.</span>
            <button type="button" className="btn-ghost text-sm" onClick={() => fill(result, true)}>
              Αντικατάσταση όλων
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
