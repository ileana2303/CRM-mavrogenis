"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth/current-user";
import type { ActivityType, DoctorRank, EquipmentCategory } from "@/server/domain/types";
import { createDoctor, saveConsent, saveEquipment, updateDoctor, type DoctorInput } from "@/server/services/customer-service";
import { recordVisit } from "@/server/services/visit-service";
import { arrive, depart } from "@/server/services/checkin-service";
import { addTask, completeTask, reopenTask } from "@/server/services/task-service";
import { setOfferClosed } from "@/server/services/offer-service";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function doctorInput(fd: FormData): DoctorInput {
  const act = str(fd, "activityType");
  const rank = str(fd, "rank");
  return {
    firstName: str(fd, "firstName"),
    lastName: str(fd, "lastName"),
    mobile: str(fd, "mobile"),
    email: str(fd, "email"),
    activityType: (["PRIVATE", "PUBLIC"].includes(act) ? act : undefined) as ActivityType | undefined,
    clinicAddress: str(fd, "clinicAddress"),
    city: str(fd, "city"),
    postalCode: str(fd, "postalCode"),
    hospital: str(fd, "hospital"),
    afm: str(fd, "afm"),
    rank: (["RESIDENT", "CURATOR", "DIRECTOR", "PROFESSOR"].includes(rank) ? rank : undefined) as DoctorRank | undefined,
  };
}

/** Save is allowed even when required fields are empty (slide 6 note). */
export async function saveDoctorAction(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  const goConsent = str(fd, "intent") === "consent";
  const input = doctorInput(fd);
  const doctor = id ? await updateDoctor(id, input) : await createDoctor(input, user);
  revalidatePath("/customers");
  redirect(goConsent ? `/customers/${doctor.id}/consent` : `/customers/${doctor.id}`);
}

export async function saveConsentAction(fd: FormData) {
  const user = await requireUser();
  const doctorId = str(fd, "doctorId");
  const signature = str(fd, "signature");
  if (!signature.startsWith("data:image/png")) redirect(`/customers/${doctorId}/consent?error=signature`);
  await saveConsent(
    doctorId,
    str(fd, "signerName"),
    signature,
    { email: fd.get("ch_email") === "on", sms: fd.get("ch_sms") === "on", phone: fd.get("ch_phone") === "on", viber: fd.get("ch_viber") === "on" },
    user,
  );
  revalidatePath(`/customers/${doctorId}`);
  redirect(`/customers/${doctorId}?saved=consent`);
}

const equipmentSchema = z.array(
  z.object({
    category: z.string(),
    manufacturer: z.string(),
    model: z.string(),
    purchaseYear: z.union([z.number(), z.null()]),
    serviceContract: z.boolean(),
    serialNumber: z.string().optional(),
  }),
);

export async function saveEquipmentAction(fd: FormData) {
  await requireUser();
  const doctorId = str(fd, "doctorId");
  const parsed = equipmentSchema.safeParse(JSON.parse(str(fd, "rows") || "[]"));
  if (!parsed.success) redirect(`/customers/${doctorId}/equipment?error=1`);
  await saveEquipment(
    doctorId,
    parsed.data
      .filter((r) => r.manufacturer || r.model || r.category)
      .map((r) => ({ ...r, category: r.category as EquipmentCategory })),
  );
  revalidatePath(`/customers/${doctorId}/equipment`);
  redirect(`/customers/${doctorId}?saved=equipment`);
}

export async function saveVisitAction(fd: FormData) {
  const user = await requireUser();
  const doctorId = str(fd, "doctorId");
  await recordVisit(
    doctorId,
    {
      contactMethod: (str(fd, "contactMethod") || "VISIT") as "VISIT" | "PHONE" | "EMAIL",
      topic: (str(fd, "topic") || "GENERAL") as "GENERAL" | "EQUIPMENT" | "PROJECT" | "OFFER",
      outcome: (str(fd, "outcome") || "NONE") as "NONE" | "CONTACT" | "SEND_MATERIAL" | "DEMO" | "OFFER",
      nextActionDate: str(fd, "nextActionDate") || undefined,
      comment: str(fd, "comment"),
      projectId: str(fd, "projectId") || undefined,
    },
    user,
  );
  revalidatePath(`/customers/${doctorId}`);
  if (str(fd, "intent") === "newProject") redirect(`/customers/${doctorId}/projects/new`);
  redirect(`/customers/${doctorId}?saved=visit`);
}

export async function checkInAction(doctorId: string, kind: "arrive" | "depart", geo: { lat?: number; lng?: number }) {
  const user = await requireUser();
  const rec = kind === "arrive" ? await arrive(doctorId, user, geo) : await depart(doctorId, user, geo);
  revalidatePath(`/customers/${doctorId}`);
  return rec ? { arrivedAt: rec.arrivedAt, departedAt: rec.departedAt ?? null } : null;
}

export async function addTaskAction(fd: FormData) {
  const user = await requireUser();
  const doctorId = str(fd, "doctorId");
  const title = str(fd, "title");
  const dueDate = str(fd, "dueDate");
  if (title && dueDate) await addTask(doctorId, title, dueDate, user, str(fd, "projectId") || undefined);
  revalidatePath(`/customers/${doctorId}/pending`);
  redirect(`/customers/${doctorId}/pending`);
}

export async function toggleTaskAction(fd: FormData) {
  await requireUser();
  const id = str(fd, "id");
  const doctorId = str(fd, "doctorId");
  if (str(fd, "op") === "reopen") await reopenTask(id);
  else await completeTask(id);
  revalidatePath(`/customers/${doctorId}/pending`);
  redirect(`/customers/${doctorId}/pending?filter=${str(fd, "filter") || "open"}`);
}

export async function setOfferClosedAction(fd: FormData) {
  await requireUser();
  const doctorId = str(fd, "doctorId");
  const closed = str(fd, "closed");
  if (["YES", "NO", "PARTIAL"].includes(closed)) await setOfferClosed(str(fd, "offerId"), closed as "YES" | "NO" | "PARTIAL");
  revalidatePath(`/customers/${doctorId}/offers`);
  redirect(`/customers/${doctorId}/offers`);
}
