"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth/current-user";
import type { FollowUpContactMethod, FollowUpResult, NextAction, ProjectType } from "@/server/domain/types";
import { addFollowUp, closeProject, createProject, createProjectForDoctor, getProject, setProjectState, requestOffer, reviseOffer } from "@/server/services/project-service";
import { getOffer, markOfferSent } from "@/server/services/offer-service";
import type { ActionResult } from "@/components/action-form";
import { el } from "@/lib/i18n/el";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (v: unknown) => {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const linesSchema = z.array(
  z.object({
    productCode: z.string(),
    qty: z.union([z.number(), z.string()]),
    floorPrice: z.union([z.number(), z.string()]),
    discountPct: z.union([z.number(), z.string()]),
    specialDiscountPct: z.union([z.number(), z.string()]),
  }),
);

export async function createProjectAction(fd: FormData) {
  const user = await requireUser();
  const doctorId = str(fd, "doctorId");
  const parsed = linesSchema.safeParse(JSON.parse(str(fd, "lines") || "[]"));
  const lines = parsed.success
    ? parsed.data.map((l) => ({
        productCode: l.productCode,
        qty: num(l.qty) || 1,
        floorPrice: num(l.floorPrice),
        discountPct: num(l.discountPct),
        specialDiscountPct: num(l.specialDiscountPct),
      }))
    : [];
  const type = str(fd, "type");
  const project = await createProject(
    doctorId,
    {
      type: (["NEW_CLINIC", "REPLACEMENT", "PUBLIC_TENDER"].includes(type) ? type : "REPLACEMENT") as ProjectType,
      title: str(fd, "title"),
      notes: str(fd, "notes"),
      lines,
      requestOffer: str(fd, "intent") === "requestOffer",
    },
    user,
  );
  revalidatePath(`/customers/${doctorId}`);
  redirect(`/customers/${doctorId}/projects/${project.id}${str(fd, "intent") === "requestOffer" ? "?sent=1" : ""}`);
}

export async function requestOfferAction(fd: FormData) {
  const user = await requireUser();
  const project = await getProject(str(fd, "projectId"));
  if (!project) redirect("/customers");
  await requestOffer(project, user);
  revalidatePath(`/customers/${project.doctorId}`);
  redirect(`/customers/${project.doctorId}/projects/${project.id}?sent=1`);
}

export async function followUpAction(fd: FormData) {
  const user = await requireUser();
  const project = await getProject(str(fd, "projectId"));
  if (!project) redirect("/customers");
  await addFollowUp(
    project,
    {
      contactMethod: (str(fd, "contactMethod") || "PHONE") as FollowUpContactMethod,
      result: (str(fd, "result") || "WAITING") as FollowUpResult,
      comment: str(fd, "comment"),
      nextAction: (str(fd, "nextAction") || "NONE") as NextAction,
      nextActionDate: str(fd, "nextActionDate") || undefined,
    },
    user,
  );
  revalidatePath(`/customers/${project.doctorId}`);
  redirect(`/customers/${project.doctorId}/projects/${project.id}?saved=followup`);
}

const reviseSchema = z.array(z.object({ lineNo: z.number(), discountPct: z.union([z.number(), z.string()]), specialDiscountPct: z.union([z.number(), z.string()]) }));

export async function reviseAction(fd: FormData) {
  const user = await requireUser();
  const project = await getProject(str(fd, "projectId"));
  if (!project) redirect("/customers");
  const reason = str(fd, "reason");
  if (!reason) redirect(`/customers/${project.doctorId}/projects/${project.id}/revise?error=reason`);
  const parsed = reviseSchema.safeParse(JSON.parse(str(fd, "lines") || "[]"));
  await reviseOffer(
    project,
    {
      lines: parsed.success ? parsed.data.map((l) => ({ lineNo: l.lineNo, discountPct: num(l.discountPct), specialDiscountPct: num(l.specialDiscountPct) })) : [],
      notes: str(fd, "notes"),
      reason,
    },
    user,
  );
  revalidatePath(`/customers/${project.doctorId}`);
  redirect(`/customers/${project.doctorId}/projects/${project.id}?sent=1`);
}

export async function closeProjectAction(fd: FormData) {
  const user = await requireUser();
  const project = await getProject(str(fd, "projectId"));
  if (!project) redirect("/customers");
  const lines = project.lines.map((l) => ({
    lineNo: l.lineNo,
    won: str(fd, `won_${l.lineNo}`) === "YES",
    competitor: str(fd, `competitor_${l.lineNo}`),
    competitorModel: str(fd, `competitorModel_${l.lineNo}`),
    competitorPrice: str(fd, `competitorPrice_${l.lineNo}`) ? num(str(fd, `competitorPrice_${l.lineNo}`)) : null,
    closeComments: str(fd, `comments_${l.lineNo}`),
  }));
  await closeProject(project, lines, user);
  revalidatePath(`/customers/${project.doctorId}`);
  redirect(`/customers/${project.doctorId}/projects/${project.id}?saved=closed`);
}

export async function markOfferSentAction(fd: FormData) {
  const user = await requireUser();
  const offer = await getOffer(str(fd, "offerId"));
  if (!offer) redirect("/customers");
  await markOfferSent(offer, user);
  revalidatePath(`/customers/${offer.doctorId}`);
  redirect(`/customers/${offer.doctorId}/projects/${offer.projectId}?saved=sent`);
}

/** «Αίτημα Προσφοράς» button: create the project and open an offer request. */
export async function createProjectRequestOfferAction(fd: FormData) {
  fd.set("intent", "requestOffer");
  return createProjectAction(fd);
}

/**
 * «Νέο Project» → setData PRJC (form _CRM_); back to the doctor's project list. A refusal (missing field, SoftOne error)
 * comes back as `{ error }` so the form keeps what was typed (ActionForm shows it as an alert).
 */
export async function createS1ProjectAction(fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const doctorId = str(fd, "doctorId");
  const title = str(fd, "title");
  const categoryId = str(fd, "categoryId");
  const stateId = str(fd, "stateId");
  if (!title || !categoryId || !stateId) return { error: el.projects.requiredError };
  try {
    await createProjectForDoctor({ doctorId, title, categoryId, stateId, notes: str(fd, "notes") }, user);
  } catch (e) {
    console.error("[projects] create failed", e);
    return { error: e instanceof Error ? e.message : String(e) };
  }
  revalidatePath(`/customers/${doctorId}`);
  revalidatePath(`/customers/${doctorId}/projects`);
  redirect(`/customers/${doctorId}/projects?saved=1`);
}

/** «Αλλαγή σταδίου» on the project screen → setData PRJC {PRJSTATE}; a refusal stays on the screen as an alert. */
export async function setProjectStateAction(fd: FormData): Promise<ActionResult> {
  await requireUser();
  const doctorId = str(fd, "doctorId");
  const projectId = str(fd, "projectId");
  const stateId = str(fd, "stateId");
  if (!stateId) return { error: el.projects.requiredError };
  if (stateId !== str(fd, "currentStateId")) {
    try {
      await setProjectState(projectId, stateId);
    } catch (e) {
      console.error("[projects] set state failed", e);
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }
  revalidatePath(`/customers/${doctorId}/projects`);
  redirect(`/customers/${doctorId}/projects/${projectId}?saved=state`);
}
