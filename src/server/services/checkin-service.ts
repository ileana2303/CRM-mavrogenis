import { db } from "../data";
import type { Session } from "../auth/jwt";
import type { DateRange } from "../data/provider";

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

export async function depart(doctorId: string, user: Session, geo: Geo) {
  const open = await db().checkIns.openForUser(user.userId, doctorId);
  if (!open) return null;
  return db().checkIns.update(open.id, {
    departedAt: new Date().toISOString(),
    departLat: geo.lat,
    departLng: geo.lng,
  });
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
