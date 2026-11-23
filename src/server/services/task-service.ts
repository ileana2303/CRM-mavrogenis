import { athensToday } from "@/lib/athens";
import { db } from "../data";
import type { Session } from "../auth/jwt";
import type { ActionKind, NewNextAction, Task, TaskStatusView } from "../domain/types";

const today = () => athensToday();

export function taskView(t: Task): TaskStatusView {
  if (t.status === "DONE") return "DONE";
  return t.dueDate < today() ? "OVERDUE" : "OPEN";
}

/** date then time – untimed tasks go before the timed items of the same day */
const byWhen = (a: Task, b: Task) => (a.dueDate + (a.time ?? "")).localeCompare(b.dueDate + (b.time ?? ""));

/** A customer's Εκκρεμότητες, calls, emails and meetings – every salesperson's (api.crm.actions/getPendings {trdr}). */
export async function pendingForDoctor(doctorId: string) {
  const { tasks, projects } = await db().tasks.pendingsByDoctor(doctorId);
  const views = tasks.map((t) => ({ ...t, view: taskView(t) }));
  return {
    tasks: views,
    projects,
    counts: {
      open: views.filter((t) => t.status === "OPEN").length,
      overdue: views.filter((t) => t.view === "OVERDUE").length,
      done: views.filter((t) => t.view === "DONE").length,
    },
  };
}

/** «Η μέρα μου»: the salesperson's open items due today or earlier, across customers – overdue (oldest first), then today. */
export async function myDay(user: Session) {
  const t = today();
  const items = (await db().tasks.listByUser(user.userId, t)).filter((x) => x.status === "OPEN");
  return {
    today: t,
    overdue: items.filter((x) => x.dueDate < t).sort(byWhen),
    dueToday: items.filter((x) => x.dueDate === t).sort(byWhen),
  };
}

export function addTask(doctorId: string, title: string, dueDate: string, user: Session, projectId?: string, ownerId?: string) {
  return db().tasks.create({ doctorId, projectId, userId: user.userId, ownerId, title, dueDate, status: "OPEN", source: "MANUAL" });
}

/** who an action can be assigned to (ACTPRSN), from api.crm/bootstrap; [] when bootstrap fails – the forms then assign to the logged-in salesperson */
export async function listSalespeople() {
  try {
    return await db().stats.salespeople();
  } catch (e) {
    console.error("[tasks] salespeople (bootstrap prsns) failed", e);
    return [];
  }
}

/** ACTSTATUS 3 on the item's own object (SOTASK / SOCALL / SOEMAIL / SOMEETING). */
export function completeTask(id: string, kind: ActionKind = "TASK") {
  return db().tasks.update(id, { status: "DONE", doneAt: new Date().toISOString() }, kind);
}

export class NextActionPartialError extends Error {}

/**
 * «Επόμενη ενέργεια»: creates the follow-up SOCALL/SOEMAIL/SOMEETING, then closes the source item (ACTSTATUS 3 on its own
 * object). Create first: if SoftOne refuses it the source stays open. If only the close fails, the follow-up exists –
 * NextActionPartialError says so, so the user doesn't press again and create a duplicate.
 */
export async function closeWithNextAction(taskId: string, taskKind: ActionKind, a: NewNextAction) {
  const created = await db().tasks.createNextAction(a);
  try {
    await completeTask(taskId, taskKind);
  } catch (e) {
    throw new NextActionPartialError(`Η επόμενη ενέργεια δημιουργήθηκε (SOACTION ${created.id}), αλλά η προηγούμενη δεν έκλεισε: ${e instanceof Error ? e.message : String(e)}`);
  }
  return created;
}

/**
 * «Καταγραφή κλήσης»: the call that just happened (done SOCALL) and, optionally, its follow-up linked to it
 * (SOACTIONS = the call). If only the follow-up fails, the call is saved – NextActionPartialError says so.
 */
export async function logCall(doctorId: string, at: string, comments: string, next?: Omit<NewNextAction, "doctorId" | "fromTaskId">) {
  // the logged call itself is the logged-in salesperson's (they made it); only its follow-up can be assigned
  const call = await db().tasks.logCall({ doctorId, at, comments });
  if (!next) return { call };
  try {
    const followUp = await db().tasks.createNextAction({ ...next, doctorId, fromTaskId: call.id });
    return { call, followUp };
  } catch (e) {
    throw new NextActionPartialError(`Η κλήση καταγράφηκε (SOACTION ${call.id}), αλλά η επόμενη ενέργεια δεν αποθηκεύτηκε: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** The chain of actions linked to an item (api.crm.actions/getTimeline), newest first. */
export function taskTimeline(id: string) {
  return db().tasks.timeline(id);
}

export function reopenTask(id: string, kind: ActionKind = "TASK") {
  return db().tasks.update(id, { status: "OPEN", doneAt: undefined }, kind);
}
