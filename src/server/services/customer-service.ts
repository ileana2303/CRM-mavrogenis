import { db } from "../data";
import type { DoctorSearch } from "../data/provider";
import type { Consent, ConsentChannels, Doctor, Equipment } from "../domain/types";
import type { Session } from "../auth/jwt";

export type DoctorInput = Omit<Doctor, "id" | "ownerUserId" | "createdAt" | "updatedAt" | "softoneTrdr">;

export const doctorFullName = (d: Pick<Doctor, "firstName" | "lastName">) =>
  [d.lastName, d.firstName].filter(Boolean).join(" ") || "—";

export function searchDoctors(q: DoctorSearch) {
  return db().doctors.search(q);
}

export function getDoctor(id: string) {
  return db().doctors.findById(id);
}

export async function createDoctor(input: DoctorInput, user: Session): Promise<Doctor> {
  const now = new Date().toISOString();
  return db().doctors.create({ ...input, ownerUserId: user.userId, createdAt: now, updatedAt: now });
}

export async function updateDoctor(id: string, input: DoctorInput): Promise<Doctor> {
  return db().doctors.update(id, { ...input, updatedAt: new Date().toISOString() });
}

export function getConsent(doctorId: string) {
  return db().doctors.getConsent(doctorId);
}

export function saveConsent(
  doctorId: string,
  signerName: string,
  signaturePng: string,
  channels: ConsentChannels,
  user: Session,
): Promise<Consent> {
  return db().doctors.saveConsent({
    doctorId,
    signerName,
    signaturePng,
    channels,
    signedAt: new Date().toISOString(),
    byUserId: user.userId,
  });
}

export function listHospitals(term?: string) {
  return db().stats.listHospitals(term);
}

export function listEquipment(doctorId: string) {
  return db().equipment.listByDoctor(doctorId);
}

/** Machine categories / marks / models (SoftOne api.crm/bootstrap). Never blocks the page: empty lists on failure. */
export async function machineCatalog() {
  try {
    return await db().stats.machineCatalog();
  } catch (e) {
    console.error("machineCatalog", e);
    return { categories: [], marks: [], models: [] };
  }
}

export function saveEquipment(doctorId: string, rows: Omit<Equipment, "id" | "doctorId">[]) {
  return db().equipment.replaceForDoctor(
    doctorId,
    rows.map((r) => ({ ...r, doctorId })),
  );
}

export async function doctorHistory(doctorId: string) {
  const rows = await db().stats.doctorHistory(doctorId);
  const total = rows.reduce(
    (acc, r) => ({
      offersValue: acc.offersValue + r.offersValue,
      turnover: acc.turnover + r.turnover,
      visits: acc.visits + r.visits,
    }),
    { offersValue: 0, turnover: 0, visits: 0 },
  );
  return { rows, total };
}

export const turnoverPerVisit = (turnover: number, visits: number) => (visits > 0 ? turnover / visits : 0);
