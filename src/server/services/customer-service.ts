import { db } from "../data";
import type { DoctorSearch } from "../data/provider";
import type { Consent, ConsentChannels, Doctor, Equipment, MachineListKind } from "../domain/types";
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

/** The customer's actions and documents (api.crm.customers/getTimeline), newest first. */
export function customerTimeline(doctorId: string) {
  return db().doctors.timeline(doctorId);
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

/** «+ Νέα …» in the equipment pickers – the SoftOne entry (new, or the existing one of the same name). */
export function createMachineRef(kind: MachineListKind, name: string, markId?: string) {
  return db().stats.createMachineRef(kind, name, markId);
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
