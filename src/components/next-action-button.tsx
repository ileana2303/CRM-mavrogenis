"use client";

import { useState } from "react";
import { el } from "@/lib/i18n/el";
import { athensDate } from "@/lib/athens";
import type { ActionKind, NextActionKind } from "@/server/domain/types";
import { ActionForm, type ActionResult } from "./action-form";
import { Modal } from "./modal";
import { Field } from "./ui";

const KINDS: Array<[NextActionKind, string]> = [
  ["CALL", el.pending.nextCall],
  ["EMAIL", el.pending.nextEmail],
  ["MEETING", el.pending.nextMeeting],
];

/** Next full hour in Athens as "hh:00" (23:xx → "23:30"). */
function nextHour(): string {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Athens", hour: "2-digit", hour12: false }).format(new Date())) % 24;
  return h >= 23 ? "23:30" : `${String(h + 1).padStart(2, "0")}:00`;
}

/**
 * «→ Επόμενη ενέργεια» next to «✓ Ολοκλήρωση» on an open Εκκρεμότητα: picks Τηλέφωνο / Email / Συνάντηση + when,
 * creates that SOACTION in SoftOne and closes the Εκκρεμότητα in one step.
 */
export function NextActionButton({
  action,
  taskId,
  doctorId,
  filter,
  title,
  projectId,
  itemKind = "TASK",
  back,
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  taskId: string;
  doctorId: string;
  filter?: string;
  title: string;
  /** PRJC of the source item – the new action carries it */
  projectId?: string;
  /** object of the source item, closed after the new action is saved */
  itemKind?: ActionKind;
  /** page to return to (default: the customer's pending list) */
  back?: string;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<NextActionKind>("CALL");

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost min-h-9 text-sm whitespace-nowrap">
        → {el.pending.next}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={el.pending.nextTitle} footer={el.pending.nextNote}>
        <ActionForm action={action} className="flex flex-col gap-4 overflow-y-auto px-5 pb-5 pt-2 text-left">
          <input type="hidden" name="taskId" value={taskId} />
          <input type="hidden" name="doctorId" value={doctorId} />
          {filter && <input type="hidden" name="filter" value={filter} />}
          {back && <input type="hidden" name="back" value={back} />}
          <input type="hidden" name="itemKind" value={itemKind} />
          <input type="hidden" name="kind" value={kind} />
          {projectId && <input type="hidden" name="projectId" value={projectId} />}
          <p className="text-sm text-[var(--muted)] line-clamp-2">{title}</p>

          <div>
            <span className="label">{el.pending.nextKind}</span>
            <div role="radiogroup" aria-label={el.pending.nextKind} className="grid grid-cols-3 gap-2">
              {KINDS.map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={kind === k}
                  onClick={() => setKind(k)}
                  className={`chip min-h-11 justify-center ${kind === k ? "bg-brand-600 text-white border-brand-600" : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={el.pending.nextDate} required>
              <input name="date" type="date" className="input" required defaultValue={athensDate()} />
            </Field>
            <Field label={el.pending.nextTime} required>
              <input name="time" type="time" className="input" required defaultValue={nextHour()} />
            </Field>
          </div>

          <Field label={el.pending.nextComments}>
            <textarea name="comments" className="input min-h-24" defaultValue={title} />
          </Field>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
              Άκυρο
            </button>
            <button className="btn-primary">{el.pending.nextSave}</button>
          </div>
        </ActionForm>
      </Modal>
    </>
  );
}
