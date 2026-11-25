"use client";

import { useState } from "react";
import { el } from "@/lib/i18n/el";
import { athensDate } from "@/lib/athens";
import { ActionForm, type ActionResult } from "./action-form";
import { Modal } from "./modal";
import { Field } from "./ui";
import { Select, type SelectOption } from "./select";
import { OwnerSelect } from "./owner-select";
import { TrnDateField } from "./trn-date-field";

/** «+ Νέα εκκρεμότητα» at the top right of the pending page: title, due date, optional project in a modal → SOTASK. */
export function NewTaskButton({
  action,
  doctorId,
  projects,
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  doctorId: string;
  /** the customer's projects (api.crm.customers/projects) */
  projects: SelectOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary whitespace-nowrap">
        {el.pending.add}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={el.pending.addTitle}>
        <ActionForm action={action} className="flex flex-col gap-4 overflow-y-auto px-5 pb-5 pt-2 text-left">
          <input type="hidden" name="doctorId" value={doctorId} />
          <Field label={el.pending.newTitle} required>
            <input name="title" className="input" required autoFocus placeholder="Αποστολή προσφοράς OCT" />
          </Field>
          <Field label={el.pending.newDue} required>
            <input name="dueDate" type="date" className="input" required defaultValue={athensDate()} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TrnDateField />
            <OwnerSelect />
          </div>
          {projects.length > 0 && (
            <Field label={el.pending.project}>
              <Select name="projectId" defaultValue="" options={[{ value: "", label: el.pending.noProject }, ...projects]} />
            </Field>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
              Άκυρο
            </button>
            <button className="btn-primary">{el.pending.addSave}</button>
          </div>
        </ActionForm>
      </Modal>
    </>
  );
}
