import { db } from "../data";
import type { Session } from "../auth/jwt";
import type { DateRange } from "../data/provider";
import type { NewNextAction } from "../domain/types";

export interface Geo {
  lat?: number;
  lng?: number;
}

export function openCheckIn(doctorId: string, user: Session) {
  return db().checkIns.openForUser(user.userId, doctorId);
}

export async function arrive(doctorId: string, user: Session, geo: Geo) {
  const open = await db().checkIns.openForUser(user.userId, doctorId);
  if (open) return open;
  return db().checkIns.create({
    doctorId,
    userId: user.userId,
    arrivedAt: new Date().toISOString(),
    arriveLat: geo.lat,
    arriveLng: geo.lng,
  });
}

export async function depart(doctorId: string, user: Session, geo: Geo, notes?: string) {
  const open = await db().checkIns.openForUser(user.userId, doctorId);
  if (!open) return null;
  return db().checkIns.update(open.id, {
    departedAt: new Date().toISOString(),
    departLat: geo.lat,
    departLng: geo.lng,
    ...(notes ? { notes } : {}),
  });
}

export class VisitPartialError extends Error {}

/**
 * Αναχώρηση with the visit report: FINALDATE + COMMENTS on the open arrival (SOMEETING 2001), then – optionally – the next
 * action linked to that visit (SOACTIONS = the arrival). If only the follow-up fails, the departure is saved and the error
 * says so (no second departure on retry).
 */
export async function departWithReport(doctorId: string, user: Session, geo: Geo, notes: string, next?: Omit<NewNextAction, "doctorId" | "fromTaskId">) {
  const open = await db().checkIns.openForUser(user.userId, doctorId);
  if (!open) throw new Error("Δεν υπάρχει ανοιχτή άφιξη σε αυτόν τον πελάτη.");
  await db().checkIns.update(open.id, {
    departedAt: new Date().toISOString(),
    departLat: geo.lat,
    departLng: geo.lng,
    ...(notes ? { notes } : {}),
  });
  if (!next) return;
  try {
    await db().tasks.createNextAction({ ...next, doctorId, fromTaskId: open.id });
  } catch (e) {
    throw new VisitPartialError(`Η αναχώρηση αποθηκεύτηκε, αλλά η επόμενη ενέργεια δεν αποθηκεύτηκε: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Manager-only. */
export async function listCheckIns(range: DateRange, userId?: string) {
  const rows = await db().checkIns.list(range, userId);
  const doctors = await db().doctors.findByIds([...new Set(rows.map((r) => r.doctorId))]);
  const users = await db().users.list();
  return rows.map((r) => ({
    ...r,
    doctor: doctors.find((d) => d.id === r.doctorId) ?? null,
    user: users.find((u) => u.id === r.userId) ?? null,
  }));
}
