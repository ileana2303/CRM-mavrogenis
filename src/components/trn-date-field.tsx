"use client";

import { el } from "@/lib/i18n/el";
import { athensDate } from "@/lib/athens";
import { Field } from "./ui";

/** «Ημ/νία καταχώρησης» = SOACTION.TRNDATE on every form that creates an action; today by default, editable. */
export function TrnDateField({ name = "trnDate" }: { name?: string }) {
  return (
    <Field label={el.pending.trnDate} required>
      <input name={name} type="date" className="input" required defaultValue={athensDate()} />
    </Field>
  );
}
