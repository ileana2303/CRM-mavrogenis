"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth/current-user";
import type { ActivityType, DoctorRank } from "@/server/domain/types";
import { createDoctor, customerTimeline, saveConsent, saveEquipment, updateDoctor, type DoctorInput } from "@/server/services/customer-service";
import { recordVisit } from "@/server/services/visit-service";
import { arrive, depart } from "@/server/services/checkin-service";
import { addTask, closeWithNextAction, completeTask, reopenTask, taskTimeline } from "@/server/services/task-service";
import { NEXT_ACTION_KINDS, type NextActionKind, type TimelineEntry } from "@/server/domain/types";
import { setOfferClosed } from "@/server/services/offer-service";
import type { ActionResult } from "@/components/action-form";
import { el } from "@/lib/i18n/el";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Runs a SoftOne write; a refusal comes back as `{ error }` for ActionForm (the form keeps what was typed). */
async function attempt(what: string, fn: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await fn();
  } catch (e) {
    console.error(`[customers] ${what} failed`, e);
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

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
    hospitals: fd
      .getAll("hospitalId")
      .map(String)
      .filter(Boolean)
      .map((id) => {
        const name = str(fd, `hospitalName_${id}`);
        return { id, name };
      }),
    afm: str(fd, "afm"),
    rank: (["RESIDENT", "CURATOR", "DIRECTOR", "PROFESSOR"].includes(rank) ? rank : undefined) as DoctorRank | undefined,
  };
}

/** Save is allowed even when required fields are empty (slide 6 note). */
export async function saveDoctorAction(fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const id = str(fd, "id");
  const goConsent = str(fd, "intent") === "consent";
  const input = doctorInput(fd);
  let doctor: { id: string } | undefined;
  const failed = await attempt("save doctor", async () => {
    doctor = id ? await updateDoctor(id, input) : await createDoctor(input, user);
  });
  if (failed || !doctor) return failed ?? { error: "Δεν επιστράφηκε πελάτης από το SoftOne." };
  revalidatePath("/customers");
  redirect(goConsent ? `/customers/${doctor.id}/consent` : `/customers/${doctor.id}`);
}

export async function saveConsentAction(fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const doctorId = str(fd, "doctorId");
  const signature = str(fd, "signature");
  if (!signature.startsWith("data:image/png")) return { error: el.consent.noSignature };
  const failed = await attempt("save consent", () => saveConsent(
    doctorId,
    str(fd, "signerName"),
    signature,
    { email: fd.get("ch_email") === "on", sms: fd.get("ch_sms") === "on", phone: fd.get("ch_phone") === "on", viber: fd.get("ch_viber") === "on" },
    user,
  ));
  if (failed) return failed;
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
    price: z.union([z.number().nonnegative(), z.null()]).optional(),
    categoryId: z.string().optional(),
    markId: z.string().optional(),
    modelId: z.string().optional(),
    lineNum: z.number().optional(),
  }),
);

export async function saveEquipmentAction(fd: FormData): Promise<ActionResult> {
  await requireUser();
  const doctorId = str(fd, "doctorId");
  const parsed = equipmentSchema.safeParse(JSON.parse(str(fd, "rows") || "[]"));
  if (!parsed.success) return { error: "Μη έγκυρες γραμμές εξοπλισμού." };
  const failed = await attempt("save equipment", () =>
    saveEquipment(
      doctorId,
      parsed.data.filter((r) => r.manufacturer || r.model || r.category),
    ),
  );
  if (failed) return failed;
  revalidatePath(`/customers/${doctorId}/equipment`);
  redirect(`/customers/${doctorId}?saved=equipment`);
}


/** «+ Νέο Project» on the visit form. */
export async function saveVisitThenProjectAction(fd: FormData) {
  fd.set("intent", "newProject");
  return saveVisitAction(fd);
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

export async function addTaskAction(fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const doctorId = str(fd, "doctorId");
  const title = str(fd, "title");
  const dueDate = str(fd, "dueDate");
  if (!title || !dueDate) return { error: "Συμπληρώστε τίτλο και ημερομηνία." };
  const failed = await attempt("add task", () => addTask(doctorId, title, dueDate, user, str(fd, "projectId") || undefined));
  if (failed) return failed;
  revalidatePath(`/customers/${doctorId}/pending`);
  redirect(`/customers/${doctorId}/pending`);
}

export async function toggleTaskAction(fd: FormData): Promise<ActionResult> {
  await requireUser();
  const id = str(fd, "id");
  const doctorId = str(fd, "doctorId");
  const failed = await attempt("toggle task", () => (str(fd, "op") === "reopen" ? reopenTask(id) : completeTask(id)));
  if (failed) return failed;
  revalidatePath(`/customers/${doctorId}/pending`);
  redirect(`/customers/${doctorId}/pending?filter=${str(fd, "filter") || "open"}`);
}

/** «→ Επόμενη ενέργεια» on a pending row: new SOCALL/SOEMAIL/SOMEETING, then the Εκκρεμότητα is closed. */
export async function nextActionAction(fd: FormData): Promise<ActionResult> {
  await requireUser();
  const taskId = str(fd, "taskId");
  const doctorId = str(fd, "doctorId");
  const kind = str(fd, "kind") as NextActionKind;
  const date = str(fd, "date");
  const time = str(fd, "time");
  if (!NEXT_ACTION_KINDS.includes(kind)) return { error: el.pending.nextKindMissing };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return { error: el.pending.nextWhenMissing };
  const failed = await attempt("next action", () => closeWithNextAction(taskId, { kind, doctorId, fromTaskId: taskId, projectId: str(fd, "projectId") || undefined, at: `${date} ${time}`, comments: str(fd, "comments") }));
  if (failed) return failed;
  revalidatePath(`/customers/${doctorId}/pending`);
  revalidatePath("/");
  redirect(`/customers/${doctorId}/pending?filter=${str(fd, "filter") || "open"}`);
}

/** «Ιστορικό» on a pending row: the chain from api.crm.actions/getTimeline, loaded when the modal opens. */
export async function taskTimelineAction(taskId: string): Promise<{ entries: TimelineEntry[] } | { error: string }> {
  await requireUser();
  try {
    return { entries: await taskTimeline(taskId) };
  } catch (e) {
    unstable_rethrow(e); // expired session → /login
    console.error("[customers] task timeline failed", e);
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** «Χρονολόγιο» on the customer hub: api.crm.customers/getTimeline, loaded when the modal opens. */
export async function customerTimelineAction(doctorId: string): Promise<{ entries: TimelineEntry[] } | { error: string }> {
  await requireUser();
  try {
    return { entries: await customerTimeline(doctorId) };
  } catch (e) {
    unstable_rethrow(e); // expired session → /login
    console.error("[customers] customer timeline failed", e);
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function setOfferClosedAction(fd: FormData): Promise<ActionResult> {
  await requireUser();
  const doctorId = str(fd, "doctorId");
  const closed = str(fd, "closed");
  if (["YES", "NO", "PARTIAL"].includes(closed)) {
    const failed = await attempt("set offer closed", () => setOfferClosed(str(fd, "offerId"), closed as "YES" | "NO" | "PARTIAL"));
    if (failed) return failed;
  }
  revalidatePath(`/customers/${doctorId}/offers`);
  redirect(`/customers/${doctorId}/offers`);
}
