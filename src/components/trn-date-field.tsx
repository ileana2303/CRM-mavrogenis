"use client";

import { el } from "@/lib/i18n/el";
import { DateInput } from "./date-input";
import { athensDate } from "@/lib/athens";
import { Field } from "./ui";

/** «Ημ/νία καταχώρησης» = SOACTION.TRNDATE on every form that creates an action; today by default, editable. */
export function TrnDateField({ name = "trnDate" }: { name?: string }) {
  return (
    <Field label={el.pending.trnDate} required>
      <DateInput name={name} required defaultValue={athensDate()} ariaLabel={el.pending.trnDate} />
    </Field>
  );
}
