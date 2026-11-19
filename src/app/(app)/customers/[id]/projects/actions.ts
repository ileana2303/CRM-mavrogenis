"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth/current-user";
import type { FollowUpContactMethod, FollowUpResult, NextAction, OfferCalc, ProductHit, ProjectType } from "@/server/domain/types";
import { addFollowUp, closeProject, createProject, createProjectForDoctor, calculateOfferForProject, createOfferForProject, getProject, projectTimeline, searchProducts, setProjectState, requestOffer, reviseOffer } from "@/server/services/project-service";
import { getOffer, markOfferSent } from "@/server/services/offer-service";
import type { ActionResult } from "@/components/action-form";
import type { TimelineResult } from "@/components/timeline-button";
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

/** PRJSTATE «Προσφορά εστάλη» (api.crm/bootstrap prjc.prjState) – set on the project when an offer is created */
const STATE_OFFER_SENT = "1030";

/** Product search for an offer line (api.crm.products/list {q}); at least 2 characters. */
export async function searchProductsAction(q: string): Promise<{ total: number; items: ProductHit[] } | { error: string }> {
  await requireUser();
  const term = String(q ?? "").trim();
  if (term.length < 2) return { total: 0, items: [] };
  try {
    return await searchProducts(term, 20);
  } catch (e) {
    console.error("[projects] product search failed", e);
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

const offerLinesSchema = z.array(
  z.object({
    mtrl: z.string().min(1),
    qty: z.number().positive(),
    price: z.number().nonnegative().nullable(),
    discountPct: z.number().min(0).max(100).nullable(),
    discountValue: z.number().nonnegative().nullable(),
    lineValue: z.number().nonnegative().nullable(),
  }),
);

/** Preview: SoftOne `calculate` on the draft (same payload as the save) → prices, VAT, totals. Nothing is saved. */
export async function calculateProjectOfferAction(input: {
  doctorId: string;
  projectId: string;
  lines: unknown;
}): Promise<OfferCalc | { error: string }> {
  const user = await requireUser();
  const parsed = offerLinesSchema.safeParse(input.lines);
  if (!parsed.success) return { error: "Ελέγξτε τις γραμμές: ποσότητα > 0, τιμή ≥ 0, έκπτωση 0–100%, αξία ≥ 0." };
  if (parsed.data.length === 0) return { lines: [], net: 0, vat: 0, total: 0 };
  try {
    return await calculateOfferForProject({ doctorId: input.doctorId, projectId: input.projectId, comments: "", lines: parsed.data }, user);
  } catch (e) {
    console.error("[projects] calculate offer failed", e);
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** «Νέα προσφορά» inside a project → setData SALDOC (offer series, PRJC, SALESMAN = session PRSN) + ITELINES. */
export async function createProjectOfferAction(fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const doctorId = str(fd, "doctorId");
  const projectId = str(fd, "projectId");
  const parsed = offerLinesSchema.safeParse(JSON.parse(str(fd, "lines") || "[]"));
  if (!parsed.success) return { error: "Ελέγξτε τις γραμμές: είδος, ποσότητα > 0, τιμή ≥ 0, έκπτωση 0–100%, αξία ≥ 0." };
  if (parsed.data.length === 0) return { error: "Προσθέστε τουλάχιστον ένα είδος." };
  try {
    await createOfferForProject({ doctorId, projectId, comments: str(fd, "comments"), lines: parsed.data }, user);
  } catch (e) {
    console.error("[projects] create offer failed", e);
    return { error: e instanceof Error ? e.message : String(e) };
  }
  // the offer exists now → the project moves to «Προσφορά εστάλη» (owner, 2026-11-16). If SoftOne refuses that, the
  // offer must NOT come back as a form error (a second «Αποθήκευση» would duplicate it): the project screen says so.
  let stageFailed = false;
  try {
    await setProjectState(projectId, STATE_OFFER_SENT);
  } catch (e) {
    console.error("[projects] stage after offer failed", e);
    stageFailed = true;
  }
  revalidatePath(`/customers/${doctorId}/projects/${projectId}`);
  revalidatePath(`/customers/${doctorId}/projects`);
  revalidatePath(`/customers/${doctorId}/offers`);
  redirect(`/customers/${doctorId}/projects/${projectId}?saved=offer${stageFailed ? "&stage=failed" : ""}`);
}


/** «Χρονολόγιο» on the project screen: api.crm.projects/getTimeline, loaded when the modal opens. */
export async function projectTimelineAction(projectId: string): Promise<TimelineResult> {
  await requireUser();
  try {
    return { entries: await projectTimeline(projectId) };
  } catch (e) {
    unstable_rethrow(e); // expired session → /login
    console.error("[projects] timeline failed", e);
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
