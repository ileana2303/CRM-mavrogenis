import { db } from "../data";
import type { Visit } from "../domain/types";
import type { Session } from "../auth/jwt";

export type VisitInput = Pick<Visit, "contactMethod" | "topic" | "outcome" | "nextActionDate" | "comment" | "projectId">;

export function listVisits(doctorId: string) {
  return db().visits.listByDoctor(doctorId);
}

export async function recordVisit(doctorId: string, input: VisitInput, user: Session): Promise<Visit> {
  const visit = await db().visits.create({
    doctorId,
    userId: user.userId,
    date: new Date().toISOString().slice(0, 10),
    ...input,
    nextActionDate: input.nextActionDate || undefined,
    projectId: input.projectId || undefined,
  });
  // A next action becomes a pending task so it shows up in Εκκρεμότητες / Αναφορά Ημέρας
  if (input.nextActionDate && input.outcome !== "NONE") {
    const label: Record<Visit["outcome"], string> = {
      NONE: "",
      CONTACT: "Επικοινωνία",
      SEND_MATERIAL: "Αποστολή υλικού",
      DEMO: "Προγραμματισμός Demo",
      OFFER: "Αποστολή προσφοράς",
    };
    await db().tasks.create({
      doctorId,
      projectId: input.projectId || undefined,
      userId: user.userId,
      title: label[input.outcome],
      dueDate: input.nextActionDate,
      status: "OPEN",
      source: "VISIT",
    });
  }
  return visit;
}
