import { db } from "../data";
import type { Autopsy, Equipment } from "../domain/types";
import type { Session } from "../auth/jwt";

export type AutopsyEquipmentRow = Omit<Equipment, "id" | "doctorId">;

export interface AutopsyInput {
  date: string; // YYYY-MM-DD
  comments: string;
  equipment: AutopsyEquipmentRow[];
}

export function listAutopsies(doctorId: string) {
  return db().autopsies.listByDoctor(doctorId);
}

export async function lastAutopsy(doctorId: string): Promise<Autopsy | null> {
  const rows = await db().autopsies.listByDoctor(doctorId);
  return rows[0] ?? null;
}

/**
 * Αυτοψία = SOMEETING (series 2002) + the customer's equipment list replaced with what was found.
 * The provider decides where the header goes (local JSON or SoftOne setData).
 */
export async function recordAutopsy(doctorId: string, input: AutopsyInput, user: Session): Promise<Autopsy> {
  const equipment = input.equipment.filter((r) => r.manufacturer || r.model || r.category);
  const autopsy = await db().autopsies.create({
    doctorId,
    userId: user.userId,
    userName: user.fullName,
    date: input.date || new Date().toISOString().slice(0, 10),
    comments: input.comments.trim(),
    equipment,
    createdAt: new Date().toISOString(),
  });
  await db().equipment.replaceForDoctor(
    doctorId,
    equipment.map((r) => ({ ...r, doctorId })),
  );
  return autopsy;
}
