import { athensToday } from "@/lib/athens";
import { db } from "../data";
import type { Session } from "../auth/jwt";
import type { NewNextAction, Task, TaskStatusView } from "../domain/types";

const today = () => athensToday();

export function taskView(t: Task): TaskStatusView {
  if (t.status === "DONE") return "DONE";
  return t.dueDate < today() ? "OVERDUE" : "OPEN";
}

export async function pendingForDoctor(doctorId: string) {
  const tasks = await db().tasks.listByDoctor(doctorId);
  const views = tasks.map((t) => ({ ...t, view: taskView(t) }));
  return {
    tasks: views,
    counts: {
      open: views.filter((t) => t.status === "OPEN").length,
      overdue: views.filter((t) => t.view === "OVERDUE").length,
      done: views.filter((t) => t.view === "DONE").length,
    },
  };
}

export function addTask(doctorId: string, title: string, dueDate: string, user: Session, projectId?: string) {
  return db().tasks.create({ doctorId, projectId, userId: user.userId, title, dueDate, status: "OPEN", source: "MANUAL" });
}

export function completeTask(id: string) {
  return db().tasks.update(id, { status: "DONE", doneAt: new Date().toISOString() });
}

export class NextActionPartialError extends Error {}

/**
 * «Επόμενη ενέργεια»: creates the follow-up SOCALL/SOEMAIL/SOMEETING, then closes the Εκκρεμότητα (ACTSTATUS 3).
 * Create first: if SoftOne refuses it the task stays open. If only the close fails, the follow-up exists –
 * NextActionPartialError says so, so the user doesn't press again and create a duplicate.
 */
export async function closeWithNextAction(taskId: string, a: NewNextAction) {
  const created = await db().tasks.createNextAction(a);
  try {
    await completeTask(taskId);
  } catch (e) {
    throw new NextActionPartialError(`Η επόμενη ενέργεια δημιουργήθηκε (SOACTION ${created.id}), αλλά η εκκρεμότητα δεν έκλεισε: ${e instanceof Error ? e.message : String(e)}`);
  }
  return created;
}

export function reopenTask(id: string) {
  return db().tasks.update(id, { status: "OPEN", doneAt: undefined });
}
