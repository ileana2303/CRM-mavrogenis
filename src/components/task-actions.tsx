import { el } from "@/lib/i18n/el";
import type { Task } from "@/server/domain/types";
import { nextActionAction, toggleTaskAction } from "@/app/(app)/customers/actions";
import { ActionForm } from "./action-form";
import { NextActionButton, type NextOfferProject } from "./next-action-button";

/**
 * The row buttons of an Εκκρεμότητα / call / email / meeting: «✓ Ολοκλήρωση» (or «Επαναφορά» when done) and
 * «→ Επόμενη ενέργεια». Both act on the item's own SoftOne object. Used by the customer's pending list and «Η μέρα μου».
 */
export function TaskActions({ task, filter, back, projects }: { task: Task; filter?: string; back?: string; projects?: NextOfferProject[] }) {
  const kind = task.kind ?? "TASK";
  const done = task.status === "DONE";
  return (
    <div className="flex flex-wrap justify-end gap-1">
      <ActionForm action={toggleTaskAction}>
        <input type="hidden" name="id" value={task.id} />
        <input type="hidden" name="doctorId" value={task.doctorId} />
        <input type="hidden" name="itemKind" value={kind} />
        {filter && <input type="hidden" name="filter" value={filter} />}
        {back && <input type="hidden" name="back" value={back} />}
        <input type="hidden" name="op" value={done ? "reopen" : "done"} />
        <button className="btn-ghost min-h-9 text-sm whitespace-nowrap">{done ? el.pending.reopen : `✓ ${el.pending.complete}`}</button>
      </ActionForm>
      {/* a follow-up needs a customer (TRDR); a few old SoftOne actions have none */}
      {!done && task.doctorId && (
        <NextActionButton
          action={nextActionAction}
          taskId={task.id}
          doctorId={task.doctorId}
          filter={filter}
          back={back}
          title={task.title}
          projectId={task.projectId}
          itemKind={kind}
          projects={projects}
        />
      )}
    </div>
  );
}
