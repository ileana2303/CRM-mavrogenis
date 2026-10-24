import { db } from "../data";
import type { Session } from "../auth/jwt";
import type { Task, TaskStatusView } from "../domain/types";

const today = () => new Date().toISOString().slice(0, 10);

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

export function reopenTask(id: string) {
  return db().tasks.update(id, { status: "OPEN", doneAt: undefined });
}
